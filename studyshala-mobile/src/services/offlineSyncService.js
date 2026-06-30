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
 */

import * as FileSystem from 'expo-file-system';
import { fileRepository } from '../database/fileRepository';
import { materialRepository } from '../database/materialRepository';
import { cacheManager } from './cacheManager';

const CACHE_DIR     = FileSystem.cacheDirectory     + 'StudyShala/Cache/';
const DOWNLOADS_DIR = FileSystem.documentDirectory  + 'StudyShala/Downloads/';

// ── Internal helpers ──────────────────────────────────────────────────────────

async function ensureDir(dir) {
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
}

// Sanitise filename so it's safe as a path component
function safeName(name = 'file') {
  return name.replace(/[^\w.\-() ]/g, '_');
}

/**
 * Core download helper.
 * Downloads a file to `localPath`, then upserts the result into fileRepository.
 * Returns the local URI on success, or null on failure.
 *
 * @param {object} fileObj   — must have fileId, name/fileName, mimeType, materialId, downloadUrl
 * @param {string} localPath — full local URI to save to
 */
async function _downloadToPath(fileObj, localPath) {
  const id      = fileObj.fileId || fileObj._id;
  const name    = fileObj.name   || fileObj.fileName || 'file';
  const matId   = fileObj.materialId;
  const dlUrl   = fileObj.downloadUrl;

  if (!dlUrl) return null;

  const downloadResumable = FileSystem.createDownloadResumable(dlUrl, localPath, {});
  const result = await downloadResumable.downloadAsync();

  if (!result?.uri) return null;

  // Persist metadata — cachedAt is only set if not already set (first-cache rule)
  const existing  = await fileRepository.getById(id);
  const cachedAt  = existing?.cachedAt || new Date().toISOString();

  await fileRepository.upsert({
    fileId:      id,
    name:        name,
    fileName:    name,
    mimeType:    fileObj.mimeType || '',
    materialId:  matId,
    downloaded:  true,
    localPath:   result.uri,
    cachedAt,                                    // Set once, never overwritten
    lastOpened:  existing?.lastOpened || null,   // Preserve last-opened
    previewUrl:  fileObj.previewUrl  || existing?.previewUrl  || null,
    downloadUrl: fileObj.downloadUrl || existing?.downloadUrl || null,
  });

  return result.uri;
}

// ── Public API ────────────────────────────────────────────────────────────────

export const offlineSyncService = {

  /**
   * cacheFile(file)
   * ──────────────
   * Called when a student stars a single file.
   * Downloads that one file to Cache dir in the background.
   *
   * file shape: { _id OR fileId, name OR fileName, mimeType, materialId, downloadUrl, previewUrl }
   */
  async cacheFile(file) {
    const id   = file.fileId || file._id;
    const name = file.name   || file.fileName || 'file';

    if (!id || !file.downloadUrl) return;

    // Check if already on disk — avoid re-downloading
    const existing = await fileRepository.getById(id);
    if (existing?.localPath) {
      const diskInfo = await FileSystem.getInfoAsync(existing.localPath).catch(() => ({}));
      if (diskInfo.exists) return; // Already cached — nothing to do
    }

    await ensureDir(CACHE_DIR);
    const localPath = `${CACHE_DIR}${id}_${safeName(name)}`;

    await _downloadToPath(
      { ...file, fileId: id, name },
      localPath,
    );
  },

  /**
   * cacheMaterial(materialId, files, material)
   * ──────────────────────────────────────────
   * Called when a student bookmarks (saves) a material.
   * Downloads ALL files for that material to the Cache dir in the background.
   * Files are downloaded one-by-one to avoid overwhelming the network.
   *
   * @param {string} materialId
   * @param {Array}  files      — array of file objects from the server response
   * @param {object} material   — material metadata (for materialRepository)
   */
  async cacheMaterial(materialId, files, material) {
    if (!materialId || !Array.isArray(files) || !files.length) return;

    await ensureDir(CACHE_DIR);

    for (const file of files) {
      try {
        const id   = file._id || file.fileId;
        const name = file.name || file.fileName || 'file';

        if (!id || !file.downloadUrl) continue;

        // Skip if already on disk
        const existing = await fileRepository.getById(id);
        if (existing?.localPath) {
          const diskInfo = await FileSystem.getInfoAsync(existing.localPath).catch(() => ({}));
          if (diskInfo.exists) continue;
        }

        const localPath = `${CACHE_DIR}${id}_${safeName(name)}`;
        await _downloadToPath(
          { ...file, fileId: id, name, materialId },
          localPath,
        );
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
   * @param {Function} getMaterialFilesFn — API function: (materialId) => Promise<{ data }>
   */
  async backgroundSync(savedMaterials, getMaterialFilesFn) {
    if (!Array.isArray(savedMaterials) || !savedMaterials.length) return;

    for (const mat of savedMaterials) {
      try {
        const { data } = await getMaterialFilesFn(mat.materialId);

        const serverVersion = data?.material?.version;
        const localVersion  = mat.version;

        // Flatten all files from server (files + subfolder files)
        const serverFiles = [
          ...(data.files || []),
          ...(data.subFolders || []).flatMap(sf => sf.files || []),
        ];

        // If version changed OR we have files not yet cached, download them
        const versionChanged = serverVersion && serverVersion !== localVersion;

        for (const file of serverFiles) {
          try {
            const id = file._id || file.fileId;
            if (!id || !file.downloadUrl) continue;

            const existing = await fileRepository.getById(id);

            // Download if: version changed OR file not yet on disk
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
              await ensureDir(CACHE_DIR);
              const name      = file.name || file.fileName || 'file';
              const localPath = `${CACHE_DIR}${id}_${safeName(name)}`;
              await _downloadToPath(
                { ...file, fileId: id, name, materialId: mat.materialId },
                localPath,
              );
            } else if (existing && versionChanged) {
              // File exists on disk but version changed — update URLs in DB
              await fileRepository.upsert({
                ...existing,
                previewUrl:  file.previewUrl  || existing.previewUrl,
                downloadUrl: file.downloadUrl || existing.downloadUrl,
              });
            }
          } catch {
            // One file failed — continue
          }
        }

        // Update material version in local DB if it changed
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
   * Called by cacheManager.runCleanup() and on app startup.
   *
   * Rules:
   *  - Only evicts files where the parent material is NOT savedOffline (permanent)
   *  - Days = -1 → never evict (user chose "Never" expiry)
   *  - cachedAt is used for expiry, not lastOpened
   */
  async evictExpiredCache() {
    const days = await cacheManager.getCacheDays();
    if (days === -1) return; // Never expire

    // Get expired file records from fileRepository
    const expiredFiles = await fileRepository.getExpiredFiles(days);
    if (!expiredFiles.length) return;

    // Load all saved-offline material IDs for protection check
    let savedMaterialIds = new Set();
    try {
      const saved = await materialRepository.getAllSaved();
      savedMaterialIds = new Set(saved.map(m => m.materialId));
    } catch {}

    for (const file of expiredFiles) {
      try {
        // Protect files whose material is permanently saved
        if (file.materialId && savedMaterialIds.has(file.materialId)) continue;

        // Delete from disk
        if (file.localPath) {
          const diskInfo = await FileSystem.getInfoAsync(file.localPath).catch(() => ({}));
          if (diskInfo.exists) {
            await FileSystem.deleteAsync(file.localPath, { idempotent: true });
          }
        }

        // Update fileRepository — mark as not downloaded, clear localPath
        await fileRepository.upsert({
          ...file,
          downloaded: false,
          localPath:  null,
          cachedAt:   null, // Reset so it gets a fresh cachedAt on next download
        });
      } catch {
        // One file eviction failed — continue
      }
    }
  },
};
