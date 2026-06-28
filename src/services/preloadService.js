import { storage } from '../database/db';
import { syncService } from './syncService';

const PATTERN_PREFIX = 'preload:';
const MIN_OPENS_FOR_PRELOAD = 3;

export const preloadService = {

  async recordOpen(fileId, materialId) {
    const now = new Date();
    const day = now.toLocaleDateString('en-US', { weekday: 'long' });
    const hour = now.getHours();

    const existing = await storage.get(PATTERN_PREFIX + fileId);

    if (existing) {
      const newCount = (existing.openCount || 0) + 1;
      await storage.set(PATTERN_PREFIX + fileId, {
        ...existing,
        openCount: newCount,
        lastOpenedDay: day,
        lastOpenedHour: hour,
        dayPattern: day,
        preloadEnabled: newCount >= MIN_OPENS_FOR_PRELOAD,
      });
    } else {
      await storage.set(PATTERN_PREFIX + fileId, {
        fileId,
        materialId,
        openCount: 1,
        lastOpenedDay: day,
        lastOpenedHour: hour,
        dayPattern: day,
        preloadEnabled: false,
      });
    }
  },

  async getPreloadCandidates() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDay = tomorrow.toLocaleDateString('en-US', { weekday: 'long' });

    const all = await storage.getAllByPrefix(PATTERN_PREFIX);
    return all.filter(p => p.preloadEnabled && p.dayPattern === tomorrowDay);
  },

  async runPreload(downloadUrlFn) {
    const isWifi = await syncService.isWifi();
    if (!isWifi) return;

    const candidates = await this.getPreloadCandidates();
    for (const candidate of candidates) {
      try {
        const url = await downloadUrlFn(candidate.fileId);
        const { downloadManager } = await import('./downloadManager');
        const file = { fileId: candidate.fileId, name: candidate.fileId };
        await downloadManager.openFile(file, url, null);
      } catch (_) {}
    }
  },
};
