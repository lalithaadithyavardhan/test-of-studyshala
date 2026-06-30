import { storage } from './db';

const PREFIX = 'file:';
const MAT_FILES_PREFIX = 'matfiles:';

export const fileRepository = {

  async upsert(file) {
    const existing = await this.getById(file.fileId) || {};
    await storage.set(PREFIX + file.fileId, {
      ...existing,
      ...file,
      updatedAt: new Date().toISOString(),
    });

    // Track file under materialId for quick lookup
    if (file.materialId) {
      const matFiles = await storage.get(MAT_FILES_PREFIX + file.materialId) || [];
      if (!matFiles.includes(file.fileId)) {
        matFiles.push(file.fileId);
        await storage.set(MAT_FILES_PREFIX + file.materialId, matFiles);
      }
    }
  },

  async getById(fileId) {
    return await storage.get(PREFIX + fileId);
  },

  // ── getAll ────────────────────────────────────────────────────────────────
  // Returns every stored file record, regardless of material. Used by
  // DownloadsScreen to group real downloads by subject without needing a
  // separate per-material query.
  async getAll() {
    return await storage.getAllByPrefix(PREFIX);
  },

  async getByMaterial(materialId) {
    const fileIds = await storage.get(MAT_FILES_PREFIX + materialId) || [];
    const files = await Promise.all(fileIds.map(id => storage.get(PREFIX + id)));
    return files.filter(Boolean);
  },

  async setDownloaded(fileId, localPath) {
    const f = await this.getById(fileId);
    if (f) {
      await storage.set(PREFIX + fileId, {
        ...f,
        downloaded: !!localPath,
        localPath,
        updatedAt: new Date().toISOString(),
      });
    }
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

  // ── getExpiredFiles ────────────────────────────────────────────────────────
  // Returns all individually-cached files (e.g. starred files not part of a
  // saved material) whose cachedAt is older than `days` days.
  //
  // IMPORTANT: storage.getAllByPrefix() returns an array of ALREADY-PARSED
  // plain objects — NOT {key, value} pairs. Each `file` below IS the stored
  // record itself; never access `.value` or re-JSON.parse it.
  //
  // Rules:
  //  - Expiry counts from cachedAt (set once on first cache, never reset on re-open).
  //  - Only evicts files where the parent material is NOT savedOffline (permanent).
  //  - Days = -1 means "Never expire" → returns empty array.
  //
  // Called by offlineSyncService.evictExpiredCache() and cacheManager.runCleanup().
  async getExpiredFiles(days) {
    if (days === -1) return []; // Never expire setting

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const allFiles = await storage.getAllByPrefix(PREFIX);
    if (!allFiles || !allFiles.length) return [];

    const expired = [];
    for (const file of allFiles) {
      try {
        if (!file || typeof file !== 'object') continue;

        // Only consider files that have a cachedAt timestamp and are marked downloaded
        if (!file.cachedAt || !file.downloaded) continue;

        const cachedDate = new Date(file.cachedAt);
        if (isNaN(cachedDate)) continue;

        if (cachedDate < cutoff) {
          expired.push(file);
        }
      } catch {
        // Corrupt entry — skip silently
      }
    }

    return expired;
  },
};

export default fileRepository;