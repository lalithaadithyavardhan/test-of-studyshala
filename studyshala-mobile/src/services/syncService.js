import { materialRepository } from '../database/materialRepository';
import { downloadManager } from './downloadManager';
import client from '../api/client';
import { API_BASE_URL } from '../config/config';

export const syncService = {

  // Pings YOUR backend's keep-alive endpoint instead of google.com.
  // Pinging Google gives a false "online" reading on networks where Google is
  // reachable but your backend isn't (or a false "offline" reading on
  // networks — e.g. some enterprise/restricted connections — where Google is
  // blocked but your backend is fine). The backend already exposes GET /ping
  // (no DB call, used for Render keep-alive) which is the correct target.
  async isConnected() {
    try {
      const response = await fetch(`${API_BASE_URL}/ping`, { method: 'GET' });
      return response.ok;
    } catch {
      return false;
    }
  },

  async isWifi() {
    return await this.isConnected();
  },

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
      } catch (_) {}
    }

    return updates;
  },

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

  async pollForUpdates() {
    const connected = await this.isConnected();
    if (!connected) return;
    return await this.checkAllForUpdates();
  },
};

export default syncService;
