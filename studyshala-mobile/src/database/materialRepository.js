/**
 * database/materialRepository.js — StudyShala
 * ==============================================
 * State machine (Phase 3)
 * ------------------------
 * Every material now carries a persisted `state`, one of MATERIAL_STATE:
 *
 *   NOT_SAVED   → never saved, or fully removed via downloadManager's
 *                 deleteSavedMaterial().
 *   DOWNLOADING → a save is in progress. If the app is killed here, this
 *                 record survives and downloadManager.runAutoSync() resumes
 *                 it automatically on next launch or next connectivity
 *                 regain — that's what makes downloads interruption-safe.
 *   SAVED       → every file confirmed downloaded; guaranteed to open
 *                 offline.
 *   SYNCING     → a background version/file-diff check is in progress for
 *                 an already-saved material.
 *   FAILED      → a download or sync attempt didn't finish; retried on the
 *                 next runAutoSync() pass.
 *
 * `state` is the authoritative field going forward. `savedOffline` is kept
 * only so any not-yet-migrated caller keeps working — it always mirrors
 * `state === SAVED` and should be treated as read-only/derived from here on.
 *
 * `state` is the ONLY thing downloadManager should ever write directly via
 * setState()/setSavedOffline() — nothing else in the app should flip it.
 *
 * Records written before this migration won't have a `state` field at all.
 * getEffectiveState() derives one on every read so nothing crashes or
 * silently forgets a previously-saved material on upgrade — no migration
 * script needed, consistent with this app's "AsyncStorage has no schema"
 * approach (see migrations.js).
 */
import { storage } from './db';

const PREFIX = 'material:';

export const MATERIAL_STATE = {
  NOT_SAVED: 'NOT_SAVED',
  DOWNLOADING: 'DOWNLOADING',
  SAVED: 'SAVED',
  SYNCING: 'SYNCING',
  FAILED: 'FAILED',
};

// Everything downloadManager.runAutoSync() needs to look at in one pass.
// SYNCING is included even though it's meant to be transient — if the app
// is killed mid-sync, a material can get stuck there forever otherwise.
// Treating a leftover SYNCING as "needs another pass" self-heals that case
// the same way DOWNLOADING/FAILED do.
const TRACKED_STATES = [
  MATERIAL_STATE.DOWNLOADING,
  MATERIAL_STATE.SYNCING,
  MATERIAL_STATE.SAVED,
  MATERIAL_STATE.FAILED,
];

// ── getEffectiveState ────────────────────────────────────────────────────
// Derives a state for records written before this migration shipped (no
// `state` field yet). Never treat `undefined` as NOT_SAVED without checking
// the legacy `savedOffline` flag first — that would silently "forget" every
// material a student saved before this update.
function getEffectiveState(m) {
  if (!m) return MATERIAL_STATE.NOT_SAVED;
  if (m.state) return m.state;
  return m.savedOffline ? MATERIAL_STATE.SAVED : MATERIAL_STATE.NOT_SAVED;
}

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
    const m = await storage.get(PREFIX + materialId);
    if (!m) return null;
    // Always hand back an effective state so callers never have to
    // special-case "old record, no state field yet" themselves. Reading
    // also lazily heals the stored record the next time upsert() runs,
    // since existing state gets folded back in.
    return { ...m, state: getEffectiveState(m) };
  },

  // ── getAllSaved ───────────────────────────────────────────────────────────
  // The Saved Materials screen's single data source — every material the
  // student has permanently downloaded, most recently opened first. Kept
  // for backward compatibility; now backed by `state` instead of the raw
  // `savedOffline` flag.
  async getAllSaved() {
    const all = await storage.getAllByPrefix(PREFIX);
    return all
      .map(m => ({ ...m, state: getEffectiveState(m) }))
      .filter(m => m.state === MATERIAL_STATE.SAVED)
      .sort((a, b) => new Date(b.lastOpened || 0) - new Date(a.lastOpened || 0));
  },

  // ── getAllTracked ─────────────────────────────────────────────────────────
  // downloadManager.runAutoSync()'s single data source:
  //   DOWNLOADING / FAILED / stray SYNCING → resume or retry a save
  //   SAVED                                → check the server for changes
  // NOT_SAVED materials are deliberately excluded — nothing to do for them
  // until the student explicitly taps Save again.
  async getAllTracked() {
    const all = await storage.getAllByPrefix(PREFIX);
    return all
      .map(m => ({ ...m, state: getEffectiveState(m) }))
      .filter(m => TRACKED_STATES.includes(m.state));
  },

  // ── setState ──────────────────────────────────────────────────────────────
  // The only place `state` should ever be written from — downloadManager,
  // exclusively. Keeps `savedOffline` mirroring `state === SAVED` so any
  // remaining reader of the legacy flag still sees correct behavior.
  async setState(materialId, state) {
    if (!Object.values(MATERIAL_STATE).includes(state)) {
      throw new Error(`materialRepository.setState: invalid state "${state}"`);
    }
    const m = await this.getById(materialId);
    if (!m) return;
    await storage.set(PREFIX + materialId, {
      ...m,
      state,
      savedOffline: state === MATERIAL_STATE.SAVED,
      updatedAt: new Date().toISOString(),
    });
  },

  // ── updateLastSynced ──────────────────────────────────────────────────────
  // Stamped every time a material finishes a runAutoSync pass — whether or
  // not anything actually changed. Drives the "Last synced: Today, 9:42 AM"
  // UI text.
  async updateLastSynced(materialId) {
    const m = await this.getById(materialId);
    if (!m) return;
    await storage.set(PREFIX + materialId, {
      ...m,
      lastSyncedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  },

  async updateVersion(materialId, version) {
    const m = await this.getById(materialId);
    if (m) await storage.set(PREFIX + materialId, { ...m, version, updatedAt: new Date().toISOString() });
  },

  async updateLastOpened(materialId) {
    const m = await this.getById(materialId);
    if (m) await storage.set(PREFIX + materialId, { ...m, lastOpened: new Date().toISOString() });
  },

  // ── setSavedOffline ───────────────────────────────────────────────────────
  // Legacy setter, kept so any not-yet-migrated caller keeps working.
  // Delegates to setState() so the two flags can never drift apart.
  async setSavedOffline(materialId, saved) {
    await this.setState(materialId, saved ? MATERIAL_STATE.SAVED : MATERIAL_STATE.NOT_SAVED);
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