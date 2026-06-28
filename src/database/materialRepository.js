import { storage } from './db';

const PREFIX = 'material:';

export const materialRepository = {

  async upsert(material) {
    const existing = await this.getById(material.materialId) || {};
    await storage.set(PREFIX + material.materialId, {
      ...existing,
      ...material,
      updatedAt: new Date().toISOString(),
      createdAt: existing.createdAt || new Date().toISOString(),
    });
  },

  async getById(materialId) {
    return await storage.get(PREFIX + materialId);
  },

  async getAllSaved() {
    const all = await storage.getAllByPrefix(PREFIX);
    return all
      .filter(m => m.savedOffline)
      .sort((a, b) => new Date(b.lastOpened || 0) - new Date(a.lastOpened || 0));
  },

  async updateVersion(materialId, version) {
    const m = await this.getById(materialId);
    if (m) await storage.set(PREFIX + materialId, { ...m, version, updatedAt: new Date().toISOString() });
  },

  async updateLastOpened(materialId) {
    const m = await this.getById(materialId);
    if (m) await storage.set(PREFIX + materialId, { ...m, lastOpened: new Date().toISOString() });
  },

  async setSavedOffline(materialId, saved) {
    const m = await this.getById(materialId);
    if (m) await storage.set(PREFIX + materialId, { ...m, savedOffline: saved, updatedAt: new Date().toISOString() });
  },

  async getLocalVersion(materialId) {
    const m = await this.getById(materialId);
    return m ? m.version : null;
  },

  async getExpiredCache(days) {
    const all = await storage.getAllByPrefix(PREFIX);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return all.filter(m => !m.savedOffline && m.lastOpened && new Date(m.lastOpened) < cutoff);
  },

  async delete(materialId) {
    await storage.delete(PREFIX + materialId);
  },
};
