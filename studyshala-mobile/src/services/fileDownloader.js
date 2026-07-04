/**
 * services/fileDownloader.js — StudyShala
 * =========================================
 * Single source of truth for "where does a saved file live, and have we
 * already got it" — used by downloadManager.js. This is the ONLY place that
 * actually writes a file to disk anywhere in the app.
 *
 * Why this file exists:
 * Different callers used to build local paths independently — one sanitized
 * the filename, one didn't. For files with special characters in their
 * names, the SAME file opened from two different screens computed two
 * DIFFERENT local paths, so "already exists?" checks came back false and the
 * file got downloaded twice — an orphaned duplicate nobody tracked or cleaned
 * up. This module fixes that by:
 *
 *   1. Using ONE canonical, sanitized path-building function everywhere.
 *   2. Before downloading, checking fileRepository for an existing localPath
 *      for this fileId and reusing it via a fast local copy instead of
 *      re-downloading from the network — this is what guarantees "one
 *      physical copy of every file on disk."
 */
import * as FileSystem from 'expo-file-system';
import { fileRepository } from '../database/fileRepository';
import { storageLocationService } from './storageLocationService';

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
 * Central download-or-reuse helper. Every file the app ever saves for
 * offline use goes through this function, and only this function.
 *
 * @param {object} file - { fileId|_id, name|fileName, mimeType, materialId, downloadUrl, previewUrl }
 * @param {string} targetDir - directory the file should end up in (must end with '/')
 * @param {function} [onProgress] - (fileId, percent) => void
 * @param {object} [opts]
 * @param {boolean} [opts.mirrorToExternal=false] - if true and the student has
 *   chosen a custom download folder (see storageLocationService), also copies
 *   this file there. Only mirrors once per file — re-saves won't pile up
 *   duplicate copies in the external folder. Never throws.
 * @returns {Promise<string|null>} local URI, or null if there's nothing to download
 */
export async function downloadOrReuseFile(file, targetDir, onProgress, opts = {}) {
  const { mirrorToExternal = false } = opts;
  const fileId = file.fileId || file._id;
  const name = file.name || file.fileName || 'file';
  const downloadUrl = file.downloadUrl;

  if (!fileId) return null;

  await ensureDir(targetDir);
  const targetPath = buildLocalPath(targetDir, fileId, name);

  const maybeMirror = async (existingRecord) => {
    if (!mirrorToExternal) return;
    if (existingRecord?.externalUri) return; // already mirrored once
    const externalUri = await storageLocationService.mirrorToExternalIfConfigured(
      targetPath,
      safeName(name),
      file.mimeType || existingRecord?.mimeType || '',
    );
    if (externalUri) {
      try { await fileRepository.upsert({ fileId, externalUri }); } catch {}
    }
  };

  // 1. Already sitting at the exact target path? Nothing to do.
  const targetInfo = await FileSystem.getInfoAsync(targetPath).catch(() => ({}));
  if (targetInfo.exists) {
    await fileRepository.setDownloaded(fileId, targetPath);
    await maybeMirror(await fileRepository.getById(fileId));
    return targetPath;
  }

  // 2. Is there already a saved copy elsewhere on disk for this fileId?
  //    Reuse it via a local copy instead of re-downloading — this is what
  //    guarantees a file is never fetched from the network twice and never
  //    exists as more than one physical copy.
  const existing = await fileRepository.getById(fileId);
  if (existing?.localPath && existing.localPath !== targetPath) {
    const existingInfo = await FileSystem.getInfoAsync(existing.localPath).catch(() => ({}));
    if (existingInfo.exists) {
      try {
        await FileSystem.copyAsync({ from: existing.localPath, to: targetPath });
        await fileRepository.setDownloaded(fileId, targetPath);
        await maybeMirror(existing);
        return targetPath;
      } catch {
        // Copy failed (e.g. source got removed mid-check) — fall through to download.
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
      // Subject context — stored directly on the file record so the Saved
      // Materials screen can group by subject without an extra lookup.
      subjectName: file.subjectName || existing?.subjectName || null,
      facultyName: file.facultyName || existing?.facultyName || null,
      department:  file.department  || existing?.department  || null,
      size: info.size || file.size || existing?.size || 0,
      downloaded: true,
      localPath: result.uri,
      // downloadedAt is set ONCE on first save, never overwritten on re-download.
      downloadedAt: existing?.downloadedAt || new Date().toISOString(),
      lastOpened: existing?.lastOpened || null,
      previewUrl: file.previewUrl || existing?.previewUrl || null,
      downloadUrl: file.downloadUrl || existing?.downloadUrl || null,
    });

    await maybeMirror(existing);

    return result.uri;
  } catch (error) {
    const info = await FileSystem.getInfoAsync(targetPath).catch(() => ({}));
    if (info.exists) await FileSystem.deleteAsync(targetPath, { idempotent: true });
    throw error;
  }
}

export default { safeName, buildLocalPath, ensureDir, downloadOrReuseFile };