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
import * as SecureStore from 'expo-secure-store';
import { fileRepository } from '../database/fileRepository';
import { storageLocationService } from './storageLocationService';
import { API_URL, STORAGE_KEYS } from '../config/config';

// A real study-material file (PDF, image, doc, etc.) is never under ~100
// bytes. Auth-failure and error-page bodies saved in place of a real file
// (e.g. {"message":"No token provided"} at 31 bytes) are reliably far
// smaller than that, so this threshold — not strictly `size === 0` — is
// what every "is this file actually valid" check in the app now uses.
export const MIN_VALID_FILE_SIZE = 100;

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

  // 1. Already sitting at the exact target path? Nothing to do — but only if
  //    it's a REAL file. `exists` alone isn't proof of a valid download; a
  //    0-byte file (leftover from a corrupt/interrupted write, e.g. from the
  //    old pre-redesign download path) satisfies `exists` too. Treating that
  //    as "done" is exactly what let corrupt files sit undetected forever.
  const targetInfo = await FileSystem.getInfoAsync(targetPath).catch(() => ({}));
  if (targetInfo.exists && targetInfo.size >= MIN_VALID_FILE_SIZE) {
    await fileRepository.setDownloaded(fileId, targetPath);
    await maybeMirror(await fileRepository.getById(fileId));
    return targetPath;
  }
  if (targetInfo.exists && targetInfo.size < MIN_VALID_FILE_SIZE) {
    console.log(`[fileDownloader] found suspiciously small/corrupt file (${targetInfo.size ?? 0} bytes) at target path for ${name} — deleting before continuing`);
    await FileSystem.deleteAsync(targetPath, { idempotent: true }).catch(() => {});
  }

  // 2. Is there already a saved copy elsewhere on disk for this fileId?
  //    Reuse it via a local copy instead of re-downloading — this is what
  //    guarantees a file is never fetched from the network twice and never
  //    exists as more than one physical copy. Same size check applies here:
  //    copying a 0-byte "existing" file would just propagate the corruption
  //    to the new location and mark it as downloaded too.
  const existing = await fileRepository.getById(fileId);
  if (existing?.localPath && existing.localPath !== targetPath) {
    const existingInfo = await FileSystem.getInfoAsync(existing.localPath).catch(() => ({}));
    if (existingInfo.exists && existingInfo.size >= MIN_VALID_FILE_SIZE) {
      try {
        await FileSystem.copyAsync({ from: existing.localPath, to: targetPath });
        await fileRepository.setDownloaded(fileId, targetPath);
        await maybeMirror(existing);
        return targetPath;
      } catch {
        // Copy failed (e.g. source got removed mid-check) — fall through to download.
      }
    } else if (existingInfo.exists && existingInfo.size < MIN_VALID_FILE_SIZE) {
      console.log(`[fileDownloader] existing record for ${name} points to a suspiciously small/corrupt file (${existingInfo.size ?? 0} bytes) — discarding and re-downloading fresh`);
      await FileSystem.deleteAsync(existing.localPath, { idempotent: true }).catch(() => {});
      await fileRepository.setDownloaded(fileId, null).catch(() => {});
    }
  }

  // 3. Nothing reusable on disk — download fresh.
  if (!downloadUrl) return null;

  // Retry policy: transient hiccups (dropped connection, momentary 5xx,
  // a slow/flaky mobile network) shouldn't force a whole material to
  // FAILED and sit idle until the next runAutoSync() poll (up to 15s, or
  // the next app launch). A handful of immediate, backed-off retries
  // inside the same saveMaterial() call catches most of those right away.
  // A non-2xx AUTH failure (401/403) is NOT retried here — the same
  // expired/missing token will fail again immediately, so retrying
  // wastes attempts; that case is left to surface as FAILED so the next
  // sync pass re-reads the token fresh.
  const MAX_ATTEMPTS = 3;
  const RETRY_DELAY_MS = 1000;
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    console.log(`[fileDownloader] download START ${name} (fileId=${fileId}, attempt ${attempt}/${MAX_ATTEMPTS})`);
    try {
      // fileDownloader talks straight to expo-file-system, completely bypassing
      // api/client.js — so its automatic "attach the JWT" interceptor never
      // runs here. Any downloadUrl that points at OUR OWN backend (as opposed
      // to a pre-signed external Google Drive link, which needs no auth) must
      // have the token attached manually, or the backend correctly rejects the
      // request with 401 — and the small JSON error body that comes back gets
      // saved to disk as if it were the real file. This was the actual cause
      // of files that "downloaded successfully" but wouldn't open: they were
      // {"message":"No token provided"} (~31 bytes), not the real image/PDF.
      let downloadHeaders = {};
      if (downloadUrl.startsWith(API_URL)) {
        try {
          const token = await SecureStore.getItemAsync(STORAGE_KEYS.TOKEN);
          if (token) downloadHeaders = { Authorization: `Bearer ${token}` };
        } catch (tokenErr) {
          console.log(`[fileDownloader] could not read auth token for ${name}:`, tokenErr?.message);
        }
      }

      const downloadResumable = FileSystem.createDownloadResumable(
        downloadUrl,
        targetPath,
        { headers: downloadHeaders },
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
      if (!result?.uri) throw new Error('Download produced no result URI');

      console.log(`[fileDownloader] download FINISH ${name}: status=${result.status} — verifying on disk`);

      const info = await FileSystem.getInfoAsync(result.uri);
      console.log(`[fileDownloader] bytes downloaded for ${name}: ${info.size ?? 0} bytes (status ${result.status})`);

      // A non-2xx status is ALWAYS a failed download, no matter the byte count.
      // Checking size alone (the old logic) let small error bodies — auth
      // failures, expired-link redirects, "no token provided" JSON — through
      // as if they were valid files, because they're not literally 0 bytes.
      const statusOk = result.status >= 200 && result.status < 300;
      const isAuthFailure = result.status === 401 || result.status === 403;

      // A real file is never a handful of bytes either. Anything under 1KB is
      // far more likely to be an HTML/JSON error page saved as if it were the
      // actual file. Read and log it so the actual error is visible instead of
      // silently trusting any non-empty response as a valid download.
      let suspiciousContent = null;
      if (info.exists && info.size > 0 && info.size < 1024) {
        try {
          suspiciousContent = await FileSystem.readAsStringAsync(result.uri);
          console.log(`[fileDownloader] SUSPICIOUSLY SMALL download for ${name} (${info.size} bytes, status ${result.status}) — raw content:`, suspiciousContent);
        } catch (readErr) {
          console.log(`[fileDownloader] SUSPICIOUSLY SMALL download for ${name} (${info.size} bytes) — could not read as text:`, readErr.message);
        }
      }

      console.log(`[fileDownloader] verification result for ${name}: exists=${!!info.exists}, size=${info.size ?? 0}, statusOk=${statusOk}`);

      if (!info.exists || info.size < MIN_VALID_FILE_SIZE || !statusOk) {
        // Verification failed — delete whatever partial/invalid bytes landed
        // on disk before deciding whether to retry. Never leave an invalid
        // file sitting at targetPath between attempts.
        const badInfo = await FileSystem.getInfoAsync(targetPath).catch(() => ({}));
        if (badInfo.exists) await FileSystem.deleteAsync(targetPath, { idempotent: true }).catch(() => {});

        const reason = !statusOk
          ? `Server returned status ${result.status}${suspiciousContent ? `: ${suspiciousContent}` : ''}`
          : 'File corrupted, empty, or suspiciously small';
        const err = new Error(reason);
        err.isAuthFailure = isAuthFailure;
        throw err;
      }

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

      console.log(`[fileDownloader] SAVED confirmation for ${name}: localPath=${result.uri}, ${info.size} bytes`);
      return result.uri;
    } catch (error) {
      lastError = error;
      const info = await FileSystem.getInfoAsync(targetPath).catch(() => ({}));
      if (info.exists) await FileSystem.deleteAsync(targetPath, { idempotent: true }).catch(() => {});

      const canRetry = attempt < MAX_ATTEMPTS && !error.isAuthFailure;
      console.log(`[fileDownloader] download FAILED ${name} (attempt ${attempt}/${MAX_ATTEMPTS}): ${error.message}${canRetry ? ' — retrying' : ' — giving up'}`);

      if (!canRetry) break;
      await new Promise(res => setTimeout(res, RETRY_DELAY_MS * attempt));
    }
  }

  throw lastError || new Error(`Download failed for ${name} after ${MAX_ATTEMPTS} attempts`);
}

export default { safeName, buildLocalPath, ensureDir, downloadOrReuseFile };