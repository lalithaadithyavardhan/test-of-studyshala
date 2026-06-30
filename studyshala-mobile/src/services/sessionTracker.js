import AsyncStorage from '@react-native-async-storage/async-storage';
import { storage } from '../database/db';

const SESSION_PREFIX = 'session:';
const ACTIVE_PREFIX = 'session:active:';
const uuidv4 = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

export const sessionTracker = {

  _activeSessions: {},

  async startSession(fileId, materialId) {
    const sessionId = uuidv4();
    const sessionData = {
      sessionId,
      fileId,
      materialId,
      startTime: new Date().toISOString(),
      lastPage: 1,
    };
    this._activeSessions[fileId] = sessionData;

    // Persist immediately so a crash/kill mid-session doesn't lose the start
    // time entirely. Stored under a separate "active:" key (not createdAt) so
    // getWeeklyStats()/getMaterialStats() — which filter on createdAt — don't
    // count an unfinished session as a completed one.
    try {
      await storage.set(ACTIVE_PREFIX + sessionId, sessionData);
    } catch {}

    return sessionId;
  },

  updatePage(fileId, page) {
    if (this._activeSessions[fileId]) {
      this._activeSessions[fileId].lastPage = page;
      // Best-effort persist of progress too, so a crash mid-read still keeps
      // the furthest page reached.
      storage.set(ACTIVE_PREFIX + this._activeSessions[fileId].sessionId, this._activeSessions[fileId]).catch(() => {});
    }
  },

  async endSession(fileId, totalPages) {
    const session = this._activeSessions[fileId];
    if (!session) return;

    const endTime = new Date();
    const startTime = new Date(session.startTime);
    const totalMinutes = Math.round((endTime - startTime) / 60000);

    const sessionData = {
      sessionId: session.sessionId,
      fileId: session.fileId,
      materialId: session.materialId,
      startTime: session.startTime,
      endTime: endTime.toISOString(),
      totalMinutes,
      lastPage: session.lastPage,
      totalPages: totalPages || 0,
      createdAt: new Date().toISOString(),
    };

    await storage.set(SESSION_PREFIX + session.sessionId, sessionData);
    await storage.delete(ACTIVE_PREFIX + session.sessionId);
    await this.saveLastPage(fileId, session.lastPage);
    delete this._activeSessions[fileId];
  },

  async saveLastPage(fileId, page) {
    await AsyncStorage.setItem(`lastPage_${fileId}`, String(page));
  },

  async getLastPage(fileId) {
    const page = await AsyncStorage.getItem(`lastPage_${fileId}`);
    return page ? parseInt(page) : 1;
  },

  async getWeeklyStats() {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const sessions = await storage.getAllByPrefix(SESSION_PREFIX);
    // Only count completed sessions (have createdAt) — active: entries don't,
    // so they're naturally excluded here.
    const recent = sessions.filter(s => s.createdAt && new Date(s.createdAt) > weekAgo);
    const totalMinutes = recent.reduce((sum, s) => sum + (s.totalMinutes || 0), 0);
    return { totalMinutes, sessions: recent.length };
  },

  async getMaterialStats(materialId) {
    const sessions = await storage.getAllByPrefix(SESSION_PREFIX);
    const matSessions = sessions.filter(s => s.createdAt && s.materialId === materialId);
    const byFile = {};
    for (const s of matSessions) {
      if (!byFile[s.fileId]) byFile[s.fileId] = { fileId: s.fileId, totalMinutes: 0, furthestPage: 0 };
      byFile[s.fileId].totalMinutes += s.totalMinutes || 0;
      byFile[s.fileId].furthestPage = Math.max(byFile[s.fileId].furthestPage, s.lastPage || 0);
    }
    return Object.values(byFile);
  },
};

export default sessionTracker;
