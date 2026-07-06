/**
 * services/storageLocationService.js — StudyShala
 * ==================================================
 * Lets the student choose WHERE downloaded files are visible on their
 * device, addressing: "the student doesn't know where it downloads."
 *
 * IMPORTANT — what this does and doesn't change:
 *  - The app ALWAYS keeps its own private internal copy of every download
 *    at documentDirectory/StudyShala/Downloads/. This is what FileViewerScreen,
 *    fileRepository, and offline-opening all rely on — none of that changes,
 *    so offline viewing keeps working exactly as before regardless of this
 *    setting.
 *  - If the student picks a custom folder (Android only), this service ALSO
 *    mirrors a copy of each newly-downloaded file into that folder using the
 *    Storage Access Framework (SAF), so it shows up in their device's file
 *    manager / Downloads app / SD card, etc. This is purely an additional,
 *    best-effort copy — if it fails (permission revoked, folder deleted,
 *    etc.) the download itself still succeeds, since the internal copy is
 *    unaffected.
 *  - Cache location is intentionally NOT user-configurable. Cache is a
 *    private, auto-expiring working area (see StorageSettingsScreen's cache
 *    expiry setting + cacheManager.runCleanup()) that the offline-viewer
 *    depends on living in a predictable app-private path. Exposing it to a
 *    user-chosen folder would risk breaking offline viewing and the
 *    automatic cleanup feature, and isn't something a student needs to
 *    manage directly — it's not meant to be human-browsed.
 *  - iOS has no equivalent to SAF in a managed Expo app — there's no way for
 *    a third-party app to write into an arbitrary user-chosen folder outside
 *    its own sandbox. So on iOS this always reports 'internal' and the
 *    picker is hidden in the UI; this is an OS restriction, not a bug.
 */
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MODE_KEY  = 'download_location_mode';   // 'internal' | 'external'
const URI_KEY   = 'download_location_uri';    // SAF directory URI (Android only)
const LABEL_KEY = 'download_location_label';  // human-readable name for display

const INTERNAL_LABEL = 'Internal Storage (StudyShala folder)';

export const storageLocationService = {

  isExternalPickerSupported() {
    // SAF directory picking is Android-only. Feature-detected too, in case
    // a given Expo SDK / build doesn't expose StorageAccessFramework.
    return (
      Platform.OS === 'android' &&
      !!FileSystem.StorageAccessFramework &&
      typeof FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync === 'function'
    );
  },

  async getMode() {
    if (Platform.OS !== 'android') return 'internal';
    const val = await AsyncStorage.getItem(MODE_KEY);
    return val === 'external' ? 'external' : 'internal';
  },

  async getLabel() {
    const mode = await this.getMode();
    if (mode === 'internal') return INTERNAL_LABEL;
    const label = await AsyncStorage.getItem(LABEL_KEY);
    return label || 'Custom folder';
  },

  async getExternalUri() {
    return await AsyncStorage.getItem(URI_KEY);
  },

  /**
   * Opens the system folder picker (Android only) and stores the chosen
   * directory's persisted URI. Returns { success, label } or { success: false, reason }.
   */
  async chooseExternalFolder() {
    if (!this.isExternalPickerSupported()) {
      return { success: false, reason: 'not_supported' };
    }
    try {
      const result = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (!result.granted) return { success: false, reason: 'denied' };

      // Derive a short, friendly label from the URI (last path segment,
      // URL-decoded) — falls back to the raw URI if parsing fails.
      let label = 'Custom folder';
      try {
        const decoded = decodeURIComponent(result.directoryUri);
        const lastSegment = decoded.split(/[:/]/).filter(Boolean).pop();
        if (lastSegment) label = lastSegment;
      } catch {}

      await AsyncStorage.setItem(MODE_KEY, 'external');
      await AsyncStorage.setItem(URI_KEY, result.directoryUri);
      await AsyncStorage.setItem(LABEL_KEY, label);

      return { success: true, label };
    } catch (e) {
      return { success: false, reason: 'error', message: e?.message };
    }
  },

  async resetToInternal() {
    await AsyncStorage.setItem(MODE_KEY, 'internal');
    await AsyncStorage.removeItem(URI_KEY);
    await AsyncStorage.removeItem(LABEL_KEY);
  },

  /**
   * Best-effort mirror of an already-downloaded internal file into the
   * user's chosen external folder. Safe to call unconditionally after every
   * download — it's a no-op if mode is 'internal' or unsupported, and any
   * failure here never affects the (already-successful) internal download.
   *
   * @param {string} internalFileUri - file:// path of the already-downloaded file
   * @param {string} fileName        - desired file name in the external folder
   * @param {string} mimeType        - best-guess mime type, '' if unknown
   * @returns {Promise<string|null>} the external content:// URI, or null
   */
  async mirrorToExternalIfConfigured(internalFileUri, fileName, mimeType) {
    if (!this.isExternalPickerSupported()) return null;

    let destUri = null;
    try {
      const mode = await this.getMode();
      if (mode !== 'external') return null;

      const directoryUri = await this.getExternalUri();
      if (!directoryUri) return null;

      const safeMime = mimeType || 'application/octet-stream';
      destUri = await FileSystem.StorageAccessFramework.createFileAsync(
        directoryUri,
        fileName,
        safeMime,
      );

      // copyAsync does NOT reliably write binary content into a SAF
      // content:// destination on every Android version/Expo SDK — it can
      // throw ("directory cannot be created") AFTER createFileAsync has
      // already created an empty placeholder file, leaving a permanent
      // 0-byte file with the right name sitting in the external folder
      // (and since externalUri never got recorded, every future retry
      // creates yet another 0-byte duplicate — "file (1).ext",
      // "file (2).ext", etc). Reading the source as base64 and writing it
      // with StorageAccessFramework.writeAsStringAsync() is the reliable,
      // officially-supported way to put binary content into a SAF URI.
      const base64Content = await FileSystem.readAsStringAsync(internalFileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await FileSystem.StorageAccessFramework.writeAsStringAsync(destUri, base64Content, {
        encoding: FileSystem.EncodingType.Base64,
      });

      return destUri;
    } catch (e) {
      // Folder permission may have been revoked, folder deleted, disk full,
      // etc. The internal download already succeeded, so we fail silently
      // here — the student still has their file, just not mirrored.
      // Clean up any empty placeholder createFileAsync already created —
      // otherwise it sits there forever AND causes duplicate placeholders
      // to pile up on every subsequent retry.
      if (destUri) {
        await FileSystem.StorageAccessFramework.deleteAsync(destUri).catch(() => {});
      }
      console.log('[storageLocationService] mirror failed:', e?.message);
      return null;
    }
  },

  /**
   * deleteExternalMirror(externalUri)
   * ────────────────────────────────────
   * Counterpart to mirrorToExternalIfConfigured(). When a Saved material is
   * removed, the internal copy and the DB record are deleted by
   * downloadManager — but without this, the SAF-mirrored copy in the
   * student's chosen external folder was silently left behind forever,
   * which is exactly the kind of orphaned "still there after Remove"
   * offline copy Rule 4 (Delete Behaviour) exists to prevent. Best-effort:
   * the folder may have been deleted, permission may have been revoked, or
   * the file may already be gone — none of that should block the rest of
   * the (already-successful) delete flow.
   *
   * @param {string} externalUri - content:// URI previously returned by
   *   mirrorToExternalIfConfigured() and stored as fileRepository's
   *   `externalUri`.
   */
  async deleteExternalMirror(externalUri) {
    if (!externalUri) return;
    if (!this.isExternalPickerSupported()) return;
    try {
      await FileSystem.StorageAccessFramework.deleteAsync(externalUri);
    } catch (e) {
      console.log('[storageLocationService] deleteExternalMirror failed (non-fatal):', e?.message);
    }
  },
};

export default storageLocationService;