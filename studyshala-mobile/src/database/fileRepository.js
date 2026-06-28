import { storage } from './db';

const PREFIX = 'file:';
const MAT_FILES_PREFIX = 'matfiles:';

export const fileRepository = {

  async upsert(file) {
    const existing = await this.getById(file.fileId) || {};
    const updated = {
      ...existing,
      ...file,
      updatedAt: new Date().toISOString(),
    };
    await storage.set(PREFIX + file.fileId, updated);

    // Track file under materialId for quick lookup
    const matFiles = await storage.get(MAT_FILES_PREFIX + file.materialId) || [];
    if (!matFiles.includes(file.fileId)) {
      matFiles.push(file.fileId);
      await storage.set(MAT_FILES_PREFIX + file.materialId, matFiles);
    }
  },

  async getById(fileId) {
    return await storage.get(PREFIX + fileId);
  },

  async getByMaterial(materialId) {
    const fileIds = await storage.get(MAT_FILES_PREFIX + materialId) || [];
    const files = await Promise.all(fileIds.map(id => storage.get(PREFIX + id)));
    return files.filter(Boolean);
  },

  async setDownloaded(fileId, localPath) {
    const f = await this.getById(fileId);
    if (f) await storage.set(PREFIX + fileId, { ...f, downloaded: true, localPath, updatedAt: new Date().toISOString() });
  },

  async updateLastOpened(fileId) {
    const f = await this.getById(fileId);
    if (f) await storage.set(PREFIX + fileId, { ...f, lastOpened: new Date().toISOString() });
  },

  async getDownloadedByMaterial(materialId) {
    const files = await this.getByMaterial(materialId);
    return files.filter(f => f.downloaded);
  },

  async getTotalSize(materialId) {
    const files = await this.getDownloadedByMaterial(materialId);
    return files.reduce((sum, f) => sum + (f.size || 0), 0);
  },

  async deleteByMaterial(materialId) {
    const fileIds = await storage.get(MAT_FILES_PREFIX + materialId) || [];
    for (const id of fileIds) await storage.delete(PREFIX + id);
    await storage.delete(MAT_FILES_PREFIX + materialId);
  },

  async delete(fileId) {
    const f = await this.getById(fileId);
    if (f?.materialId) {
      const matFiles = await storage.get(MAT_FILES_PREFIX + f.materialId) || [];
      await storage.set(MAT_FILES_PREFIX + f.materialId, matFiles.filter(id => id !== fileId));
    }
    await storage.delete(PREFIX + fileId);
  },
};
