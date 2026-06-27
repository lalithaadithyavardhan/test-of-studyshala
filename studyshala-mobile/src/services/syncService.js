import NetInfo from '@react-native-community/netinfo';
import { materialRepository } from '../database/materialRepository';
import { downloadManager } from './downloadManager';
import client from '../api/client';

export const syncService = {

  async isConnected() {
    const state = await NetInfo.fetch();
    return state.isConnected;
  },

  async isWifi() {
    const state = await NetInfo.fetch();
    return state.type === 'wifi';
  },

  // Called on app open — check all saved materials for updates
  async checkAllForUpdates() {
    const connected = await this.isConnected();
    if (!connected) return [];

    const savedMaterials = await materialRepository.getAllSaved();
    const updates = [];

    for (const material of savedMaterials) {
      try {
        const response = await client.get(`/student/material-version/${material.materialId}`);
        const { version, hasUpdate } = response.data;

        if (hasUpdate) {
          updates.push({
            materialId: material.materialId,
            subject: material.subject,
            serverVersion: version,
            localVersion: material.version,
          });
        }
      } catch (err) {
        // Silent fail — will retry next time
      }
    }

    return updates;
  },

  // Sync a specific material
  async syncMaterial(materialId, downloadUrlFn, onProgress) {
    const connected = await this.isConnected();
    if (!connected) return { success: false, reason: 'no_internet' };

    try {
      const response = await client.get(`/student/material-version/${materialId}`);
      const { version, files } = response.data;

      const result = await downloadManager.syncMaterial(
        materialId,
        version,
        files,
        downloadUrlFn,
        onProgress
      );

      return { success: true, ...result };
    } catch (err) {
      return { success: false, reason: err.message };
    }
  },

  // Polling fallback — check for updates every few hours
  async pollForUpdates() {
    const connected = await this.isConnected();
    if (!connected) return;

    return await this.checkAllForUpdates();
  },
};
