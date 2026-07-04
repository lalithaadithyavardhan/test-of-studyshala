/**
 * utils/fileActions.js
 * ======================
 * The single shared "open a file" function every screen uses.
 *
 * openFile() flow — matches the one offline rule for the whole app:
 *   1. Look the file up in fileRepository. If it has a localPath AND that
 *      file still exists on disk → open it immediately. Zero internet,
 *      zero network calls, zero ambiguity: this only happens when the
 *      file's material was saved.
 *   2. No local copy → this file was never saved for offline use. Try to
 *      stream it from the network (fresh preview/download URL) so browsing
 *      and previewing still works fine with internet.
 *   3. No local copy AND no internet → tell the user honestly that this
 *      material hasn't been saved for offline use, instead of a generic
 *      "couldn't open file" error.
 *
 * There is no more background-download-into-cache step here. The ONLY way
 * a file becomes available offline is Save on its material — see
 * services/downloadManager.js. Opening a file never writes anything to disk.
 *
 * Auth: 401/403 responses from getMaterialFiles trigger logout so the user is
 * never shown a misleading "connect to internet" error on an expired session.
 */

import * as FileSystem from 'expo-file-system';
import { Alert, Linking } from 'react-native';
import { trackRecentFile, getMaterialFiles, getDownloadUrl } from '../api/studentApi';
import { fileRepository } from '../database/fileRepository';
import { downloadManager } from '../services/downloadManager';

// ── Check if a URL is a valid http(s) URL ─────────────────────────────────────
function isValidHttpUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// ── Handle 401 / 403 from any API call ────────────────────────────────────────
async function handleAuthFailure(logout) {
  if (typeof logout === 'function') {
    logout();
  } else {
    Alert.alert('Session expired', 'Please log in again to continue.', [{ text: 'OK' }]);
  }
}

// ── Normalise file shape ───────────────────────────────────────────────────────
// MaterialAccessScreen uses _id/name; StarredScreen uses fileId/fileName.
function normalise(file) {
  return {
    ...file,
    _id:         file._id        || file.fileId,
    fileId:      file.fileId     || file._id,
    name:        file.name       || file.fileName,
    fileName:    file.fileName   || file.name,
    mimeType:    file.mimeType   || '',
    previewUrl:  file.previewUrl  || null,
    downloadUrl: file.downloadUrl || null,
    materialId:  file.materialId  || null,
    subjectName: file.subjectName || null,
  };
}

// ── Navigate to FileViewer ─────────────────────────────────────────────────────
function navigateToViewer(navigation, file, material) {
  const parentNav = navigation.getParent() || navigation;
  parentNav.navigate('FileViewer', { file, material });
}

function trackOpen(f, material) {
  trackRecentFile({
    fileId:      f._id,
    fileName:    f.name,
    mimeType:    f.mimeType,
    materialId:  material?._id || f.materialId,
    subjectName: material?.subjectName || f.subjectName,
  }).catch(() => {});
}

// ── Main openFile ─────────────────────────────────────────────────────────────
// Optional logout param allows this function to trigger re-auth on 401 without
// needing to import AuthContext directly in a non-component module.
export const openFile = async (file, material, navigation, logout) => {
  if (!navigation) {
    Alert.alert('Error', 'Could not open this file.');
    return;
  }

  const f = normalise(file);

  // ── Step 1: local file — the only guaranteed-offline path ─────────────────
  const localRecord = await fileRepository.getById(f._id);

  if (localRecord?.localPath) {
    try {
      const diskInfo = await FileSystem.getInfoAsync(localRecord.localPath);
      if (diskInfo.exists) {
        await fileRepository.updateLastOpened(f._id);
        trackOpen(f, material);
        navigateToViewer(navigation, { ...f, localPath: localRecord.localPath }, material);
        return;
      }
    } catch {
      // getInfoAsync threw unexpectedly — fall through and try streaming instead.
    }
    // Record says it's saved but the bytes are gone from disk (e.g. the user
    // cleared app storage outside the app). Treat as not-saved from here on.
  }

  // ── Step 2: not saved — try to stream it live from the network ────────────
  let freshDownloadUrl = isValidHttpUrl(f.downloadUrl) ? f.downloadUrl : null;
  let freshPreviewUrl  = isValidHttpUrl(f.previewUrl)  ? f.previewUrl  : null;

  const materialIdForRefresh = material?._id || f.materialId;
  let refreshAttempted = false;
  let refreshFailed    = false;

  if (materialIdForRefresh) {
    refreshAttempted = true;
    try {
      const res = await getMaterialFiles(materialIdForRefresh);

      if (res?.status === 401 || res?.status === 403 ||
          res?.data?.status === 401 || res?.data?.status === 403) {
        await handleAuthFailure(logout);
        return;
      }

      const data = res?.data || {};
      const allFiles = [
        ...(data.files || []),
        ...(data.subFolders || []).flatMap(sf => sf.files || []),
      ];
      const fresh = allFiles.find(sf =>
        String(sf._id) === String(f._id) ||
        String(sf.fileId) === String(f._id) ||
        String(sf.id) === String(f._id),
      );
      if (fresh?.downloadUrl && isValidHttpUrl(fresh.downloadUrl)) freshDownloadUrl = fresh.downloadUrl;
      if (fresh?.previewUrl  && isValidHttpUrl(fresh.previewUrl))  freshPreviewUrl  = fresh.previewUrl;
    } catch (err) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        await handleAuthFailure(logout);
        return;
      }
      refreshFailed = true;
    }
  }

  if (freshPreviewUrl || freshDownloadUrl) {
    trackOpen(f, material);
    navigateToViewer(
      navigation,
      { ...f, previewUrl: freshPreviewUrl, downloadUrl: freshDownloadUrl },
      material,
    );
    return;
  }

  // ── Step 3: nothing available — honest, specific message ──────────────────
  // Last-resort raw link: even if it failed the strict isValidHttpUrl() check
  // or the fresh-fetch match, try the browser with whatever URL the file
  // originally carried — a bad regex match shouldn't strand the user with
  // literally no way to reach a file that might still be perfectly openable.
  const lastResortUrl = f.downloadUrl || f.previewUrl || freshDownloadUrl || freshPreviewUrl || null;
  const openInBrowser = lastResortUrl
    ? { text: 'Open in Browser', onPress: () => Linking.openURL(lastResortUrl).catch(() => {}) }
    : null;

  console.log('[fileActions] openFile Step 3 — no URL resolved', {
    fileId: f._id, materialId: materialIdForRefresh,
    originalPreviewUrl: file?.previewUrl, originalDownloadUrl: file?.downloadUrl,
    refreshAttempted, refreshFailed, lastResortUrl,
  });

  if (refreshAttempted && refreshFailed) {
    Alert.alert(
      'No internet connection',
      'This material hasn\u2019t been saved for offline use. Connect to the internet to view it, or save the material first.',
      [{ text: 'OK', style: 'cancel' }],
    );
  } else if (!materialIdForRefresh) {
    Alert.alert(
      'File unavailable',
      'This file could not be opened. Try opening it from its subject or material folder.',
      openInBrowser ? [{ text: 'OK', style: 'cancel' }, openInBrowser] : [{ text: 'OK', style: 'cancel' }],
    );
  } else {
    Alert.alert(
      'File not found',
      'This file may have been removed from the server. Please try opening it from its material folder.',
      openInBrowser ? [{ text: 'OK', style: 'cancel' }, openInBrowser] : [{ text: 'OK', style: 'cancel' }],
    );
  }
};

// ── downloadFile — permanent save of one specific file ────────────────────────
// For "long-press → Download" and "download selected" actions, i.e. saving
// just a few files without saving their whole material. Goes through
// downloadManager.saveFiles() — the same permanent storage and dedupe logic
// as Save, just scoped to specific files instead of "everything."
export const downloadFile = async (file, material, logout, onDone) => {
  const f = normalise(file);
  const materialId = material?._id || f.materialId;

  if (!materialId) {
    Alert.alert('Unavailable', 'This file can\u2019t be downloaded on its own — open it from its material folder first.');
    return;
  }

  try {
    await downloadManager.saveFiles(
      materialId,
      [f],
      (fileId) => getDownloadUrl(materialId, fileId),
    );
    onDone?.(true);
  } catch (e) {
    Alert.alert('Download failed', e?.message || 'Could not download this file. Please try again.');
    onDone?.(false);
  }
};

export default { openFile, downloadFile };