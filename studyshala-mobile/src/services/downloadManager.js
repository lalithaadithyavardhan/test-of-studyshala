import * as FileSystem from 'expo-file-system';
import { fileRepository } from '../database/fileRepository';
import { materialRepository } from '../database/materialRepository';
import { downloadOrReuseFile, ensureDir } from './fileDownloader';

const OFFLINE_DIR = FileSystem.documentDirectory + 'StudyShala/Downloads/';
const CACHE_DIR = FileSystem.cacheDirectory + 'StudyShala/Cache/';

export const downloadManager = {

  async ensureDirectories() {
    await ensureDir(OFFLINE_DIR);
    await ensureDir(CACHE_DIR);
  },

  async openFile(file, downloadUrl, onProgress) {
    await this.ensureDirectories();

    // Check cache size limit before downloading — but only if we don't already
    // have a reusable copy on disk (downloadOrReuseFile will skip the network
    // call entirely in that case, so the size limit shouldn't block it).
    const { cacheManager } = await import('./cacheManager');
    const maxMB = await cacheManager.getMaxCacheSize();
    const cacheSize = await cacheManager.getCacheSize();
    const maxBytes = maxMB * 1024 * 1024;

    const fileId = file.fileId || file._id;
    const existing = fileId ? await fileRepository.getById(fileId) : null;
    const alreadyCached = existing?.localPath
      ? (await FileSystem.getInfoAsync(existing.localPath).catch(() => ({}))).exists
      : false;

    if (!alreadyCached && cacheSize >= maxBytes) {
      throw new Error(`Cache full. Maximum cache size is ${maxMB} MB. Clear cache or increase limit in Storage Settings.`);
    }

    return await downloadOrReuseFile({ ...file, downloadUrl }, CACHE_DIR, onProgress);
  },

  async saveOffline(materialId, files, downloadUrlFn, onProgress) {
    await this.ensureDirectories();
    const materialDir = OFFLINE_DIR + materialId + '/';
    await ensureDir(materialDir);

    for (const file of files) {
      const url = await downloadUrlFn(file.driveFileId);
      // downloadOrReuseFile will reuse an existing Cache-dir copy (e.g. from a
      // previous preview) instead of re-downloading it into Downloads.
      await downloadOrReuseFile({ ...file, materialId, downloadUrl: url }, materialDir, onProgress);
    }

    await materialRepository.setSavedOffline(materialId, true);
    const existing = await materialRepository.getById(materialId);
    if (existing) {
      await materialRepository.upsert({ ...existing, folderPath: materialDir });
    }
  },

  async downloadToDevice(file, downloadUrl) {
    await ensureDir(OFFLINE_DIR);
    return await downloadOrReuseFile({ ...file, downloadUrl }, OFFLINE_DIR, null);
  },

  async syncMaterial(materialId, serverVersion, files, downloadUrlFn, onProgress) {
    const localVersion = await materialRepository.getLocalVersion(materialId);
    if (localVersion === serverVersion) return { synced: false, reason: 'already_latest' };

    const existingFiles = await fileRepository.getByMaterial(materialId);
    const existingIds = new Set(existingFiles.map(f => f.fileId));
    const materialDir = OFFLINE_DIR + materialId + '/';

    for (const file of files) {
      if (!existingIds.has(file.fileId)) {
        const url = await downloadUrlFn(file.driveFileId);
        await downloadOrReuseFile({ ...file, materialId, downloadUrl: url }, materialDir, onProgress);
      }
    }

    await materialRepository.updateVersion(materialId, serverVersion);
    return { synced: true };
  },

  async deleteOfflineMaterial(materialId) {
    const materialDir = OFFLINE_DIR + materialId + '/';
    const info = await FileSystem.getInfoAsync(materialDir);
    if (info.exists) await FileSystem.deleteAsync(materialDir, { idempotent: true });
    await fileRepository.deleteByMaterial(materialId);
    await materialRepository.setSavedOffline(materialId, false);
  },

  async getStorageStats() {
    const offlineInfo = await FileSystem.getInfoAsync(OFFLINE_DIR, { size: true });
    const cacheInfo = await FileSystem.getInfoAsync(CACHE_DIR, { size: true });
    const deviceInfo = await FileSystem.getFreeDiskStorageAsync();

    return {
      offlineSize: offlineInfo.size || 0,
      cacheSize: cacheInfo.size || 0,
      freeStorage: deviceInfo,
    };
  },

  async getForecast(files) {
    const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0);
    const free = await FileSystem.getFreeDiskStorageAsync();
    return {
      requiredSize: totalSize,
      freeStorage: free,
      willFit: totalSize < free,
      percentUsed: Math.round((totalSize / free) * 100),
    };
  },
};

export default downloadManager;
