/**
 * services/downloadManager.js — StudyShala
 * ===========================================
 * The single owner of the entire offline lifecycle: download, verify,
 * resume, sync, delete, and every database write that goes with them.
 * Screens call into this module — they never touch materialRepository,
 * fileRepository, or expo-file-system for offline-save purposes
 * themselves (Phase 3, decision 7).
 *
 * Single-tier model: there is one directory (SAVED_DIR), one meaning
 * ("saved" == permanently on disk == available offline), and one rule:
 *
 *   Save a material  → every file in it is downloaded once, permanently.
 *   Already saved?    → downloadOrReuseFile() reuses the existing copy,
 *                        no re-download, no duplicate.
 *   Not saved?         → the file needs internet to view.
 *
 * There is no separate cache directory and no expiry/eviction. Starring a
 * file does NOT call anything in this file; a starred file only becomes
 * available offline if the material it belongs to has been saved.
 *
 * State machine (Phase 3)
 * ------------------------
 * Every material carries a persisted MATERIAL_STATE (see
 * database/materialRepository.js): NOT_SAVED, DOWNLOADING, SAVED, SYNCING,
 * FAILED. This module is the ONLY thing that ever changes it. That's what
 * makes an interrupted download resumable — the DOWNLOADING record
 * survives an app kill, and runAutoSync() picks it back up automatically.
 *
 * Auto-sync (decisions 2, 3, 4, 6)
 * ----------------------------------
 * initAutoSync() is called once from AppNavigator on app mount. It runs an
 * immediate runAutoSync() pass and polls this backend directly on an
 * interval so every offline→online transition triggers another pass — not
 * just app startup. (expo-network has no connectivity-change event to
 * subscribe to, and its own network-state reporting is unreliable on
 * several platform/SDK combinations, so polling this backend directly is
 * simpler and actually correct.) runAutoSync() walks every tracked material and either resumes
 * an incomplete download or checks a saved one for server-side changes.
 * No per-file hashing yet: a material version change means the whole
 * material folder is deleted and redownloaded fresh (decision 2). Files
 * removed on the server are pruned locally during a no-version-change
 * sync pass (decision 3).
 *
 * syncService.js has been removed — it was dead/duplicated logic (see
 * migration notes). The one good idea it had, pinging this app's own
 * backend instead of trusting the OS-reported network state, lives on
 * here as isConnected().
 */
import * as FileSystem from 'expo-file-system';
import { fileRepository } from '../database/fileRepository';
import { materialRepository, MATERIAL_STATE } from '../database/materialRepository';
import { downloadOrReuseFile, ensureDir, MIN_VALID_FILE_SIZE } from './fileDownloader';
import { storageLocationService } from './storageLocationService';
import { API_BASE_URL } from '../config/config';

const SAVED_DIR = FileSystem.documentDirectory + 'StudyShala/Saved/';

export const downloadManager = {

  async ensureDirectories() {
    await ensureDir(SAVED_DIR);
  },

  /**
   * isConnected()
   * ──────────────
   * Pings this app's own backend keep-alive endpoint instead of trusting
   * the OS-reported network state. Trusting expo-network's
   * isInternetReachable alone is known to be unreliable on some Android
   * disconnect/reconnect transitions — this gives a real answer either way.
   */
  async isConnected() {
    try {
      const response = await fetch(`${API_BASE_URL}/ping`, { method: 'GET' });
      return response.ok;
    } catch {
      return false;
    }
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
   * fileRepository.setDownloaded(fileId, null)), and if anything was
   * missing the material's persisted state is downgraded to FAILED so
   * the next runAutoSync() pass picks it back up automatically — nothing
   * else in the app keeps trusting a file that isn't actually there.
   */
  async verifyMaterialOffline(materialId) {
    const files = await fileRepository.getByMaterial(materialId);
    if (!files.length) return false;

    let allPresent = true;
    for (const f of files) {
      if (!f.localPath) { allPresent = false; continue; }
      const info = await FileSystem.getInfoAsync(f.localPath).catch(() => ({}));
      // A suspiciously-small file (e.g. a saved auth-error JSON body) is just
      // as "not really there" as a missing one — it's a corrupt/incomplete
      // download, not a usable offline copy. Checking only `exists` let
      // corrupt files be certified as "verified offline" forever.
      if (!info.exists || info.size < MIN_VALID_FILE_SIZE) {
        allPresent = false;
        if (info.exists && info.size < MIN_VALID_FILE_SIZE) {
          await FileSystem.deleteAsync(f.localPath, { idempotent: true }).catch(() => {});
        }
        await fileRepository.setDownloaded(f.fileId, null).catch(() => {});
      }
    }

    if (!allPresent) {
      await materialRepository.setState(materialId, MATERIAL_STATE.FAILED).catch(() => {});
    }

    return allPresent;
  },

  /**
   * saveMaterial(materialId, files, downloadUrlFn, meta, onProgress)
   * ────────────────────────────────────────────────────────────────────
   * The Save button's action. Downloads every file belonging to `material`
   * into permanent storage, then marks the material SAVED.
   *
   * If the material was already saved, files that are already on disk are
   * skipped automatically by downloadOrReuseFile() — calling this again is
   * always safe and never re-downloads existing files.
   *
   * The material record (with `meta`) is written and flipped to
   * DOWNLOADING *before* any network work starts — that's what makes an
   * interrupted save resumable. If the app is killed mid-download, this
   * record survives and runAutoSync() resumes it automatically on next
   * launch or next connectivity regain. On failure the record is left in
   * FAILED (not silently reverted to NOT_SAVED) for the same reason.
   *
   * @param {string}   materialId
   * @param {Array}    files          - files belonging to this material
   * @param {Function} downloadUrlFn  - (driveFileId) => Promise<string> fresh signed URL
   * @param {object}   [meta]         - material metadata to persist alongside the
   *                                     save (subject, facultyName, department,
   *                                     semester, accessCode, version). Callers
   *                                     should pass this instead of upserting
   *                                     materialRepository themselves afterward.
   * @param {Function} [onProgress]   - (fileId, percent) => void
   */
  async saveMaterial(materialId, files, downloadUrlFn, meta = {}, onProgress) {
    await this.ensureDirectories();
    const materialDir = SAVED_DIR + materialId + '/';
    await ensureDir(materialDir);

    console.log(`[downloadManager] saveMaterial START ${materialId} (${files.length} files)`);
    await materialRepository.upsert({ materialId, ...meta });
    await materialRepository.setState(materialId, MATERIAL_STATE.DOWNLOADING);
    console.log(`[downloadManager] state -> DOWNLOADING ${materialId}`);

    try {
      for (const file of files) {
        const fileId = file._id || file.fileId;
        const url = await downloadUrlFn(file.driveFileId || fileId);
        await downloadOrReuseFile(
          { ...file, fileId, materialId, downloadUrl: url },
          materialDir,
          onProgress,
          { mirrorToExternal: true },
        );
        console.log(`[downloadManager]   done: ${file.name || fileId}`);
      }

      await materialRepository.setState(materialId, MATERIAL_STATE.SAVED);
      await materialRepository.updateLastSynced(materialId);
      console.log(`[downloadManager] state -> SAVED ${materialId}`);
      const existing = await materialRepository.getById(materialId);
      if (existing) {
        await materialRepository.upsert({ ...existing, folderPath: materialDir });
      }
    } catch (error) {
      console.log(`[downloadManager] state -> FAILED ${materialId}:`, error.message);
      // Download didn't fully complete — leave the record in FAILED rather
      // than silently reverting to NOT_SAVED. FAILED keeps it in
      // materialRepository.getAllTracked(), so the next runAutoSync() pass
      // retries automatically instead of it just disappearing until the
      // student notices and taps Save again.
      await materialRepository.setState(materialId, MATERIAL_STATE.FAILED).catch(() => {});
      throw error;
    }
  },

  /**
   * saveFiles(materialId, files, downloadUrlFn, onProgress)
   * ──────────────────────────────────────────────────────
   * Downloads specific files permanently — same directory, same dedupe
   * guarantee, same fileRepository record as saveMaterial() — but does NOT
   * touch the material's state. Use this for "download this one file" /
   * "download selected files" actions where the student hasn't saved the
   * whole material. Those files still open offline afterward
   * (fileRepository.localPath is the only thing that matters for that),
   * they just won't show up as a complete entry on the Saved Materials
   * screen, because the material as a whole isn't guaranteed complete.
   * Deliberately outside the state machine — not part of runAutoSync().
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
   * runAutoSync(getMaterialFilesFn)
   * ─────────────────────────────────
   * The single entry point for all *automatic* offline maintenance —
   * called on app startup and every time connectivity is regained (see
   * initAutoSync()). Walks every material this device is tracking
   * (DOWNLOADING, FAILED, stray SYNCING, or SAVED — see
   * materialRepository.getAllTracked()) and brings each one back in line
   * with the server:
   *
   *   DOWNLOADING / FAILED / SYNCING → resume/retry the full download —
   *       these all mean "this material's offline copy isn't confirmed
   *       complete," so re-downloading is safer than guessing which files
   *       are missing.
   *   SAVED → check the server version.
   *       version changed   → delete the material's local folder entirely
   *                            and redownload everything fresh (no
   *                            per-file hashing yet — decision 2).
   *       version unchanged → diff local files vs the server's file list:
   *                            delete local files the server no longer
   *                            has, download files the server has that we
   *                            don't (decision 3).
   *
   * One material failing (no internet mid-loop, server error, etc.) never
   * stops the loop — it's marked FAILED and the rest continue, same
   * guarantee the old resyncSavedMaterials() gave.
   *
   * @param {Function} getMaterialFilesFn - (materialId) => Promise<AxiosResponse<{ material, files, subFolders }>>
   */
  async runAutoSync(getMaterialFilesFn) {
    await this.ensureDirectories();
    const tracked = await materialRepository.getAllTracked();
    console.log(`[downloadManager] runAutoSync: ${tracked.length} tracked material(s)`, tracked.map(m => `${m.materialId}:${m.state}`));
    if (!tracked.length) return;

    for (const mat of tracked) {
      try {
        const { data } = await getMaterialFilesFn(mat.materialId);
        const serverFiles = [
          ...(data.files || []),
          ...(data.subFolders || []).flatMap(sf => sf.files || []),
        ];

        if (mat.state === MATERIAL_STATE.SAVED) {
          console.log(`[downloadManager] syncing SAVED material ${mat.materialId} (local v${mat.version}, server v${data?.material?.version})`);
          await this._syncSavedMaterial(mat, data, serverFiles);
        } else {
          console.log(`[downloadManager] resuming ${mat.state} material ${mat.materialId}`);
          await this._resumeDownload(mat, serverFiles);
        }
        console.log(`[downloadManager] runAutoSync: ${mat.materialId} -> SAVED`);
      } catch (err) {
        console.log(`[downloadManager] runAutoSync: ${mat.materialId} -> FAILED`, err.message);
        await materialRepository.setState(mat.materialId, MATERIAL_STATE.FAILED).catch(() => {});
      }
    }
  },

  /**
   * initAutoSync(getMaterialFilesFn)
   * ───────────────────────────────────
   * Called once, from AppNavigator, on app mount. Runs an immediate
   * runAutoSync() pass, then polls isConnected() on an interval so every
   * offline→online transition triggers another pass — not just app
   * startup (decision 4). Returns a cleanup function for the caller's
   * effect cleanup.
   *
   * expo-network has no connectivity-change event to subscribe to (only
   * one-shot getNetworkStateAsync/isAirplaneModeEnabledAsync calls) — and
   * its network-state reporting is itself known to be unreliable on
   * several platform/SDK combinations (see expo/expo#33070, #14527), so
   * it isn't something to gate on even if it did offer a listener.
   * Polling this app's own backend directly is simpler and actually
   * correct: no extra native module, no platform-specific quirks.
   */
  initAutoSync(getMaterialFilesFn) {
    console.log('[downloadManager] initAutoSync: starting immediate pass');
    this.runAutoSync(getMaterialFilesFn).catch(() => {});

    let lastKnownOnline = true;
    this.isConnected().then(online => {
      lastKnownOnline = online;
      console.log(`[downloadManager] initial connectivity: ${online ? 'online' : 'offline'}`);
    }).catch(() => {});

    const POLL_INTERVAL_MS = 15000;
    const interval = setInterval(async () => {
      const online = await this.isConnected();
      if (online !== lastKnownOnline) {
        console.log(`[downloadManager] connectivity changed: ${lastKnownOnline ? 'online' : 'offline'} -> ${online ? 'online' : 'offline'}`);
      }
      if (online && !lastKnownOnline) {
        console.log('[downloadManager] back online — running auto-sync pass');
        this.runAutoSync(getMaterialFilesFn).catch(() => {});
      }
      lastKnownOnline = online;
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  },

  /**
   * _resumeDownload(mat, serverFiles) — internal
   * ──────────────────────────────────────────────
   * Used by runAutoSync() for materials in DOWNLOADING, FAILED, or stray
   * SYNCING state.
   */
  async _resumeDownload(mat, serverFiles) {
    await materialRepository.setState(mat.materialId, MATERIAL_STATE.DOWNLOADING);
    const materialDir = SAVED_DIR + mat.materialId + '/';
    await ensureDir(materialDir);

    for (const file of serverFiles) {
      const id = file._id || file.fileId;
      if (!id || !file.downloadUrl) continue;
      await downloadOrReuseFile(
        { ...file, fileId: id, materialId: mat.materialId },
        materialDir,
        null,
        { mirrorToExternal: true },
      );
    }

    await materialRepository.setState(mat.materialId, MATERIAL_STATE.SAVED);
    await materialRepository.updateLastSynced(mat.materialId);
  },

  /**
   * _syncSavedMaterial(mat, data, serverFiles) — internal
   * ────────────────────────────────────────────────────────
   * Used by runAutoSync() for materials already in SAVED state.
   */
  async _syncSavedMaterial(mat, data, serverFiles) {
    await materialRepository.setState(mat.materialId, MATERIAL_STATE.SYNCING);

    const serverVersion = data?.material?.version;
    const versionChanged = !!serverVersion && serverVersion !== mat.version;
    const materialDir = SAVED_DIR + mat.materialId + '/';

    if (versionChanged) {
      // No per-file versioning from the backend yet (decision 2) — the
      // only way to guarantee stale bytes don't survive under an
      // unchanged fileId+name path is to clear the whole folder and
      // redownload everything.
      const info = await FileSystem.getInfoAsync(materialDir);
      if (info.exists) await FileSystem.deleteAsync(materialDir, { idempotent: true });
      await fileRepository.deleteByMaterial(mat.materialId);
      await ensureDir(materialDir);

      for (const file of serverFiles) {
        const id = file._id || file.fileId;
        if (!id || !file.downloadUrl) continue;
        await downloadOrReuseFile(
          { ...file, fileId: id, materialId: mat.materialId },
          materialDir,
          null,
          { mirrorToExternal: true },
        );
      }

      await materialRepository.updateVersion(mat.materialId, serverVersion);
    } else {
      // Nothing changed at the material level — self-heal by diffing
      // files: remove local files the faculty deleted server-side, fetch
      // anything missing that should be there.
      const localFiles = await fileRepository.getByMaterial(mat.materialId);
      const serverIds = new Set(serverFiles.map(f => String(f._id || f.fileId)));

      // Safety guard: an empty/malformed server response (a transient API
      // hiccup, a bad materialId, anything) must NEVER be read as "the
      // faculty deleted every file." That would silently wipe a student's
      // saved copy based on nothing but a bad network response — the
      // exact opposite of what "Saved is guaranteed to work offline" means.
      // Only prune when the server actually returned files AND we already
      // have local files to compare against; otherwise skip pruning this
      // pass and just try to fill in anything missing.
      const canSafelyPrune = serverFiles.length > 0 && localFiles.length > 0;

      let removedIds = [];
      if (canSafelyPrune) {
        removedIds = localFiles
          .map(f => f.fileId)
          .filter(id => !serverIds.has(String(id)));
      } else {
        console.log(`[downloadManager] sync ${mat.materialId}: server returned ${serverFiles.length} file(s), local has ${localFiles.length} — skipping prune this pass`);
      }

      if (removedIds.length) {
        console.log(`[downloadManager] sync ${mat.materialId}: pruning ${removedIds.length} file(s) no longer on server`, removedIds);
        for (const id of removedIds) {
          const rec = await fileRepository.getById(id);
          if (rec?.localPath) {
            await FileSystem.deleteAsync(rec.localPath, { idempotent: true }).catch(() => {});
          }
        }
        await fileRepository.deleteMany(removedIds);
      }

      for (const file of serverFiles) {
        const id = file._id || file.fileId;
        if (!id || !file.downloadUrl) continue;

        const existing = await fileRepository.getById(id);
        let needsDownload = !existing?.localPath;
        if (existing?.localPath) {
          const diskInfo = await FileSystem.getInfoAsync(existing.localPath).catch(() => ({}));
          // Same fix as verifyMaterialOffline: a suspiciously small/corrupt
          // file must be treated as needing a fresh download, not "already there."
          if (!diskInfo.exists || diskInfo.size < MIN_VALID_FILE_SIZE) {
            needsDownload = true;
            if (diskInfo.exists && diskInfo.size < MIN_VALID_FILE_SIZE) {
              await FileSystem.deleteAsync(existing.localPath, { idempotent: true }).catch(() => {});
            }
          }
        }

        if (needsDownload) {
          console.log(`[downloadManager] sync ${mat.materialId}: downloading missing file ${file.name || id}`);
          await downloadOrReuseFile(
            { ...file, fileId: id, materialId: mat.materialId },
            materialDir,
            null,
            { mirrorToExternal: true },
          );
        }
      }
    }

    await materialRepository.setState(mat.materialId, MATERIAL_STATE.SAVED);
    await materialRepository.updateLastSynced(mat.materialId);
  },

  /**
   * deleteSavedMaterial(materialId)
   * ────────────────────────────────
   * Removes a material from offline storage entirely: deletes its files
   * from disk, clears their fileRepository records, and sets the material
   * back to NOT_SAVED. This is the only way offline content is ever
   * removed — there is no automatic eviction.
   */
  async deleteSavedMaterial(materialId) {
    console.log(`[downloadManager] deleteSavedMaterial START ${materialId}`);
    // Sweep any cacheDirectory copies created by FileViewerScreen's
    // FileProvider-workaround fallback (see resolveLocalUriForWebView), AND
    // any SAF-mirrored copies in the student's chosen external folder (see
    // storageLocationService.mirrorToExternalIfConfigured). Both live
    // outside SAVED_DIR and would otherwise survive this call, becoming
    // exactly the kind of orphaned offline copy that made a "removed"
    // material behave as if it were still saved (Rule 4 — Delete Behaviour
    // must remove mirrored external files too, not just the internal ones).
    try {
      const materialFiles = await fileRepository.getByMaterial(materialId);
      for (const f of materialFiles) {
        if (f?.externalUri) {
          console.log(`[downloadManager] delete: removing external mirror for ${f.name || f.fileId}`);
          await storageLocationService.deleteExternalMirror(f.externalUri);
        }
        if (!f?.localPath) continue;
        const fileName = f.localPath.split('/').pop();
        const cachePath = FileSystem.cacheDirectory + fileName;
        const info = await FileSystem.getInfoAsync(cachePath).catch(() => ({}));
        if (info.exists) await FileSystem.deleteAsync(cachePath, { idempotent: true }).catch(() => {});
      }
    } catch {
      // Best-effort — never let a cache/mirror sweep failure block the real deletion below.
    }

    const materialDir = SAVED_DIR + materialId + '/';
    const info = await FileSystem.getInfoAsync(materialDir);
    if (info.exists) await FileSystem.deleteAsync(materialDir, { idempotent: true });
    await fileRepository.deleteByMaterial(materialId);
    await materialRepository.setState(materialId, MATERIAL_STATE.NOT_SAVED);
    const m = await materialRepository.getById(materialId);
    if (m) await materialRepository.upsert({ ...m, lastSyncedAt: null });
    console.log(`[downloadManager] deleteSavedMaterial DONE ${materialId} -> NOT_SAVED`);
  },

  /**
   * reconcile(serverMaterialIds, syncToServerFn)
   * ─────────────────────────────────────────────
   * Best-effort self-heal for state that drifted before the save/unsave
   * ordering fixes existed (or from any future edge case where the
   * best-effort server call silently failed). Only handles the
   * "device thinks it's saved, server doesn't know yet" direction — a
   * material locally marked SAVED that's missing from the server's saved
   * list gets pushed to the server now that we have connectivity.
   * `syncToServerFn` is a caller-supplied function (e.g. the studentApi
   * saveMaterial call) so this module doesn't need to depend on the API
   * layer directly.
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

  /**
   * cleanupCorruptFiles()
   * ───────────────────────
   * One-time (safe to run every launch — it's cheap and idempotent) sweep
   * over EVERY tracked file record, not just ones touched by verify/sync.
   * This exists specifically to self-heal 0-byte files left behind by the
   * old pre-redesign download path, which didn't validate size before
   * marking a file "downloaded." Those records would otherwise sit broken
   * forever, since normal usage (opening a file, syncing a material) only
   * re-checks files it happens to touch.
   *
   * For each file with a localPath: if the file is missing OR is 0 bytes,
   * delete the corrupt file (if present) and clear localPath so the file is
   * correctly treated as "not saved" again — the next Save/sync pass will
   * re-download it properly through the (now size-checked) fileDownloader.
   *
   * Call this once from AppNavigator on startup, alongside initAutoSync().
   */
  async cleanupCorruptFiles() {
    let cleaned = 0;
    try {
      const allFiles = await fileRepository.getAll();
      for (const f of allFiles) {
        if (!f?.localPath) continue;
        const info = await FileSystem.getInfoAsync(f.localPath).catch(() => ({}));
        if (!info.exists || info.size < MIN_VALID_FILE_SIZE) {
          console.log(`[downloadManager] cleanupCorruptFiles: clearing ${f.fileId} (${f.name || 'unnamed'}) — exists=${!!info.exists}, size=${info.size ?? 0}`);
          if (info.exists) {
            await FileSystem.deleteAsync(f.localPath, { idempotent: true }).catch(() => {});
          }
          await fileRepository.setDownloaded(f.fileId, null).catch(() => {});
          if (f.materialId) {
            await materialRepository.setState(f.materialId, MATERIAL_STATE.FAILED).catch(() => {});
          }
          cleaned++;
        }
      }
    } catch (e) {
      console.log('[downloadManager] cleanupCorruptFiles error:', e?.message);
    }
    console.log(`[downloadManager] cleanupCorruptFiles: done, ${cleaned} corrupt record(s) cleared`);
    return cleaned;
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