/**
 * utils/fileRepository.js
 * ========================
 * The single source of truth for "is this file available offline, and
 * where is it on disk". Everything that needs to open or save a file goes
 * through here instead of touching FileSystem/AsyncStorage directly.
 *
 * Local record shape (stored under `file:<fileId>`):
 *   {
 *     fileId, materialId, name, mimeType,
 *     expectedSize,      // size reported by the server, if known
 *     localUri,          // file:// path on disk, or null
 *     status,            // 'complete' | 'downloading' | 'failed' | 'missing'
 *     downloadedAt,      // ISO timestamp of last successful download
 *   }
 *
 * A record's `status === 'complete'` is NOT trusted blindly — callers
 * should use isAvailableOffline() / getUsableLocalUri(), which re-verify
 * the file still exists on disk (see migrations.js for the equivalent
 * app-start sweep).
 */
import * as FileSystem from 'expo-file-system';
import * as Network from 'expo-network';
import { storage } from '../database/db';

const FILES_DIR = `${FileSystem.documentDirectory}studyshala_files/`;

const ensureDir = async () => {
  const info = await FileSystem.getInfoAsync(FILES_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(FILES_DIR, { intermediates: true });
  }
};

const safeName = (name = 'file') => name.replace(/[^\w.\-() ]/g, '_');

const recordKey = (fileId) => `file:${fileId}`;

export const isOnline = async () => {
  try {
    const state = await Network.getNetworkStateAsync();
    return !!(state.isConnected && state.isInternetReachable !== false);
  } catch {
    // If we can't tell, assume online rather than blocking the user.
    return true;
  }
};

export const getFileRecord = (fileId) => storage.get(recordKey(fileId));

/**
 * Verifies a record's local copy actually exists and is non-empty.
 * Returns the usable local URI, or null if not truly available offline.
 * Self-heals the stored record if it finds the file has gone missing.
 */
export const getUsableLocalUri = async (fileId) => {
  const record = await getFileRecord(fileId);
  if (!record || record.status !== 'complete' || !record.localUri) return null;

  try {
    const info = await FileSystem.getInfoAsync(record.localUri);
    if (info.exists && info.size > 0) {
      return record.localUri;
    }
  } catch {
    // fall through to "missing"
  }

  await storage.set(recordKey(fileId), { ...record, status: 'missing', localUri: null });
  return null;
};

export const isAvailableOffline = async (fileId) => !!(await getUsableLocalUri(fileId));

/**
 * Downloads a file to local storage. Reports progress via onProgress(0-1).
 * Safe to call again on a failed/partial record — it just retries.
 */
export const saveFileOffline = async (file, material, onProgress) => {
  if (!file?.downloadUrl) {
    throw new Error('This file has no download link.');
  }

  await ensureDir();
  const fileId = file._id || file.fileId;
  const target = `${FILES_DIR}${fileId}_${safeName(file.name || file.fileName)}`;

  await storage.set(recordKey(fileId), {
    fileId,
    materialId: material?._id || file.materialId || null,
    name: file.name || file.fileName,
    mimeType: file.mimeType,
    expectedSize: file.size || null,
    localUri: null,
    status: 'downloading',
    downloadedAt: null,
  });

  try {
    const downloadResumable = FileSystem.createDownloadResumable(
      file.downloadUrl,
      target,
      {},
      (progress) => {
        if (onProgress && progress.totalBytesExpectedToWrite > 0) {
          onProgress(progress.totalBytesWritten / progress.totalBytesExpectedToWrite);
        }
      }
    );

    const result = await downloadResumable.downloadAsync();
    if (!result?.uri) throw new Error('Download did not complete.');

    const info = await FileSystem.getInfoAsync(result.uri);
    if (!info.exists || info.size === 0) {
      throw new Error('Downloaded file is empty.');
    }

    const record = {
      fileId,
      materialId: material?._id || file.materialId || null,
      name: file.name || file.fileName,
      mimeType: file.mimeType,
      expectedSize: info.size,
      localUri: result.uri,
      status: 'complete',
      downloadedAt: new Date().toISOString(),
    };
    await storage.set(recordKey(fileId), record);
    return record;
  } catch (err) {
    await storage.set(recordKey(fileId), {
      fileId,
      materialId: material?._id || file.materialId || null,
      name: file.name || file.fileName,
      mimeType: file.mimeType,
      expectedSize: file.size || null,
      localUri: null,
      status: 'failed',
      downloadedAt: null,
    });
    throw err;
  }
};

export const removeFileOffline = async (fileId) => {
  const record = await getFileRecord(fileId);
  if (record?.localUri) {
    try {
      await FileSystem.deleteAsync(record.localUri, { idempotent: true });
    } catch {
      // ignore — we're deleting the record either way
    }
  }
  await storage.delete(recordKey(fileId));
};

/** All files currently saved (complete) offline, most recent first. */
export const getAllOfflineFiles = async () => {
  const all = await storage.getAllByPrefix('file:');
  return all
    .filter((r) => r && r.status === 'complete')
    .sort((a, b) => new Date(b.downloadedAt || 0) - new Date(a.downloadedAt || 0));
};

export default {
  isOnline,
  getFileRecord,
  getUsableLocalUri,
  isAvailableOffline,
  saveFileOffline,
  removeFileOffline,
  getAllOfflineFiles,
};