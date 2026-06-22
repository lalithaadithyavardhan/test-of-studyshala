/**
 * utils/fileActions.js
 * ======================
 * Preview/download via Google Drive links (mirrors how the backend already
 * gives student/faculty files real Drive preview/download URLs — see
 * buildDriveUrls() in studentController.js / facultyController.js).
 *
 * - openFile(): opens file.previewUrl inside the app via FileViewerScreen
 *   (no redirect to Google Drive or external browser), and tracks it as a
 *   "recent file" via the backend so it shows up cross-device on DashboardScreen.
 * - downloadFile(): downloads file.downloadUrl into the app's document
 *   directory, then opens the native share sheet so the user can save it
 *   to Files / Drive / wherever.
 */
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import { trackRecentFile } from '../api/studentApi';

export const openFile = async (file, material, navigation) => {
  if (!file?.previewUrl) {
    Alert.alert('Unavailable', 'This file has no preview link. Try downloading instead.');
    return;
  }

  // Fire-and-forget recent-file tracking (student-only feature; safe no-op
  // if called from a faculty context where the backend route would 403 —
  // callers should only invoke this from student screens).
  if (material) {
    trackRecentFile({
      fileId: file._id,
      fileName: file.name,
      mimeType: file.mimeType,
      materialId: material._id,
      subjectName: material.subjectName,
    }).catch(() => {});
  }

  // Open inside the app via FileViewerScreen instead of leaving to Google Drive
  if (navigation) {
    const parentNav = navigation.getParent() || navigation;
    parentNav.navigate('FileViewer', { file, material });
    return;
  }

  // Fallback — should not normally be reached
  Alert.alert('Error', 'Could not open this file.');
};

export const downloadFile = async (file) => {
  if (!file?.downloadUrl) {
    Alert.alert('Unavailable', 'This file has no download link.');
    return;
  }
  try {
    const safeName = (file.name || 'file').replace(/[^\w.\-() ]/g, '_');
    const localUri = `${FileSystem.documentDirectory}${safeName}`;
    const { uri } = await FileSystem.downloadAsync(file.downloadUrl, localUri);

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri);
    } else {
      Alert.alert('Downloaded', `Saved to ${uri}`);
    }
  } catch (e) {
    Alert.alert('Download failed', 'Could not download this file. Please try again.');
  }
};