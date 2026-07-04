/**
 * services/downloadManager.js — StudyShala
 * ===========================================
 * The ONLY place in the app that downloads files for offline use.
 *
 * Single-tier model: there is one directory (SAVED_DIR), one meaning
 * ("saved" == permanently on disk == available offline), and one rule:
 *
 *   Save a material  → every file in it is downloaded once, permanently.
 *   Already saved?    → downloadOrReuseFile() reuses the existing copy,
 *                        no re-download, no duplicate.
 *   Not saved?         → the file needs internet to view.
 *
 * There is no separate cache directory and no expiry/eviction — that tier
 * has been removed entirely. Starring a file does NOT call anything in this
 * file; a starred file only becomes available offline if the material it
 * belongs to has been saved.
 */
import * as FileSystem from 'expo-file-system';
import { fileRepository } from '../database/fileRepository';
import { materialRepository } from '../database/materialRepository';
import { downloadOrReuseFile, ensureDir } from './fileDownloader';

const SAVED_DIR = FileSystem.documentDirectory + 'StudyShala/Saved/';

export const downloadManager = {

  async ensureDirectories() {
    await ensureDir(SAVED_DIR);
  },

  /**
   * verifyMaterialOffline(materialId)
   * ────────────────────────────────────
   * The ONLY trustworthy answer to "will this material actually open
   * offline right now." Unlike fileRepository.isMaterialFullyDownloaded()
   * (which only checks the database), this verifies every file's bytes
   * are physically present on disk.
   *
   * Why this is necessary: a database record and the file it describes
   * can go out of sync independently of anything this app does wrong.
   * The clearest example: Android's Auto Backup can silently restore an
   * old copy of the app's database after a reinstall without restoring
   * the (much larger, usually backup-excluded) downloaded files that
   * went with it — leaving "ghost" records that claim a file is saved
   * when it no longer exists anywhere.
   *
   * Any ghost record found here is self-healed immediately (cleared via
   * fileRepository.setDownloaded(fileId, null)), so nothing else in the
   * app — this badge, fileActions' "already saved" fast path, anything
   * added later — keeps trusting a file that isn't actually there.
   */
  async verifyMaterialOffline(materialId) {
    const files = await fileRepository.getByMaterial(materialId);
    if (!files.length) return false;

    let allPresent = true;
    for (const f of files) {
      if (!f.localPath) { allPresent = false; continue; }
      const info = await FileSystem.getInfoAsync(f.localPath).catch(() => ({}));
      console.log("[SAVE VERIFY]");
console.log(localPath);
console.log(info);
      if (!info.exists) {
        allPresent = false;
        await fileRepository.setDownloaded(f.fileId, null).catch(() => {});
      }
    }
    return allPresent;
  },

  /**
   * saveMaterial(materialId, files, downloadUrlFn, onProgress)
   * ────────────────────────────────────────────────────────────
   * The Save button's action. Downloads every file belonging to `material`
   * into permanent storage, then marks the material savedOffline: true.
   *
   * If the material was already saved, files that are already on disk are
   * skipped automatically by downloadOrReuseFile() — calling this again is
   * always safe and never re-downloads existing files.
   *
   * @param {string}   materialId
   * @param {Array}    files          - files belonging to this material
   * @param {Function} downloadUrlFn  - (driveFileId) => Promise<string> fresh signed URL
   * @param {Function} [onProgress]   - (fileId, percent) => void
   */
  async saveMaterial(materialId, files, downloadUrlFn, onProgress) {
    await this.ensureDirectories();
    const materialDir = SAVED_DIR + materialId + '/';
    await ensureDir(materialDir);

    for (const file of files) {
      const fileId = file._id || file.fileId;
      const url = await downloadUrlFn(file.driveFileId || fileId);
      await downloadOrReuseFile(
        { ...file, fileId, materialId, downloadUrl: url },
        materialDir,
        onProgress,
        { mirrorToExternal: true },
      );
    }

    await materialRepository.setSavedOffline(materialId, true);
    const existing = await materialRepository.getById(materialId);
    if (existing) {
      await materialRepository.upsert({ ...existing, folderPath: materialDir });
    }
  },

  /**
   * saveFiles(materialId, files, downloadUrlFn, onProgress)
   * ──────────────────────────────────────────────────────
   * Downloads specific files permanently — same directory, same dedupe
   * guarantee, same fileRepository record as saveMaterial() — but does NOT
   * mark the material as savedOffline. Use this for "download this one
   * file" / "download selected files" actions where the student hasn't
   * saved the whole material. Those files still open offline afterward
   * (fileRepository.localPath is the only thing that matters for that),
   * they just won't show up as a complete entry on the Saved Materials
   * screen, because the material as a whole isn't guaranteed complete.
   */
  async saveFiles(materialId, files, downloadUrlFn, onProgress) {
    await this.ensureDirectories();
    const materialDir = SAVED_DIR + materialId + '/';
    await ensureDir(materialDir);

    const results = [];
    for (const file of files) {
      const fileId = file._id || file.fileId;
      const url = await downloadUrlFn(file.driveFileId || fileId);
      const uri = await downloadOrReuseFile(
        { ...file, fileId, materialId, downloadUrl: url },
        materialDir,
        onProgress,
        { mirrorToExternal: true },
      );
      results.push({ fileId, uri });
    }
    return results;
  },

  /**
   * resyncSavedMaterials(getMaterialFilesFn)
   * ───────────────────────────────────────
   * Called on app startup when internet is available. Walks every saved
   * material, checks for version changes, and downloads any new/changed
   * files. This is the only background/automatic download path in the app —
   * it only ever touches materials the student has explicitly saved.
   *
   * @param {Function} getMaterialFilesFn - (materialId) => Promise<AxiosResponse<{ material, files, subFolders }>>
   */
  async resyncSavedMaterials(getMaterialFilesFn) {
    const savedMaterials = await materialRepository.getAllSaved();
    if (!savedMaterials.length) return;

    for (const mat of savedMaterials) {
      try {
        const { data } = await getMaterialFilesFn(mat.materialId);

        const serverVersion = data?.material?.version;
        const localVersion = mat.version;
        const versionChanged = serverVersion && serverVersion !== localVersion;

        const serverFiles = [
          ...(data.files || []),
          ...(data.subFolders || []).flatMap(sf => sf.files || []),
        ];

        const materialDir = SAVED_DIR + mat.materialId + '/';

        for (const file of serverFiles) {
          try {
            const id = file._id || file.fileId;
            if (!id || !file.downloadUrl) continue;

            const existing = await fileRepository.getById(id);
            let needsDownload = versionChanged;
            if (!needsDownload) {
              if (!existing?.localPath) {
                needsDownload = true;
              } else {
                const diskInfo = await FileSystem.getInfoAsync(existing.localPath).catch(() => ({}));
                if (!diskInfo.exists) needsDownload = true;
              }
            }

            if (needsDownload) {
              await downloadOrReuseFile(
                { ...file, fileId: id, materialId: mat.materialId },
                materialDir,
                null,
                { mirrorToExternal: true },
              );
            } else if (existing && versionChanged) {
              await fileRepository.upsert({
                ...existing,
                previewUrl: file.previewUrl || existing.previewUrl,
                downloadUrl: file.downloadUrl || existing.downloadUrl,
              });
            }
          } catch {
            // One file failed — continue with the rest
          }
        }

        if (versionChanged) {
          await materialRepository.upsert({ ...mat, version: serverVersion });
        }
      } catch {
        // One material failed (e.g. no internet mid-loop) — continue with next
      }
    }
  },

  /**
   * deleteSavedMaterial(materialId)
   * ────────────────────────────────
   * Removes a material from offline storage entirely: deletes its files
   * from disk, clears their fileRepository records, and unmarks the
   * material as saved. This is the only way offline content is ever
   * removed — there is no automatic eviction.
   */
  async deleteSavedMaterial(materialId) {
    // Sweep any cacheDirectory copies created by FileViewerScreen's
    // FileProvider-workaround fallback (see resolveLocalUriForWebView) —
    // those live outside SAVED_DIR and would otherwise survive this call,
    // becoming exactly the kind of orphaned offline copy that made a
    // "removed" material behave as if it were still saved.
    try {
      const materialFiles = await fileRepository.getByMaterial(materialId);
      for (const f of materialFiles) {
        if (!f?.localPath) continue;
        const fileName = f.localPath.split('/').pop();
        const cachePath = FileSystem.cacheDirectory + fileName;
        const info = await FileSystem.getInfoAsync(cachePath).catch(() => ({}));
        if (info.exists) await FileSystem.deleteAsync(cachePath, { idempotent: true }).catch(() => {});
      }
    } catch {
      // Best-effort — never let a cache-sweep failure block the real deletion below.
    }

    const materialDir = SAVED_DIR + materialId + '/';
    const info = await FileSystem.getInfoAsync(materialDir);
    if (info.exists) await FileSystem.deleteAsync(materialDir, { idempotent: true });
    await fileRepository.deleteByMaterial(materialId);
    await materialRepository.setSavedOffline(materialId, false);
  },

  /**
   * reconcile(serverMaterialIds, syncToServerFn)
   * ─────────────────────────────────────────────
   * Best-effort self-heal for state that drifted before the save/unsave
   * ordering fixes existed (or from any future edge case where the
   * best-effort server call silently failed). Only handles the
   * "device thinks it's saved, server doesn't know yet" direction — a
   * material locally marked savedOffline: true that's missing from the
   * server's saved list gets pushed to the server now that we have
   * connectivity. `syncToServerFn` is a caller-supplied function
   * (e.g. the studentApi saveMaterial call) so this module doesn't need
   * to depend on the API layer directly.
   *
   * Deliberately does NOT do the reverse (auto-delete local files for
   * materials the server doesn't list as saved) — that's a destructive
   * action and safer left to the explicit Remove flow.
   */
  async reconcile(serverMaterialIds, syncToServerFn) {
    if (typeof syncToServerFn !== 'function') return;
    try {
      const localSaved = await materialRepository.getAllSaved();
      const serverSet = new Set((serverMaterialIds || []).map(String));
      for (const m of localSaved) {
        if (!serverSet.has(String(m.materialId))) {
          await syncToServerFn(m.materialId).catch(() => {});
        }
      }
    } catch {
      // Best-effort — never let reconciliation failures affect the UI.
    }
  },

  async getStorageStats() {
    const savedInfo = await FileSystem.getInfoAsync(SAVED_DIR, { size: true });
    const deviceInfo = await FileSystem.getFreeDiskStorageAsync();

    return {
      savedSize: savedInfo.size || 0,
      freeStorage: deviceInfo,
    };
  },

  /**
   * getForecast(files)
   * ───────────────────
   * Used to show the "This will download 240MB — continue?" confirmation
   * before saveMaterial() runs, especially on cellular data.
   */
  async getForecast(files) {
    const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0);
    const free = await FileSystem.getFreeDiskStorageAsync();
    return {
      requiredSize: totalSize,
      freeStorage: free,
      willFit: totalSize < free,
      percentUsed: free ? Math.round((totalSize / free) * 100) : 0,
    };
  },
};

export default downloadManager;