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
 * - downloadFile(): saves directly to the device Downloads folder.
 *
 *   Android strategy — SAF "grant once, reuse forever":
 *     First download ever: SAF folder picker opens pre-pointed at Downloads.
 *     User taps "Use this folder" once. URI is persisted to AsyncStorage.
 *     Every subsequent download reuses the stored URI — no picker shown.
 *     Uses only expo-file-system + AsyncStorage (both already natively linked).
 *     No MediaLibrary, no IntentLauncher, no rebuild required.
 *
 *   iOS: downloads to documentDirectory then opens the native share sheet
 *     (correct iOS pattern — no public Downloads folder exists on iOS).
 */
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';
import { trackRecentFile } from '../api/studentApi';

// AsyncStorage key where we persist the SAF Downloads URI grant
const SAF_DOWNLOADS_URI_KEY = '@studyshala/saf_downloads_uri';

// The Android Downloads folder content URI — passed as initialUri to the SAF
// picker so it opens directly inside Downloads (user just taps "Use this folder")
const ANDROID_DOWNLOADS_TREE_URI =
  'content://com.android.providers.downloads.documents/tree/downloads';

// ─── openFile — unchanged ────────────────────────────────────────────────────

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

// ─── getOrRequestDownloadsUri (Android only) ─────────────────────────────────
// Returns a previously-granted SAF Downloads URI from AsyncStorage, or asks
// the user to grant access once via the SAF folder picker (pre-opened to
// Downloads). Returns null if the user cancels.

const getOrRequestDownloadsUri = async () => {
  // 1. Try the persisted URI first — no user interaction needed
  try {
    const stored = await AsyncStorage.getItem(SAF_DOWNLOADS_URI_KEY);
    if (stored) return stored;
  } catch {}

  // 2. No stored URI — open SAF picker pre-pointed at Downloads
  //    initialUri opens the picker inside the Downloads directory so the
  //    user just sees "Use this folder" without having to navigate anywhere.
  const result = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync(
    ANDROID_DOWNLOADS_TREE_URI,
  );

  if (!result.granted) return null; // user cancelled

  // 3. Persist the granted URI so future downloads skip the picker entirely
  try {
    await AsyncStorage.setItem(SAF_DOWNLOADS_URI_KEY, result.directoryUri);
  } catch {}

  return result.directoryUri;
};

// ─── downloadFile ─────────────────────────────────────────────────────────────

export const downloadFile = async (file) => {
  if (!file?.downloadUrl) {
    Alert.alert('Unavailable', 'This file has no download link.');
    return;
  }

  const safeName = (file.name || 'file').replace(/[^\w.\-() ]/g, '_');

  // ── ANDROID: save directly to Downloads via SAF ──────────────────────────
  if (Platform.OS === 'android') {
    try {
      // Step 1: get (or request) permission to write to Downloads
      const downloadsUri = await getOrRequestDownloadsUri();
      if (!downloadsUri) {
        // User cancelled the one-time picker — nothing to do
        return;
      }

      // Step 2: download the file into app cache (no user interaction)
      const cacheUri = `${FileSystem.cacheDirectory}${safeName}`;
      const { status } = await FileSystem.downloadAsync(file.downloadUrl, cacheUri);
      if (status !== 200) throw new Error(`HTTP ${status}`);

      // Step 3: read the cached file as base64
      const base64 = await FileSystem.readAsStringAsync(cacheUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Step 4: create a new file in the Downloads folder via SAF
      const mimeType = file.mimeType || 'application/octet-stream';
      const destUri = await FileSystem.StorageAccessFramework.createFileAsync(
        downloadsUri,
        safeName,
        mimeType,
      );

      // Step 5: write the content
      await FileSystem.writeAsStringAsync(destUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Step 6: clean up cache copy
      await FileSystem.deleteAsync(cacheUri, { idempotent: true });

      // Step 7: confirm to the user — file is now in Downloads
      Alert.alert(
        'Download complete',
        `"${file.name}" has been saved to your Downloads folder.`,
        [{ text: 'OK' }],
      );
    } catch (e) {
      // If the stored URI was revoked (app reinstall, permission cleared),
      // clear it so the next attempt re-prompts cleanly.
      if (
        e?.message?.includes('permission') ||
        e?.message?.includes('URI') ||
        e?.code === 'ERR_FILESYSTEM_CANNOT_CREATE_FILE'
      ) {
        try { await AsyncStorage.removeItem(SAF_DOWNLOADS_URI_KEY); } catch {}
      }
      console.error('[downloadFile] Android error:', e);
      Alert.alert('Download failed', 'Could not download this file. Please try again.');
    }
    return;
  }

  // ── iOS: cache + native share sheet (correct iOS pattern) ────────────────
  try {
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