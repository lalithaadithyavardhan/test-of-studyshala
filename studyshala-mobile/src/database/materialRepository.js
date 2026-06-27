import getDB from './db';

export const materialRepository = {

  async upsert(material) {
    const db = await getDB();
    await db.runAsync(
      `INSERT OR REPLACE INTO materials 
       (materialId, subject, facultyName, department, semester, accessCode, version, savedOffline, downloaded, lastOpened, folderPath, totalSize, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        material.materialId,
        material.subject,
        material.facultyName,
        material.department,
        material.semester,
        material.accessCode,
        material.version || 1,
        material.savedOffline ? 1 : 0,
        material.downloaded ? 1 : 0,
        material.lastOpened || null,
        material.folderPath || null,
        material.totalSize || 0,
        material.createdAt || new Date().toISOString(),
        new Date().toISOString(),
      ]
    );
  },

  async getById(materialId) {
    const db = await getDB();
    return await db.getFirstAsync(
      'SELECT * FROM materials WHERE materialId = ?',
      [materialId]
    );
  },

  async getAllSaved() {
    const db = await getDB();
    return await db.getAllAsync(
      'SELECT * FROM materials WHERE savedOffline = 1 ORDER BY lastOpened DESC'
    );
  },

  async updateVersion(materialId, version) {
    const db = await getDB();
    await db.runAsync(
      'UPDATE materials SET version = ?, updatedAt = ? WHERE materialId = ?',
      [version, new Date().toISOString(), materialId]
    );
  },

  async updateLastOpened(materialId) {
    const db = await getDB();
    await db.runAsync(
      'UPDATE materials SET lastOpened = ? WHERE materialId = ?',
      [new Date().toISOString(), materialId]
    );
  },

  async setSavedOffline(materialId, saved) {
    const db = await getDB();
    await db.runAsync(
      'UPDATE materials SET savedOffline = ?, updatedAt = ? WHERE materialId = ?',
      [saved ? 1 : 0, new Date().toISOString(), materialId]
    );
  },

  async getLocalVersion(materialId) {
    const db = await getDB();
    const row = await db.getFirstAsync(
      'SELECT version FROM materials WHERE materialId = ?',
      [materialId]
    );
    return row ? row.version : null;
  },

  async getExpiredCache(days) {
    const db = await getDB();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return await db.getAllAsync(
      `SELECT * FROM materials WHERE savedOffline = 0 AND lastOpened < ?`,
      [cutoff.toISOString()]
    );
  },

  async delete(materialId) {
    const db = await getDB();
    await db.runAsync('DELETE FROM materials WHERE materialId = ?', [materialId]);
  },
};
