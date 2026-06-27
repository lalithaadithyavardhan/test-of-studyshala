import getDB from '../database/db';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export const sessionTracker = {

  _activeSessions: {},

  async startSession(fileId, materialId) {
    const sessionId = uuidv4();
    this._activeSessions[fileId] = {
      sessionId,
      fileId,
      materialId,
      startTime: new Date().toISOString(),
      lastPage: 1,
    };
    return sessionId;
  },

  updatePage(fileId, page) {
    if (this._activeSessions[fileId]) {
      this._activeSessions[fileId].lastPage = page;
    }
  },

  async endSession(fileId, totalPages) {
    const session = this._activeSessions[fileId];
    if (!session) return;

    const endTime = new Date();
    const startTime = new Date(session.startTime);
    const totalMinutes = Math.round((endTime - startTime) / 60000);

    const db = await getDB();
    await db.runAsync(
      `INSERT INTO study_sessions (sessionId, fileId, materialId, startTime, endTime, totalMinutes, lastPage, totalPages, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        session.sessionId,
        session.fileId,
        session.materialId,
        session.startTime,
        endTime.toISOString(),
        totalMinutes,
        session.lastPage,
        totalPages || 0,
        new Date().toISOString(),
      ]
    );

    // Save last page for resume reading
    await this.saveLastPage(fileId, session.lastPage);
    delete this._activeSessions[fileId];
  },

  async saveLastPage(fileId, page) {
    const db = await getDB();
    await db.runAsync(
      'UPDATE files SET lastOpened = ? WHERE fileId = ?',
      [new Date().toISOString(), fileId]
    );
    // Store last page in a simple key
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.setItem(`lastPage_${fileId}`, String(page));
  },

  async getLastPage(fileId) {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const page = await AsyncStorage.getItem(`lastPage_${fileId}`);
    return page ? parseInt(page) : 1;
  },

  async getWeeklyStats() {
    const db = await getDB();
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const rows = await db.getAllAsync(
      `SELECT SUM(totalMinutes) as totalMinutes, COUNT(*) as sessions
       FROM study_sessions WHERE createdAt > ?`,
      [weekAgo.toISOString()]
    );

    return rows[0] || { totalMinutes: 0, sessions: 0 };
  },

  async getMaterialStats(materialId) {
    const db = await getDB();
    return await db.getAllAsync(
      `SELECT fileId, SUM(totalMinutes) as totalMinutes, MAX(lastPage) as furthestPage
       FROM study_sessions WHERE materialId = ? GROUP BY fileId`,
      [materialId]
    );
  },
};
