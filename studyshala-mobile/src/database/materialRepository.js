/**
 * database/materialRepository.js — StudyShala
 * ==============================================
 * savedOffline: true is permanent — there is no expiry, no eviction. A
 * material stays saved until the student explicitly removes it (which
 * deletes its files via downloadManager.deleteSavedMaterial()).
 */
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

  // ── getAllSaved ───────────────────────────────────────────────────────────
  // The Saved Materials screen's single data source — every material the
  // student has permanently downloaded, most recently opened first.
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

  async delete(materialId) {
    await storage.delete(PREFIX + materialId);
  },
};

export default materialRepository;