/**
 * database/fileRepository.js — StudyShala
 * =========================================
 * Single-tier offline model: a file is either saved (localPath is set and
 * points at a real file on disk) or it isn't. There is no separate "cache"
 * concept, no expiry, no eviction — that entire tier has been removed.
 *
 * `downloaded` is kept only as a convenience boolean that always mirrors
 * `!!localPath`; the actual source of truth for "is this available offline"
 * is always `localPath`.
 */
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
  // Returns every stored file record, regardless of material. Used by the
  // Saved Materials screen to show storage totals without a per-material query.
  async getAll() {
    return await storage.getAllByPrefix(PREFIX);
  },

  async getByMaterial(materialId) {
    const fileIds = await storage.get(MAT_FILES_PREFIX + materialId) || [];
    const files = await Promise.all(fileIds.map(id => storage.get(PREFIX + id)));
    return files.filter(Boolean);
  },

  // ── setDownloaded ─────────────────────────────────────────────────────────
  // Called once a file's bytes are confirmed on disk at `localPath`. This is
  // the ONLY thing that makes a file "available offline" — there is no other
  // path to that state.
  async setDownloaded(fileId, localPath) {
    const f = await this.getById(fileId);
    if (f) {
      await storage.set(PREFIX + fileId, {
        ...f,
        downloaded: !!localPath,
        localPath,
        downloadedAt: f.downloadedAt || (localPath ? new Date().toISOString() : null),
        updatedAt: new Date().toISOString(),
      });
    }
  },

  async updateLastOpened(fileId) {
    const f = await this.getById(fileId);
    if (f) await storage.set(PREFIX + fileId, { ...f, lastOpened: new Date().toISOString() });
  },

  // ── isAvailableOffline ────────────────────────────────────────────────────
  // The single check every screen should use before trying to open a file
  // without internet. True local-file existence is verified by the caller
  // (via FileSystem.getInfoAsync) since this repository doesn't touch the
  // filesystem — this just tells you whether we THINK it's saved.
  async isAvailableOffline(fileId) {
    const f = await this.getById(fileId);
    return !!(f?.localPath);
  },

  async getDownloadedByMaterial(materialId) {
    const files = await this.getByMaterial(materialId);
    return files.filter(f => f.downloaded);
  },

  // ── isMaterialFullyDownloaded ────────────────────────────────────────────
  // The single source of truth for the "verified offline" badge on the
  // Saved Materials screen. Deliberately independent of any server/
  // materialRepository "savedOffline" flag — those can drift (a material
  // can be marked saved server-side or in materialRepository without every
  // file actually having downloaded successfully on THIS device). This
  // checks only what we actually have local records for.
  async isMaterialFullyDownloaded(materialId) {
    const files = await this.getByMaterial(materialId);
    if (!files.length) return false;
    return files.every(f => f.downloaded && !!f.localPath);
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

  // ── deleteMany ────────────────────────────────────────────────────────────
  // Used by downloadManager's sync pass (Phase 3) to remove individual files
  // that were deleted by the faculty on the server, without touching the
  // rest of the material's files or its materialId→fileIds index entry for
  // the ones that remain.
  async deleteMany(fileIds = []) {
    for (const fileId of fileIds) {
      await this.delete(fileId);
    }
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

export default fileRepository;