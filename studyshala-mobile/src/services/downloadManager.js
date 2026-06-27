import * as FileSystem from 'expo-file-system';
import { fileRepository } from '../database/fileRepository';
import { materialRepository } from '../database/materialRepository';

const OFFLINE_DIR = FileSystem.documentDirectory + 'offline/';
const CACHE_DIR = FileSystem.cacheDirectory + 'materials/';

export const downloadManager = {

  async ensureDirectories() {
    const offlineInfo = await FileSystem.getInfoAsync(OFFLINE_DIR);
    if (!offlineInfo.exists) await FileSystem.makeDirectoryAsync(OFFLINE_DIR, { intermediates: true });

    const cacheInfo = await FileSystem.getInfoAsync(CACHE_DIR);
    if (!cacheInfo.exists) await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  },

  // Open — temp cache, auto deletes after X days
  async openFile(file, downloadUrl, onProgress) {
    await this.ensureDirectories();
    const localPath = CACHE_DIR + file.fileId + '_' + file.name;

    const info = await FileSystem.getInfoAsync(localPath);
    if (info.exists) {
      await fileRepository.updateLastOpened(file.fileId);
      return localPath;
    }

    return await this._download(file, downloadUrl, localPath, onProgress);
  },

  // Save Offline — permanent, never auto deletes
  async saveOffline(materialId, files, downloadUrlFn, onProgress) {
    await this.ensureDirectories();
    const materialDir = OFFLINE_DIR + materialId + '/';
    const dirInfo = await FileSystem.getInfoAsync(materialDir);
    if (!dirInfo.exists) await FileSystem.makeDirectoryAsync(materialDir, { intermediates: true });

    for (const file of files) {
      const localPath = materialDir + file.fileId + '_' + file.name;
      const info = await FileSystem.getInfoAsync(localPath);
      if (!info.exists) {
        const url = await downloadUrlFn(file.driveFileId);
        await this._download(file, url, localPath, onProgress);
      }
      await fileRepository.setDownloaded(file.fileId, localPath);
    }

    await materialRepository.setSavedOffline(materialId, true);
    await materialRepository.upsert({ ...await materialRepository.getById(materialId), folderPath: materialDir });
  },

  // Download — to downloads folder, user owns it
  async downloadToDevice(file, downloadUrl) {
    const downloadsDir = FileSystem.documentDirectory + 'downloads/';
    const dirInfo = await FileSystem.getInfoAsync(downloadsDir);
    if (!dirInfo.exists) await FileSystem.makeDirectoryAsync(downloadsDir, { intermediates: true });

    const localPath = downloadsDir + file.name;
    await this._download(file, downloadUrl, localPath, null);
    return localPath;
  },

  // Delta sync — only download changed files
  async syncMaterial(materialId, serverVersion, files, downloadUrlFn, onProgress) {
    const localVersion = await materialRepository.getLocalVersion(materialId);
    if (localVersion === serverVersion) return { synced: false, reason: 'already_latest' };

    const existingFiles = await fileRepository.getByMaterial(materialId);
    const existingIds = new Set(existingFiles.map(f => f.fileId));

    for (const file of files) {
      if (!existingIds.has(file.fileId)) {
        const url = await downloadUrlFn(file.driveFileId);
        const materialDir = OFFLINE_DIR + materialId + '/';
        const localPath = materialDir + file.fileId + '_' + file.name;
        await this._download(file, url, localPath, onProgress);
        await fileRepository.setDownloaded(file.fileId, localPath);
      }
    }

    await materialRepository.updateVersion(materialId, serverVersion);
    return { synced: true };
  },

  async _download(file, url, localPath, onProgress) {
    try {
      const downloadResumable = FileSystem.createDownloadResumable(
        url,
        localPath,
        {},
        (progress) => {
          if (onProgress) {
            const percent = Math.round(
              (progress.totalBytesWritten / progress.totalBytesExpectedToWrite) * 100
            );
            onProgress(file.fileId, percent);
          }
        }
      );

      const result = await downloadResumable.downloadAsync();

      // Verify file exists after download
      const info = await FileSystem.getInfoAsync(result.uri);
      if (!info.exists || info.size === 0) throw new Error('File corrupted or empty');

      await fileRepository.upsert({ ...file, downloaded: true, localPath: result.uri });
      return result.uri;

    } catch (error) {
      // Clean up partial download
      const info = await FileSystem.getInfoAsync(localPath);
      if (info.exists) await FileSystem.deleteAsync(localPath, { idempotent: true });
      throw error;
    }
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
