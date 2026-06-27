import getDB from '../database/db';
import { syncService } from './syncService';

const MIN_OPENS_FOR_PRELOAD = 3;

export const preloadService = {

  async recordOpen(fileId, materialId) {
    const db = await getDB();
    const now = new Date();
    const day = now.toLocaleDateString('en-US', { weekday: 'long' });
    const hour = now.getHours();

    const existing = await db.getFirstAsync(
      'SELECT * FROM preload_patterns WHERE fileId = ?',
      [fileId]
    );

    if (existing) {
      await db.runAsync(
        `UPDATE preload_patterns SET openCount = openCount + 1, lastOpenedDay = ?, lastOpenedHour = ?, dayPattern = ?
         WHERE fileId = ?`,
        [day, hour, day, fileId]
      );

      // Enable preload after MIN_OPENS_FOR_PRELOAD
      if (existing.openCount + 1 >= MIN_OPENS_FOR_PRELOAD) {
        await db.runAsync(
          'UPDATE preload_patterns SET preloadEnabled = 1 WHERE fileId = ?',
          [fileId]
        );
      }
    } else {
      await db.runAsync(
        `INSERT INTO preload_patterns (fileId, materialId, openCount, lastOpenedDay, lastOpenedHour, dayPattern, preloadEnabled)
         VALUES (?, ?, 1, ?, ?, ?, 0)`,
        [fileId, materialId, day, hour, day]
      );
    }
  },

  async getPreloadCandidates() {
    const db = await getDB();
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDay = tomorrow.toLocaleDateString('en-US', { weekday: 'long' });

    // Get files that are usually opened tomorrow
    return await db.getAllAsync(
      `SELECT * FROM preload_patterns 
       WHERE preloadEnabled = 1 AND dayPattern = ?`,
      [tomorrowDay]
    );
  },

  async runPreload(downloadUrlFn) {
    const isWifi = await syncService.isWifi();
    if (!isWifi) return; // WiFi only

    const candidates = await this.getPreloadCandidates();
    for (const candidate of candidates) {
      try {
        const url = await downloadUrlFn(candidate.fileId);
        const { downloadManager } = await import('./downloadManager');
        const file = { fileId: candidate.fileId, name: candidate.fileId };
        await downloadManager.openFile(file, url, null);
      } catch (err) {
        // Silent fail
      }
    }
  },
};
