/**
 * services/fileDownloader.js — StudyShala
 * =========================================
 * Single source of truth for "where does a downloaded file live, and have we
 * already got it" — used by downloadManager.js, offlineSyncService.js and
 * preloadService.js.
 *
 * Why this file exists:
 * Before this fix, downloadManager and offlineSyncService each built their own
 * local file path independently — one sanitized the filename, the other didn't.
 * For files with special characters in their names, that meant the SAME file
 * opened from two different screens (e.g. Dashboard "recently viewed" vs.
 * Starred) computed two DIFFERENT local paths, so both "already exists?" checks
 * came back false and the file got downloaded twice — an orphaned duplicate
 * copy nobody tracked or ever cleaned up.
 *
 * This module fixes that by:
 *   1. Using ONE canonical, sanitized path-building function everywhere.
 *   2. Before downloading, checking fileRepository for an existing localPath
 *      for this fileId (regardless of which directory it's in) and reusing it
 *      via a fast local copy instead of re-downloading from the network.
 */
import * as FileSystem from 'expo-file-system';
import { fileRepository } from '../database/fileRepository';

// Sanitise filename so it's safe as a path component — single canonical version.
export function safeName(name = 'file') {
  return name.replace(/[^\w.\-() ]/g, '_');
}

export function buildLocalPath(dir, fileId, name) {
  return `${dir}${fileId}_${safeName(name)}`;
}

export async function ensureDir(dir) {
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
}

/**
 * Central download-or-reuse helper.
 *
 * @param {object} file - { fileId|_id, name|fileName, mimeType, materialId, downloadUrl, previewUrl }
 * @param {string} targetDir - directory the file should end up in (must end with '/')
 * @param {function} [onProgress] - (fileId, percent) => void
 * @returns {Promise<string|null>} local URI, or null if there's nothing to download
 */
export async function downloadOrReuseFile(file, targetDir, onProgress) {
  const fileId = file.fileId || file._id;
  const name = file.name || file.fileName || 'file';
  const downloadUrl = file.downloadUrl;

  if (!fileId) return null;

  await ensureDir(targetDir);
  const targetPath = buildLocalPath(targetDir, fileId, name);

  // 1. Already sitting at the exact target path? Nothing to do.
  const targetInfo = await FileSystem.getInfoAsync(targetPath).catch(() => ({}));
  if (targetInfo.exists) {
    await fileRepository.setDownloaded(fileId, targetPath);
    return targetPath;
  }

  // 2. Is there already a cached copy elsewhere (any directory) for this fileId?
  //    Reuse it via a local copy instead of re-downloading — this is what
  //    prevents the duplicate-download issue described above.
  const existing = await fileRepository.getById(fileId);
  if (existing?.localPath && existing.localPath !== targetPath) {
    const existingInfo = await FileSystem.getInfoAsync(existing.localPath).catch(() => ({}));
    if (existingInfo.exists) {
      try {
        await FileSystem.copyAsync({ from: existing.localPath, to: targetPath });
        await fileRepository.setDownloaded(fileId, targetPath);
        return targetPath;
      } catch {
        // Copy failed (e.g. source got evicted mid-check) — fall through to download.
      }
    }
  }

  // 3. Nothing reusable on disk — download fresh.
  if (!downloadUrl) return null;

  try {
    const downloadResumable = FileSystem.createDownloadResumable(
      downloadUrl,
      targetPath,
      {},
      (progress) => {
        if (onProgress) {
          const percent = progress.totalBytesExpectedToWrite
            ? Math.round((progress.totalBytesWritten / progress.totalBytesExpectedToWrite) * 100)
            : 0;
          onProgress(fileId, percent);
        }
      },
    );

    const result = await downloadResumable.downloadAsync();
    if (!result?.uri) return null;

    const info = await FileSystem.getInfoAsync(result.uri);
    if (!info.exists || info.size === 0) throw new Error('File corrupted or empty');

    await fileRepository.upsert({
      fileId,
      name,
      fileName: name,
      mimeType: file.mimeType || existing?.mimeType || '',
      materialId: file.materialId || existing?.materialId,
      // Subject context — stored directly on the file record so screens like
      // DownloadsScreen can group downloads by subject without needing a
      // separate materialRepository lookup (which may not exist if the user
      // never explicitly opened/saved that material elsewhere).
      subjectName: file.subjectName || existing?.subjectName || null,
      facultyName: file.facultyName || existing?.facultyName || null,
      department:  file.department  || existing?.department  || null,
      downloaded: true,
      localPath: result.uri,
      // cachedAt is set ONCE on first download, never overwritten on re-download.
      cachedAt: existing?.cachedAt || new Date().toISOString(),
      lastOpened: existing?.lastOpened || null,
      previewUrl: file.previewUrl || existing?.previewUrl || null,
      downloadUrl: file.downloadUrl || existing?.downloadUrl || null,
    });

    return result.uri;
  } catch (error) {
    const info = await FileSystem.getInfoAsync(targetPath).catch(() => ({}));
    if (info.exists) await FileSystem.deleteAsync(targetPath, { idempotent: true });
    throw error;
  }
}

export default { safeName, buildLocalPath, ensureDir, downloadOrReuseFile };