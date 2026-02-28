const Folder = require('../models/Folder');
const User   = require('../models/User');
const { logAction } = require('../middleware/logging');
const logger = require('../utils/logger');

/*
 * DOWNLOAD STRATEGY (root-cause fix)
 * ────────────────────────────────────
 * The original code tried to proxy the file through the Express server using
 * driveService.downloadFile(). That path returns 404 whenever
 * GOOGLE_DRIVE_REFRESH_TOKEN is not set in Render's environment variables.
 *
 * The correct fix: every file is already uploaded to Google Drive with
 * "reader + anyone" permission (set in driveService.uploadFile). That means
 * Google's own public download URL works for every account — or no account.
 *
 * So instead of proxying, we just redirect the browser straight to Google.
 * No REFRESH_TOKEN needed for downloads. No server memory or bandwidth used.
 *
 * Download URL:  https://drive.usercontent.google.com/download?id=FILE_ID&export=download
 * Preview URL:   https://drive.google.com/file/d/FILE_ID/preview
 */

const driveUrls = (driveFileId) => ({
  downloadUrl: driveFileId
    ? `https://drive.usercontent.google.com/download?id=${driveFileId}&export=download&authuser=0`
    : null,
  previewUrl: driveFileId
    ? `https://drive.google.com/file/d/${driveFileId}/preview`
    : null
});

// Shape every file document the same way for the client
const mapFile = (f) => ({
  _id:        f._id,
  name:       f.name,
  mimeType:   f.mimeType,
  size:       f.size,
  uploadedAt: f.uploadedAt,
  driveFileId: f.driveFileId || null,
  ...driveUrls(f.driveFileId)
});

// ─────────────────────────────────────────────────────────────────────────────
// Validate access code
// ─────────────────────────────────────────────────────────────────────────────
const validateAccessCode = async (req, res) => {
  try {
    const { accessCode } = req.body;
    if (!accessCode?.trim()) return res.status(400).json({ message: 'Access code required' });

    const code   = accessCode.trim().toUpperCase();
    const folder = await Folder.findOne({
      $or: [{ accessCode: code }, { departmentCode: code }],
      active: true
    });

    if (!folder) return res.json({ valid: false, message: 'Code not found or inactive' });

    // Record history once per material
    const seen = req.user.accessHistory.find(h => h.materialId.toString() === folder._id.toString());
    if (!seen) {
      req.user.accessHistory.push({ materialId: folder._id, accessCode: code, accessedAt: new Date() });
      await req.user.save();
    }
    folder.accessCount += 1;
    await folder.save();
    await logAction(req, 'ACCESS_MATERIAL', 'Folder', folder._id, { code });

    res.json({
      valid: true,
      material: {
        _id:        folder._id,
        subjectName: folder.subjectName,
        department:  folder.department,
        semester:    folder.semester,
        facultyName: folder.facultyName,
        accessCode:  folder.accessCode || folder.departmentCode,
        fileCount:   folder.files?.length || 0,
        createdAt:   folder.createdAt,
        files:       folder.files.map(mapFile)   // ← includes downloadUrl + previewUrl
      }
    });
  } catch (err) {
    logger.error(`validateAccessCode: ${err.message}`);
    res.status(500).json({ message: 'Validation failed' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Save material
// ─────────────────────────────────────────────────────────────────────────────
const saveMaterial = async (req, res) => {
  try {
    const { materialId } = req.body;
    if (!materialId) return res.status(400).json({ message: 'Material ID required' });

    const folder = await Folder.findOne({ _id: materialId, active: true });
    if (!folder) return res.status(404).json({ message: 'Material not found' });

    const already = req.user.savedMaterials.find(m => m.materialId.toString() === materialId);
    if (already) return res.json({ message: 'Material already saved', alreadySaved: true });

    req.user.savedMaterials.push({ materialId, savedAt: new Date() });
    await req.user.save();
    await logAction(req, 'SAVE_MATERIAL', 'Folder', folder._id, { subjectName: folder.subjectName });
    res.json({ message: 'Material saved successfully', saved: true });
  } catch (err) {
    logger.error(`saveMaterial: ${err.message}`);
    res.status(500).json({ message: 'Failed to save material' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Get saved materials list
// ─────────────────────────────────────────────────────────────────────────────
const getSavedMaterials = async (req, res) => {
  try {
    const ids     = req.user.savedMaterials.map(m => m.materialId);
    const folders = await Folder.find({ _id: { $in: ids }, active: true }).sort({ createdAt: -1 });

    const materials = folders.map(m => {
      const entry = req.user.savedMaterials.find(s => s.materialId.toString() === m._id.toString());
      return {
        _id:        m._id,
        subjectName: m.subjectName,
        department:  m.department,
        semester:    m.semester,
        facultyName: m.facultyName,
        accessCode:  m.accessCode || m.departmentCode,
        fileCount:   m.files?.length || 0,
        savedAt:     entry?.savedAt,
        createdAt:   m.createdAt
      };
    });
    res.json({ materials });
  } catch (err) {
    logger.error(`getSavedMaterials: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch saved materials' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Get access history
// ─────────────────────────────────────────────────────────────────────────────
const getAccessHistory = async (req, res) => {
  try {
    const ids     = req.user.accessHistory.map(h => h.materialId);
    const folders = await Folder.find({ _id: { $in: ids }, active: true });

    const history = req.user.accessHistory.map(h => {
      const folder = folders.find(f => f._id.toString() === h.materialId.toString());
      if (!folder) return null;
      const isSaved = req.user.savedMaterials.some(s => s.materialId.toString() === folder._id.toString());
      return {
        _id:        folder._id,
        subjectName: folder.subjectName,
        department:  folder.department,
        semester:    folder.semester,
        facultyName: folder.facultyName,
        accessCode:  h.accessCode,
        fileCount:   folder.files?.length || 0,
        accessedAt:  h.accessedAt,
        isSaved
      };
    }).filter(Boolean);

    res.json({ history });
  } catch (err) {
    logger.error(`getAccessHistory: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch access history' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Get files for a material  (saved or history students only)
// Returns downloadUrl + previewUrl per file — no proxying needed
// ─────────────────────────────────────────────────────────────────────────────
const getMaterialFiles = async (req, res) => {
  try {
    const { id }   = req.params;
    const folder   = await Folder.findOne({ _id: id, active: true });
    if (!folder) return res.status(404).json({ message: 'Material not found' });

    const hasAccess =
      req.user.savedMaterials.some(m => m.materialId.toString() === id) ||
      req.user.accessHistory.some(h => h.materialId.toString() === id);
    if (!hasAccess) return res.status(403).json({ message: 'Access denied' });

    res.json({
      material: {
        _id:        folder._id,
        subjectName: folder.subjectName,
        department:  folder.department,
        semester:    folder.semester,
        facultyName: folder.facultyName
      },
      files: folder.files.map(mapFile)  // ← includes downloadUrl + previewUrl
    });
  } catch (err) {
    logger.error(`getMaterialFiles: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch files' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Download  — redirect to Google's public URL, no REFRESH_TOKEN needed
// ─────────────────────────────────────────────────────────────────────────────
const downloadFile = async (req, res) => {
  try {
    const { id, fileId } = req.params;
    const folder = await Folder.findOne({ _id: id, active: true });
    if (!folder) return res.status(404).json({ message: 'Material not found' });

    const hasAccess =
      req.user.savedMaterials.some(m => m.materialId.toString() === id) ||
      req.user.accessHistory.some(h => h.materialId.toString() === id);
    if (!hasAccess) return res.status(403).json({ message: 'Access denied. Enter the access code first.' });

    const file = folder.files.find(f => f._id.toString() === fileId);
    if (!file)              return res.status(404).json({ message: 'File not found' });
    if (!file.driveFileId)  return res.status(404).json({ message: 'File has no Drive ID. Contact your faculty to re-upload.' });

    await logAction(req, 'DOWNLOAD_FILE', 'Folder', folder._id, { fileName: file.name });

    // ← THE FIX: redirect instead of proxying
    return res.redirect(driveUrls(file.driveFileId).downloadUrl);
  } catch (err) {
    logger.error(`downloadFile: ${err.message}`);
    res.status(500).json({ message: 'Failed to download file' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Remove saved material
// ─────────────────────────────────────────────────────────────────────────────
const removeSavedMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    req.user.savedMaterials = req.user.savedMaterials.filter(m => m.materialId.toString() !== id);
    await req.user.save();
    await logAction(req, 'REMOVE_SAVED_MATERIAL', 'Folder', id, {});
    res.json({ message: 'Material removed from saved list' });
  } catch (err) {
    logger.error(`removeSavedMaterial: ${err.message}`);
    res.status(500).json({ message: 'Failed to remove material' });
  }
};

module.exports = {
  validateAccessCode,
  saveMaterial,
  getSavedMaterials,
  getAccessHistory,
  getMaterialFiles,
  downloadFile,
  removeSavedMaterial
};
