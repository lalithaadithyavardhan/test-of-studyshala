/**
 * studentController.js
 * ====================
 * All download and preview URLs are derived at runtime from driveFileId.
 * No files are streamed through Express. Downloads and previews are
 * browser→Drive redirects using Google's public anyoneWithLink URLs.
 *
 * WHY THIS WORKS:
 *   Every file is uploaded with role:reader / type:anyone in driveService.
 *   Google's public download URL works for any browser, any account, forever.
 *   No REFRESH_TOKEN needed on the server for reads.
 */

const Folder    = require('../models/Folder');
const { logAction } = require('../middleware/logging');
const logger    = require('../utils/logger');

// ── URL helpers ────────────────────────────────────────────────────────────

/**
 * Build Google Drive public URLs from a fileId.
 * These work for anyoneWithLink files — no OAuth, no token.
 *
 * Preview:  /file/d/ID/preview  → Drive's built-in viewer (PDF, Word, PPT…)
 * Download: drive.usercontent.google.com  → triggers browser download dialog
 */
const buildDriveUrls = (driveFileId) => {
  if (!driveFileId) return { previewUrl: null, downloadUrl: null };
  return {
    previewUrl:  `https://drive.google.com/file/d/${driveFileId}/preview`,
    downloadUrl: `https://drive.usercontent.google.com/download?id=${driveFileId}&export=download&authuser=0`
  };
};

/**
 * Shape a file document for the client.
 * Always includes previewUrl and downloadUrl so the frontend never
 * needs to construct Drive URLs itself.
 */
const mapFile = (f) => ({
  _id:         f._id,
  name:        f.name,
  mimeType:    f.mimeType,
  size:        f.size,
  uploadedAt:  f.uploadedAt,
  driveFileId: f.driveFileId || null,
  ...buildDriveUrls(f.driveFileId)
});

// ── Validate access code ───────────────────────────────────────────────────

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

    // Record in access history (once per material per student)
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
        _id:         folder._id,
        subjectName: folder.subjectName,
        department:  folder.department,
        semester:    folder.semester,
        facultyName: folder.facultyName,
        accessCode:  folder.accessCode || folder.departmentCode,
        fileCount:   folder.files?.length || 0,
        createdAt:   folder.createdAt,
        files:       folder.files.map(mapFile)   // includes previewUrl + downloadUrl
      }
    });
  } catch (err) {
    logger.error(`validateAccessCode: ${err.message}`);
    res.status(500).json({ message: 'Validation failed' });
  }
};

// ── Save material ──────────────────────────────────────────────────────────

const saveMaterial = async (req, res) => {
  try {
    const { materialId } = req.body;
    if (!materialId) return res.status(400).json({ message: 'Material ID required' });

    const folder = await Folder.findOne({ _id: materialId, active: true });
    if (!folder) return res.status(404).json({ message: 'Material not found' });

    const already = req.user.savedMaterials.find(m => m.materialId.toString() === materialId);
    if (already) return res.json({ message: 'Already saved', alreadySaved: true });

    req.user.savedMaterials.push({ materialId, savedAt: new Date() });
    await req.user.save();
    await logAction(req, 'SAVE_MATERIAL', 'Folder', folder._id, { subjectName: folder.subjectName });
    res.json({ message: 'Material saved successfully', saved: true });
  } catch (err) {
    logger.error(`saveMaterial: ${err.message}`);
    res.status(500).json({ message: 'Failed to save material' });
  }
};

// ── Get saved materials list ───────────────────────────────────────────────

const getSavedMaterials = async (req, res) => {
  try {
    const ids     = req.user.savedMaterials.map(m => m.materialId);
    const folders = await Folder.find({ _id: { $in: ids }, active: true }).sort({ createdAt: -1 });

    const materials = folders.map(folder => {
      const entry = req.user.savedMaterials.find(s => s.materialId.toString() === folder._id.toString());
      return {
        _id:         folder._id,
        subjectName: folder.subjectName,
        department:  folder.department,
        semester:    folder.semester,
        facultyName: folder.facultyName,
        accessCode:  folder.accessCode || folder.departmentCode,
        fileCount:   folder.files?.length || 0,
        savedAt:     entry?.savedAt,
        createdAt:   folder.createdAt
      };
    });

    res.json({ materials });
  } catch (err) {
    logger.error(`getSavedMaterials: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch saved materials' });
  }
};

// ── Get access history ─────────────────────────────────────────────────────

const getAccessHistory = async (req, res) => {
  try {
    const ids     = req.user.accessHistory.map(h => h.materialId);
    const folders = await Folder.find({ _id: { $in: ids }, active: true });

    const history = req.user.accessHistory.map(h => {
      const folder = folders.find(f => f._id.toString() === h.materialId.toString());
      if (!folder) return null;
      const isSaved = req.user.savedMaterials.some(s => s.materialId.toString() === folder._id.toString());
      return {
        _id:         folder._id,
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

// ── Get files for a material ───────────────────────────────────────────────
// Returns previewUrl + downloadUrl per file — no proxying required

const getMaterialFiles = async (req, res) => {
  try {
    const { id } = req.params;
    const folder = await Folder.findOne({ _id: id, active: true });
    if (!folder) return res.status(404).json({ message: 'Material not found' });

    // Must have accessed via code or previously saved
    const hasAccess =
      req.user.savedMaterials.some(m => m.materialId.toString() === id) ||
      req.user.accessHistory.some(h => h.materialId.toString() === id);
    if (!hasAccess) return res.status(403).json({ message: 'Access denied. Enter the access code first.' });

    res.json({
      material: {
        _id:         folder._id,
        subjectName: folder.subjectName,
        department:  folder.department,
        semester:    folder.semester,
        facultyName: folder.facultyName
      },
      files: folder.files.map(mapFile)
    });
  } catch (err) {
    logger.error(`getMaterialFiles: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch files' });
  }
};

// ── Download a file ────────────────────────────────────────────────────────
// FIX: redirects to Google Drive's public URL instead of proxying through Express.
// This works because files have anyoneWithLink reader permission.
// GOOGLE_DRIVE_REFRESH_TOKEN is NOT required for this route.

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
    if (!file)             return res.status(404).json({ message: 'File not found' });
    if (!file.driveFileId) return res.status(404).json({ message: 'File not on Drive. Ask faculty to re-upload.' });

    await logAction(req, 'DOWNLOAD_FILE', 'Folder', folder._id, { fileName: file.name });

    // THE FIX: redirect, don't proxy
    return res.redirect(buildDriveUrls(file.driveFileId).downloadUrl);
  } catch (err) {
    logger.error(`downloadFile: ${err.message}`);
    res.status(500).json({ message: 'Failed to process download' });
  }
};

// ── Remove saved material ──────────────────────────────────────────────────

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
