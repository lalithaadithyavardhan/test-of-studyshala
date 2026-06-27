import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { materialRepository } from '../database/materialRepository';
import { fileRepository } from '../database/fileRepository';

const CACHE_DIR = FileSystem.cacheDirectory + 'materials/';
const CACHE_DAYS_KEY = 'cache_expiry_days';
const DEFAULT_CACHE_DAYS = 60;

export const cacheManager = {

  async getCacheDays() {
    const val = await AsyncStorage.getItem(CACHE_DAYS_KEY);
    return val ? parseInt(val) : DEFAULT_CACHE_DAYS;
  },

  async setCacheDays(days) {
    await AsyncStorage.setItem(CACHE_DAYS_KEY, String(days));
  },

  // Run on app open — clean expired cache
  async runCleanup() {
    const days = await this.getCacheDays();
    if (days === -1) return; // "Never" option

    const expired = await materialRepository.getExpiredCache(days);
    for (const material of expired) {
      await this._deleteCachedFiles(material.materialId);
      await materialRepository.delete(material.materialId);
    }
  },

  // Check materials expiring soon (within 5 days) for warning notification
  async getExpiringSoon() {
    const days = await this.getCacheDays();
    if (days === -1) return [];

    const warnAt = days - 5;
    const db = await (await import('./db')).default();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - warnAt);

    return await materialRepository.getExpiredCache(warnAt);
  },

  async _deleteCachedFiles(materialId) {
    const files = await fileRepository.getByMaterial(materialId);
    for (const file of files) {
      if (file.localPath) {
        const info = await FileSystem.getInfoAsync(file.localPath);
        if (info.exists) {
          await FileSystem.deleteAsync(file.localPath, { idempotent: true });
        }
      }
    }
    await fileRepository.deleteByMaterial(materialId);
  },

  async clearAllCache() {
    const info = await FileSystem.getInfoAsync(CACHE_DIR);
    if (info.exists) {
      await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
      await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
    }
  },

  async getCacheSize() {
    const info = await FileSystem.getInfoAsync(CACHE_DIR, { size: true });
    return info.size || 0;
  },
};
