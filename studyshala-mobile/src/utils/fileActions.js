/**
 * utils/fileActions.js
 * ======================
 * Offline-first file opening — Spotify model.
 *
 * openFile() flow:
 *   1. Check local disk first → open instantly if cached (zero internet)
 *   2. Not on disk → download to Cache dir in background while navigating
 *   3. Download failed + no previewUrl → clear offline error
 *   4. Download failed + previewUrl exists → stream from URL as last resort
 *
 * downloadFile() — silently saves to Downloads dir via downloadManager and
 * registers it in fileRepository so it shows up in the Downloads screen.
 * No share sheet / "choose a location" prompt — see comment above downloadFile().
 */

import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';
import { trackRecentFile, getMaterialFiles } from '../api/studentApi';
import { downloadManager } from '../services/downloadManager';
import { fileRepository } from '../database/fileRepository';
import { storage } from '../database/db';

const CACHE_DIR = FileSystem.cacheDirectory + 'StudyShala/Cache/';

// ── Normalise file shape ───────────────────────────────────────────────────────
// MaterialAccessScreen uses _id/name; StarredScreen uses fileId/fileName.
// Normalise once here so the rest of the function is clean.
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
  };
}

// ── Ensure cache directory exists ─────────────────────────────────────────────
async function ensureCacheDir() {
  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
}

// ── Navigate to FileViewer ─────────────────────────────────────────────────────
function navigateToViewer(navigation, file, material) {
  const parentNav = navigation.getParent() || navigation;
  parentNav.navigate('FileViewer', { file, material });
}

// ── Main openFile ─────────────────────────────────────────────────────────────
export const openFile = async (file, material, navigation) => {
  if (!navigation) {
    Alert.alert('Error', 'Could not open this file.');
    return;
  }

  const f = normalise(file);

  // ── Step 1: Check local disk first ──────────────────────────────────────────
  // fileRepository stores localPath once a file has been downloaded.
  const localRecord = await fileRepository.getById(f._id);

  if (localRecord?.localPath) {
    // Verify the file actually still exists on disk (OS may have evicted it)
    try {
      const diskInfo = await FileSystem.getInfoAsync(localRecord.localPath);
      if (diskInfo.exists) {
        // ✅ Open instantly — zero internet needed
        await fileRepository.updateLastOpened(f._id);
        trackRecentFile({
          fileId:      f._id,
          fileName:    f.name,
          mimeType:    f.mimeType,
          materialId:  material?._id,
          subjectName: material?.subjectName,
        }).catch(() => {});
        navigateToViewer(navigation, { ...f, localPath: localRecord.localPath }, material);
        return;
      }
    } catch {}
    // File record exists but file is gone from disk — fall through to re-download
  }

  // ── Step 2: Not on disk — fetch fresh URL then download ────────────────────
  // The stored downloadUrl / previewUrl in AsyncStorage (starred cache) is a
  // time-limited Google Drive URL that expires after a few hours.
  // Strategy:
  //   a) Try to get a fresh downloadUrl from the API first.
  //   b) If API succeeds → navigate + download with fresh URL in background.
  //   c) If API fails (no internet) → fall back to streaming from previewUrl.
  //   d) If neither works → show offline error.

  // a) Try to refresh URLs from the server
  let freshDownloadUrl = f.downloadUrl;
  let freshPreviewUrl  = f.previewUrl;

  if (material?._id) {
    try {
      const { data } = await getMaterialFiles(material._id);
      const allFiles = [
        ...(data.files || []),
        ...(data.subFolders || []).flatMap(sf => sf.files || []),
      ];
      const fresh = allFiles.find(sf => sf._id === f._id);
      if (fresh?.downloadUrl) freshDownloadUrl = fresh.downloadUrl;
      if (fresh?.previewUrl)  freshPreviewUrl  = fresh.previewUrl;

      // Also update the starred cache so next open uses fresh URLs.
      // NOTE: storage.set() already JSON.stringifies internally — pass the
      // plain object, never JSON.stringify it yourself here.
      try {
        const existing = await storage.get(`starred:${f._id}`);
        if (existing) {
          await storage.set(`starred:${f._id}`, {
            ...existing,
            downloadUrl: freshDownloadUrl,
            previewUrl:  freshPreviewUrl,
          });
        }
      } catch {}
    } catch {
      // No internet — continue with cached URLs (may be expired)
    }
  }

  // b) Download with fresh URL
  if (freshDownloadUrl) {
    // Navigate first — student sees the screen immediately.
    // IMPORTANT: also pass the fresh previewUrl/downloadUrl through here.
    // "Recently viewed" entries never carry a previewUrl/downloadUrl of
    // their own (the recent-files record is just fileId/fileName/etc), so
    // without this the viewer has nothing to render until the background
    // download finishes — which is what caused the blank-screen bug when
    // opening files from the Dashboard's "Recently viewed" list.
    navigateToViewer(
      navigation,
      { ...f, previewUrl: freshPreviewUrl || f.previewUrl, downloadUrl: freshDownloadUrl, isDownloading: true },
      material,
    );

    // Track recent file fire-and-forget
    trackRecentFile({
      fileId:      f._id,
      fileName:    f.name,
      mimeType:    f.mimeType,
      materialId:  material?._id,
      subjectName: material?.subjectName,
    }).catch(() => {});

    // Download to Cache dir in background
    try {
      await ensureCacheDir();
      const safeName  = (f.name || 'file').replace(/[^\w.\-() ]/g, '_');
      const localPath = `${CACHE_DIR}${f._id}_${safeName}`;

      const downloadResumable = FileSystem.createDownloadResumable(
        freshDownloadUrl,
        localPath,
        {},
      );

      const result = await downloadResumable.downloadAsync();
      if (result?.uri) {
        // Save to fileRepository so next open is instant (offline)
        await fileRepository.upsert({
          fileId:      f._id,
          name:        f.name,
          fileName:    f.name,
          mimeType:    f.mimeType,
          materialId:  material?._id,
          downloaded:  true,
          localPath:   result.uri,
          cachedAt:    new Date().toISOString(),
          lastOpened:  new Date().toISOString(),
          previewUrl:  freshPreviewUrl,
          downloadUrl: freshDownloadUrl,
        });
      }
    } catch {
      // Download failed — FileViewer already open, will show error state
    }
    return;
  }

  // c) No downloadUrl — try streaming from previewUrl
  if (freshPreviewUrl) {
    trackRecentFile({
      fileId:      f._id,
      fileName:    f.name,
      mimeType:    f.mimeType,
      materialId:  material?._id,
      subjectName: material?.subjectName,
    }).catch(() => {});
    navigateToViewer(navigation, { ...f, previewUrl: freshPreviewUrl }, material);
    return;
  }

  // d) Nothing available — truly offline with no cache
  Alert.alert(
    'File unavailable offline',
    'This file has not been cached yet. Please connect to the internet to open it for the first time.',
  );
};

// ── downloadFile — permanent save to device, no share-sheet prompt ────────────
// IMPORTANT: this must go through downloadManager.downloadToDevice() (which
// saves to documentDirectory/StudyShala/Downloads/ AND registers the file in
// fileRepository) — NOT a one-off FileSystem.downloadAsync() call. Two bugs
// this fixes:
//   1. Previously this called Sharing.shareAsync() immediately after saving,
//      which pops the OS share sheet and forces the user to pick a
//      destination/app — that's not what tapping "Download" should do.
//   2. Previously this never wrote anything to fileRepository, so even
//      though the file was saved correctly on disk, it could never show up
//      in the Downloads screen.
// `material` is optional but should be passed whenever available so the
// saved file is correctly associated with its subject/material for grouping
// in the Downloads screen.
export const downloadFile = async (file, material) => {
  const f = normalise(file);

  if (!f.downloadUrl) {
    Alert.alert('Unavailable', 'This file has no download link.');
    return;
  }

  try {
    await downloadManager.downloadToDevice(
      {
        fileId:      f._id,
        name:        f.name,
        fileName:    f.name,
        mimeType:    f.mimeType,
        materialId:  material?._id || f.materialId,
        subjectName: material?.subjectName || f.subjectName,
        facultyName: material?.facultyName || f.facultyName,
        department:  material?.department  || f.department,
        previewUrl:  f.previewUrl,
      },
      f.downloadUrl,
    );
    // No share sheet — the file is now saved and will appear in the
    // Downloads screen. Nothing further to do here.
  } catch (e) {
    Alert.alert('Download failed', e?.message || 'Could not download this file. Please try again.');
  }
};