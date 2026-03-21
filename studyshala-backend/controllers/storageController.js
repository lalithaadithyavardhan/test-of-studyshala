/**
 * storageController  v5
 * =====================
 * One endpoint only: user's personal StudyShala footprint.
 * Faculty  → total bytes they've uploaded (from MongoDB file sizes)
 * Student  → total bytes in their saved materials (from MongoDB)
 * No Drive API. No user token. No platform quota.
 */

const Folder = require('../models/Folder');
const logger = require('../utils/logger');

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

