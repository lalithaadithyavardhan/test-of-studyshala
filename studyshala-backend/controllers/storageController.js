/**
 * storageController
 * =================
 * Three endpoints:
 *  1. getDriveStorage      — platform-wide Google Drive quota (faculty/admin)
 *  2. getFacultyFootprint  — this faculty's own upload total from MongoDB
 *  3. getStudentFootprint  — this student's saved-materials total from MongoDB
 */
const driveService = require('../services/driveService');
const Folder       = require('../models/Folder');
const logger       = require('../utils/logger');

// ── 1. Platform-wide Drive quota ─────────────────────────────────────────────
exports.getDriveStorage = async (req, res) => {
  try {
    if (!driveService.enabled) {
      return res.status(503).json({ message: 'Drive not configured on this server.' });
    }

    const about = await driveService.drive.about.get({ fields: 'storageQuota' });
    const quota = about.data.storageQuota;

    res.json({
      limit:        parseInt(quota.limit        || 0),
      usage:        parseInt(quota.usage        || 0),
      usageInDrive: parseInt(quota.usageInDrive || 0),
    });
  } catch (err) {
    logger.error(`getDriveStorage: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch storage info' });
  }
};

// ── 2. Faculty personal upload footprint (from MongoDB file sizes) ────────────
exports.getFacultyFootprint = async (req, res) => {
  try {
    const folders = await Folder.find({ facultyId: req.user._id, active: true });

    let totalBytes     = 0;
    let totalFiles     = 0;
    let totalMaterials = folders.length;

    for (const folder of folders) {
      for (const file of folder.files) {
        totalBytes += file.size || 0;
        totalFiles++;
      }
      for (const sf of folder.subFolders) {
        for (const file of sf.files) {
          totalBytes += file.size || 0;
          totalFiles++;
        }
      }
    }

    res.json({ totalBytes, totalFiles, totalMaterials });
  } catch (err) {
    logger.error(`getFacultyFootprint: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch faculty storage info' });
  }
};

// ── 3. Student saved-materials footprint (from MongoDB file sizes) ────────────
exports.getStudentFootprint = async (req, res) => {
  try {
    const savedIds = req.user.savedMaterials.map(m => m.materialId);
    const folders  = await Folder.find({ _id: { $in: savedIds }, active: true });

    let totalBytes     = 0;
    let totalFiles     = 0;
    let totalMaterials = folders.length;

    for (const folder of folders) {
      for (const file of folder.files) {
        totalBytes += file.size || 0;
        totalFiles++;
      }
      for (const sf of folder.subFolders) {
        for (const file of sf.files) {
          totalBytes += file.size || 0;
          totalFiles++;
        }
      }
    }

    res.json({ totalBytes, totalFiles, totalMaterials });
  } catch (err) {
    logger.error(`getStudentFootprint: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch student storage info' });
  }
};
