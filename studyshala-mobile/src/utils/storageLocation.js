/**
 * utils/storageLocation.js
 * ===========================
 * Lets the student see — and, on Android, optionally change — where NEW
 * downloaded files get saved. Changing the folder never touches files
 * already downloaded; only new downloads (and re-downloads of a file
 * that's gone missing) go to the newly chosen folder from that point on.
 *
 * This is a single DEVICE-WIDE setting, not per-account — downloaded file
 * bytes are already a shared pool across accounts on this device (see
 * accountScope.js for why), so the folder they live in is a device-level
 * choice too, not a personal one.
 *
 * Android only. iOS does not give apps this kind of open-ended "pick any
 * folder and remember it" access the way Android's Storage Access
 * Framework does — on iOS this always reports { type: 'default' } and
 * pickCustomFolder() is a no-op.
 */
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { storage } from '../database/db';

const SETTINGS_KEY = 'settings:storageLocation';

/** { type: 'default' } | { type: 'custom', treeUri, label } */
export const getStorageLocation = async () => {
  const saved = await storage.get(SETTINGS_KEY);
  return saved || { type: 'default' };
};

export const isCustomFolderSupported = () => Platform.OS === 'android';

/**
 * Opens Android's native folder picker (Storage Access Framework).
 * Resolves to the chosen location, or null if the user cancelled, this
 * isn't Android, or something went wrong.
 */
export const pickCustomFolder = async () => {
  if (!isCustomFolderSupported()) return null;
  try {
    const result = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (!result.granted) return null;

    let label = 'Selected folder';
    try {
      const lastSegment = decodeURIComponent(result.directoryUri.split('/').pop() || '');
      if (lastSegment) label = lastSegment.replace(/^primary:/, '');
    } catch {}

    const location = { type: 'custom', treeUri: result.directoryUri, label };
    await storage.set(SETTINGS_KEY, location);
    return location;
  } catch (e) {
    console.log('[storageLocation] pickCustomFolder failed:', e?.message);
    return null;
  }
};

/**
 * Reverts new downloads to the app's own private default storage.
 * Files already saved in a previously-chosen custom folder are untouched
 * and keep working from there — only future downloads are affected.
 */
export const resetToDefaultFolder = async () => {
  await storage.set(SETTINGS_KEY, { type: 'default' });
};

export default { getStorageLocation, isCustomFolderSupported, pickCustomFolder, resetToDefaultFolder };