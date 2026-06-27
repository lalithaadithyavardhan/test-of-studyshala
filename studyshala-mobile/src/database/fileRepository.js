import getDB from './db';

export const fileRepository = {

  async upsert(file) {
    const db = await getDB();
    await db.runAsync(
      `INSERT OR REPLACE INTO files
       (fileId, materialId, name, mimeType, localPath, driveFileId, size, downloaded, lastOpened, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        file.fileId,
        file.materialId,
        file.name,
        file.mimeType,
        file.localPath || null,
        file.driveFileId,
        file.size || 0,
        file.downloaded ? 1 : 0,
        file.lastOpened || null,
        new Date().toISOString(),
      ]
    );
  },

  async getByMaterial(materialId) {
    const db = await getDB();
    return await db.getAllAsync(
      'SELECT * FROM files WHERE materialId = ?',
      [materialId]
    );
  },

  async getById(fileId) {
    const db = await getDB();
    return await db.getFirstAsync(
      'SELECT * FROM files WHERE fileId = ?',
      [fileId]
    );
  },

  async setDownloaded(fileId, localPath) {
    const db = await getDB();
    await db.runAsync(
      'UPDATE files SET downloaded = 1, localPath = ?, updatedAt = ? WHERE fileId = ?',
      [localPath, new Date().toISOString(), fileId]
    );
  },

  async updateLastOpened(fileId) {
    const db = await getDB();
    await db.runAsync(
      'UPDATE files SET lastOpened = ? WHERE fileId = ?',
      [new Date().toISOString(), fileId]
    );
  },

  async getDownloadedByMaterial(materialId) {
    const db = await getDB();
    return await db.getAllAsync(
      'SELECT * FROM files WHERE materialId = ? AND downloaded = 1',
      [materialId]
    );
  },

  async getTotalSize(materialId) {
    const db = await getDB();
    const row = await db.getFirstAsync(
      'SELECT SUM(size) as total FROM files WHERE materialId = ? AND downloaded = 1',
      [materialId]
    );
    return row ? row.total || 0 : 0;
  },

  async deleteByMaterial(materialId) {
    const db = await getDB();
    await db.runAsync('DELETE FROM files WHERE materialId = ?', [materialId]);
  },

  async delete(fileId) {
    const db = await getDB();
    await db.runAsync('DELETE FROM files WHERE fileId = ?', [fileId]);
  },
};
