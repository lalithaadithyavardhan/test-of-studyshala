/**
 * database/migrations.js
 * =======================
 * Runs once on every app start (see App.js).
 *
 * Two jobs:
 *  1. Schema version bookkeeping — a hook for future breaking changes to
 *     the local storage shape (bump SCHEMA_VERSION and add a branch below
 *     when that day comes).
 *  2. Self-healing the offline file cache — the on-disk file a `file:*`
 *     record points to can vanish for reasons totally outside our control
 *     (OS storage pressure clearing the document directory, user clearing
 *     app storage, reinstall, etc). If we trusted the DB record alone,
 *     "downloaded" files would silently 404 when opened offline. So on
 *     every launch we check that every file we *think* is saved is
 *     actually still sitting on disk, and correct the record if not.
 */
import * as FileSystem from 'expo-file-system';
import { storage } from './db';

const SCHEMA_VERSION = 1;
const SCHEMA_KEY = 'meta:schemaVersion';

async function healFileRecords() {
  const records = await storage.getAllEntriesByPrefix('file:');
  for (const { key, value: record } of records) {
    if (!record) continue;
    if (record.status !== 'complete' || !record.localUri) continue;

    try {
      const info = await FileSystem.getInfoAsync(record.localUri);
      if (!info.exists || info.size === 0) {
        // File is gone or empty — mark it back to "not downloaded" instead
        // of leaving a stale "complete" record that would fail offline.
        await storage.set(key, { ...record, status: 'missing', localUri: null });
      }
    } catch {
      // If we can't even check, err on the side of caution.
      await storage.set(key, { ...record, status: 'missing', localUri: null });
    }
  }
}

export async function runMigrations() {
  const current = (await storage.get(SCHEMA_KEY)) || 0;

  if (current < SCHEMA_VERSION) {
    // Future per-version migration branches go here, e.g.:
    // if (current < 2) { ...move/rename keys... }
    await storage.set(SCHEMA_KEY, SCHEMA_VERSION);
  }

  await healFileRecords();
}

export default runMigrations;