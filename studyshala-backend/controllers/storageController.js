/**
 * storageController  v4 — No user token. No scary consent screen.
 * =================================================================
 *
 * DESIGN DECISION:
 *   All StudyShala files live on ONE shared platform Drive account.
 *   We use the platform's existing service token (GOOGLE_DRIVE_REFRESH_TOKEN)
 *   to get quota — the same token already used for uploads/deletes.
 *   We NEVER ask users for their personal Drive access. No consent screen.
 *
 * Endpoints:
 *
 *   GET /api/storage/platform-drive   (faculty + admin only)
 *     → Platform Drive quota using service account token
 *     → Shows: total used / limit of the shared Drive
 *
 *   GET /api/storage/my-studyshala    (any authenticated user)
 *     → Faculty: sum of file sizes they've uploaded (MongoDB)
 *     → Student: sum of file sizes in their saved materials (MongoDB)
 *     → Pure MongoDB — no Drive API call needed
 */

const driveService = require('../services/driveService');
const Folder       = require('../models/Folder');
const logger       = require('../utils/logger');

// ── 1. Platform Drive quota (service account) ─────────────────────────────────
exports.getPlatformDriveStorage = async (req, res) => {
  try {
    if (!driveService.enabled) {
      return res.status(503).json({ message: 'Drive not configured on this server.' });
    }

    const about = await driveService.drive.about.get({ fields: 'storageQuota' });
    const q     = about.data.storageQuota;

    return res.json({
      limit:             parseInt(q.limit             || 0),
      usage:             parseInt(q.usage             || 0),
      usageInDrive:      parseInt(q.usageInDrive      || 0),
      usageInDriveTrash: parseInt(q.usageInDriveTrash || 0),
    });

  } catch (err) {
    logger.error(`getPlatformDriveStorage: ${err.message}`);
    return res.status(500).json({ message: 'Failed to fetch Drive quota' });
  }
};

// ── 2. User's personal StudyShala footprint (MongoDB only) ────────────────────
exports.getMyStudyshalaUsage = async (req, res) => {
  try {
    const role = req.user.role;
    let totalBytes = 0, totalFiles = 0, totalMaterials = 0;

    if (role === 'faculty' || role === 'admin') {
      const folders = await Folder.find({ facultyId: req.user._id, active: true });
      totalMaterials = folders.length;
      for (const f of folders) {
        for (const file of f.files) { totalBytes += file.size || 0; totalFiles++; }
        for (const sf of f.subFolders) {
          for (const file of sf.files) { totalBytes += file.size || 0; totalFiles++; }
        }
      }
    } else {
      const savedIds = req.user.savedMaterials.map(m => m.materialId);
      const folders  = await Folder.find({ _id: { $in: savedIds }, active: true });
      totalMaterials = folders.length;
      for (const f of folders) {
        for (const file of f.files) { totalBytes += file.size || 0; totalFiles++; }
        for (const sf of f.subFolders) {
          for (const file of sf.files) { totalBytes += file.size || 0; totalFiles++; }
        }
      }
    }

    return res.json({ role, totalBytes, totalFiles, totalMaterials });

  } catch (err) {
    logger.error(`getMyStudyshalaUsage: ${err.message}`);
    return res.status(500).json({ message: 'Failed to fetch usage' });
  }
};
