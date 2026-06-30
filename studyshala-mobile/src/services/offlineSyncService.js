/**
 * services/offlineSyncService.js — StudyShala
 * =============================================
 * Background-only sync service. Never blocks the UI.
 *
 * Every method is fire-and-forget — callers wrap with .catch(() => {}).
 *
 * Responsibilities:
 *  1. cacheFile(file)          — Download one starred file to Cache dir
 *  2. cacheMaterial(...)       — Download all files for a saved material to Cache dir
 *  3. backgroundSync(...)      — On startup: check versions, fetch new files silently
 *  4. evictExpiredCache()      — Remove files older than expiry setting from disk + DB
 *
 * Cache rules (from handoff):
 *  - Cache dir   = FileSystem.cacheDirectory + 'StudyShala/Cache/'  (OS may clear under pressure)
 *  - Downloads   = FileSystem.documentDirectory + 'StudyShala/Downloads/'  (permanent, never evicted)
 *  - savedOffline: true  → Downloads dir, never evicted
 *  - savedOffline: false → Cache dir, evicted after expiry days
 *  - cachedAt is set ONCE on first download. Never reset on re-open.
 *  - lastOpened is updated on each open — does NOT affect eviction.
 *
 * NOTE: actual file downloading + path-building now goes through
 * fileDownloader.downloadOrReuseFile(), which is also used by downloadManager
 * and preloadService. This guarantees the same fileId always resolves to the
 * same sanitized local path everywhere, and reuses an existing cached copy
 * instead of silently downloading duplicates.
 */
import * as FileSystem from 'expo-file-system';
import { fileRepository } from '../database/fileRepository';
import { materialRepository } from '../database/materialRepository';
import { cacheManager } from './cacheManager';
import { downloadOrReuseFile, ensureDir } from './fileDownloader';

const CACHE_DIR = FileSystem.cacheDirectory + 'StudyShala/Cache/';

// ── Public API ────────────────────────────────────────────────────────────────

export const offlineSyncService = {

  /**
   * cacheFile(file)
   * ──────────────
   * Called when a student stars a single file.
   * Downloads that one file to Cache dir in the background (or reuses an
   * existing copy if the file was already cached/downloaded elsewhere).
   *
   * file shape: { _id OR fileId, name OR fileName, mimeType, materialId, downloadUrl, previewUrl }
   */
  async cacheFile(file) {
    const id = file.fileId || file._id;
    if (!id || !file.downloadUrl) return;

    await ensureDir(CACHE_DIR);
    await downloadOrReuseFile({ ...file, fileId: id }, CACHE_DIR).catch(() => {});
  },

  /**
   * cacheMaterial(materialId, files, material)
   * ──────────────────────────────────────────
   * Called when a student bookmarks (saves) a material.
   * Downloads ALL files for that material to the Cache dir in the background.
   * Files are downloaded one-by-one to avoid overwhelming the network.
   */
  async cacheMaterial(materialId, files, material) {
    if (!materialId || !Array.isArray(files) || !files.length) return;

    await ensureDir(CACHE_DIR);

    for (const file of files) {
      try {
        const id = file._id || file.fileId;
        if (!id || !file.downloadUrl) continue;

        await downloadOrReuseFile({ ...file, fileId: id, materialId }, CACHE_DIR);
      } catch {
        // One file failed — continue with the rest
      }
    }
  },

  /**
   * backgroundSync(savedMaterials, getMaterialFilesFn)
   * ───────────────────────────────────────────────────
   * Called on app startup when internet is available.
   * Checks all saved materials for version changes and downloads new/changed files.
   *
   * @param {Array}    savedMaterials     — from materialRepository.getAllSaved()
   * @param {Function} getMaterialFilesFn — API function: (materialId) => Promise<AxiosResponse<{ material, files, subFolders }>>
   */
  async backgroundSync(savedMaterials, getMaterialFilesFn) {
    if (!Array.isArray(savedMaterials) || !savedMaterials.length) return;

    for (const mat of savedMaterials) {
      try {
        const { data } = await getMaterialFilesFn(mat.materialId);

        const serverVersion = data?.material?.version;
        const localVersion = mat.version;

        // Flatten all files from server (files + subfolder files)
        const serverFiles = [
          ...(data.files || []),
          ...(data.subFolders || []).flatMap(sf => sf.files || []),
        ];

        const versionChanged = serverVersion && serverVersion !== localVersion;

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
              await downloadOrReuseFile({ ...file, fileId: id, materialId: mat.materialId }, CACHE_DIR);
            } else if (existing && versionChanged) {
              // File exists on disk but version changed — update URLs in DB
              await fileRepository.upsert({
                ...existing,
                previewUrl: file.previewUrl || existing.previewUrl,
                downloadUrl: file.downloadUrl || existing.downloadUrl,
              });
            }
          } catch {
            // One file failed — continue
          }
        }

        if (versionChanged) {
          await materialRepository.upsert({
            ...mat,
            version: serverVersion,
          });
        }
      } catch {
        // One material failed (e.g. no internet mid-loop) — continue with next
      }
    }
  },

  /**
   * evictExpiredCache()
   * ───────────────────
   * Removes files from disk and fileRepository whose cachedAt is older than
   * the user's configured expiry setting (from cacheManager).
   *
   * Rules:
   *  - Only evicts files where the parent material is NOT savedOffline (permanent)
   *  - Days = -1 → never evict (user chose "Never" expiry)
   *  - cachedAt is used for expiry, not lastOpened
   */
  async evictExpiredCache() {
    const days = await cacheManager.getCacheDays();
    if (days === -1) return; // Never expire

    const expiredFiles = await fileRepository.getExpiredFiles(days);
    if (!expiredFiles.length) return;

    let savedMaterialIds = new Set();
    try {
      const saved = await materialRepository.getAllSaved();
      savedMaterialIds = new Set(saved.map(m => m.materialId));
    } catch {}

    for (const file of expiredFiles) {
      try {
        if (file.materialId && savedMaterialIds.has(file.materialId)) continue;

        if (file.localPath) {
          const diskInfo = await FileSystem.getInfoAsync(file.localPath).catch(() => ({}));
          if (diskInfo.exists) {
            await FileSystem.deleteAsync(file.localPath, { idempotent: true });
          }
        }

        await fileRepository.upsert({
          ...file,
          downloaded: false,
          localPath: null,
          cachedAt: null, // Reset so it gets a fresh cachedAt on next download
        });
      } catch {
        // One file eviction failed — continue
      }
    }
  },
};

export default offlineSyncService;
