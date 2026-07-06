/**
 * utils/fileActions.js
 * ======================
 * Pipeline (see MaterialAccessScreen / FileViewerScreen for where this is
 * called from):
 *
 *   openFile()
 *     1. Ask fileRepository whether a verified local copy exists.
 *        - YES → open it locally. Works fully offline.
 *        - NO  → check connectivity.
 *            - online  → open the remote preview (FileViewerScreen streams
 *                        file.previewUrl). Viewing does NOT force a download.
 *            - offline → tell the user plainly that this file isn't saved
 *                        yet and they need internet to view it.
 *
 *   saveFileForLater()
 *     Explicit "Save" action. Downloads the file via fileRepository so it
 *     becomes available in the offline branch above from then on.
 */
import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { trackRecentFile } from '../api/studentApi';
import {
  getUsableLocalUri,
  isOnline,
  saveFileOffline,
} from './fileRepository';

const trackOpen = (file, material) => {
  if (!material) return;
  trackRecentFile({
    fileId: file._id || file.fileId,
    fileName: file.name || file.fileName,
    mimeType: file.mimeType,
    materialId: material._id,
    subjectName: material.subjectName,
    previewUrl: file.previewUrl || null,
    downloadUrl: file.downloadUrl || null,
  }).catch(() => {});
};

/**
 * Navigates to FileViewerScreen with either a local file:// uri (offline)
 * or a remote previewUrl (online). Returns nothing — all feedback happens
 * via Alert or the navigation itself.
 */
export const openFile = async (file, material, navigation) => {
  const fileId = file?._id || file?.fileId;
  if (!fileId) {
    Alert.alert('Error', 'Could not open this file.');
    return;
  }

  trackOpen(file, material);

  const localUri = await getUsableLocalUri(fileId);
  const parentNav = navigation?.getParent?.() || navigation;

  if (localUri) {
    parentNav?.navigate('FileViewer', {
      file,
      material,
      source: 'local',
      localUri,
    });
    return;
  }

  const online = await isOnline();
  if (!online) {
    Alert.alert(
      'Not downloaded yet',
      'This file isn\'t saved on your device. Connect to the internet to view it, or save it now for offline access later.'
    );
    return;
  }

  if (!file?.previewUrl) {
    Alert.alert('Unavailable', 'This file has no preview link. Try saving it instead.');
    return;
  }

  parentNav?.navigate('FileViewer', {
    file,
    material,
    source: 'remote',
  });
};

/**
 * Explicit "Save for offline" action. `onProgress(0-1)` is optional and
 * lets callers show a progress bar on the file row.
 */
export const saveFileForLater = async (file, material, onProgress) => {
  const online = await isOnline();
  if (!online) {
    Alert.alert('No internet', 'Connect to the internet to save this file.');
    return { success: false };
  }
  try {
    const record = await saveFileOffline(file, material, onProgress);
    return { success: true, record };
  } catch (e) {
    Alert.alert('Save failed', 'Could not download this file. Please try again.');
    return { success: false, error: e };
  }
};

/**
 * "Share/export out" of the app — unrelated to offline viewing. Downloads
 * to a temp path and hands off to the OS share sheet. Kept separate from
 * saveFileForLater() because this file is NOT tracked for offline reuse.
 */
export const exportFile = async (file) => {
  if (!file?.downloadUrl) {
    Alert.alert('Unavailable', 'This file has no download link.');
    return;
  }
  try {
    const name = (file.name || file.fileName || 'file').replace(/[^\w.\-() ]/g, '_');
    const localUri = `${FileSystem.cacheDirectory}${name}`;
    const { uri } = await FileSystem.downloadAsync(file.downloadUrl, localUri);

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, { mimeType: file.mimeType, dialogTitle: name });
    } else {
      Alert.alert('Downloaded', `Saved to ${uri}`);
    }
  } catch (e) {
    Alert.alert('Export failed', 'Could not export this file. Please try again.');
  }
};

// Back-compat alias — older screens imported `downloadFile` for the
// share-out behavior. Keep the name working.
export const downloadFile = exportFile;