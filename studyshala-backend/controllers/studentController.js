/**
 * studentController.js  v3
 * ========================
 * Downloads now redirect directly to Google Drive (full CDN speed).
 * No more backend proxy / watermark on download — files are anyoneWithLink.
 */

const Folder        = require('../models/Folder');
const { logAction } = require('../middleware/logging');
const logger        = require('../utils/logger');

// ── URL helpers ──────────────────────────────────────────────────────────────

const buildDriveUrls = (driveFileId) => {
  if (!driveFileId) return { previewUrl: null, downloadUrl: null };
  return {
    previewUrl:  `https://drive.google.com/file/d/${driveFileId}/preview`,
    downloadUrl: `https://drive.usercontent.google.com/download?id=${driveFileId}&export=download&authuser=0`
  };
};

const mapFile = (f) => ({
  _id:           f._id,
  name:          f.name,
  mimeType:      f.mimeType,
  size:          f.size,
  uploadedAt:    f.uploadedAt,
  driveFileId:   f.driveFileId || null,
  downloadCount: f.downloadCount || 0,
  ...buildDriveUrls(f.driveFileId)
});

const mapSubFolder = (sf) => ({
  _id:       sf._id,
  name:      sf.name,
  createdAt: sf.createdAt,
  fileCount: sf.files.length,
  files:     sf.files.map(mapFile)
});

// ── Validate access code ─────────────────────────────────────────────────────

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

    // Only record FIRST access per material — prevents duplicate entries growing the doc
    const seen = req.user.accessHistory.find(h => h.materialId.toString() === folder._id.toString());
    if (!seen) {
      req.user.accessHistory.push({ materialId: folder._id, accessCode: code, accessedAt: new Date() });
      // Safety cap: keep only the 50 most recent entries (each is ~35 bytes)
      if (req.user.accessHistory.length > 50) {
        req.user.accessHistory = req.user.accessHistory.slice(-50);
      }
      await req.user.save();
      folder.accessCount += 1;
      await folder.save();
    }

    await logAction(req, 'ACCESS_MATERIAL', 'Folder', folder._id, { code });

    // Count total files across root + all sub-folders
    const totalFiles = folder.files.length + folder.subFolders.reduce((sum, sf) => sum + sf.files.length, 0);

    res.json({
      valid: true,
      material: {
        _id:               folder._id,
        subjectName:       folder.subjectName,
        department:        folder.department,
        semester:          folder.semester,
        facultyName:       folder.facultyName,
        accessCode:        folder.accessCode || folder.departmentCode,
        fileCount:         totalFiles,
        messageToStudents: folder.messageToStudents || '',
        createdAt:         folder.createdAt,
        files:             folder.files.map(mapFile),
        subFolders:        folder.subFolders.map(mapSubFolder)
      }
    });
  } catch (err) {
    logger.error(`validateAccessCode: ${err.message}`);
    res.status(500).json({ message: 'Validation failed' });
  }
};

// ── Save material ─────────────────────────────────────────────────────────────

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

// ── Get saved materials list ──────────────────────────────────────────────────

const getSavedMaterials = async (req, res) => {
  try {
    const ids     = req.user.savedMaterials.map(m => m.materialId);
    const folders = await Folder.find({ _id: { $in: ids }, active: true }).sort({ createdAt: -1 });

    const materials = folders.map(folder => {
      const entry     = req.user.savedMaterials.find(s => s.materialId.toString() === folder._id.toString());
      const totalFiles = folder.files.length + folder.subFolders.reduce((sum, sf) => sum + sf.files.length, 0);
      return {
        _id:               folder._id,
        subjectName:       folder.subjectName,
        department:        folder.department,
        semester:          folder.semester,
        facultyName:       folder.facultyName,
        accessCode:        folder.accessCode || folder.departmentCode,
        fileCount:         totalFiles,
        messageToStudents: folder.messageToStudents || '',
        subFolderCount:    folder.subFolders.length,
        savedAt:           entry?.savedAt,
        createdAt:         folder.createdAt
      };
    });

    res.json({ materials });
  } catch (err) {
    logger.error(`getSavedMaterials: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch saved materials' });
  }
};

// ── Get access history ────────────────────────────────────────────────────────

const getAccessHistory = async (req, res) => {
  try {
    const ids     = req.user.accessHistory.map(h => h.materialId);
    const folders = await Folder.find({ _id: { $in: ids }, active: true });

    const history = req.user.accessHistory.map(h => {
      const folder = folders.find(f => f._id.toString() === h.materialId.toString());
      if (!folder) return null;
      const isSaved    = req.user.savedMaterials.some(s => s.materialId.toString() === folder._id.toString());
      const totalFiles = folder.files.length + folder.subFolders.reduce((sum, sf) => sum + sf.files.length, 0);
      return {
        _id:               folder._id,
        subjectName:       folder.subjectName,
        department:        folder.department,
        semester:          folder.semester,
        facultyName:       folder.facultyName,
        accessCode:        h.accessCode,
        fileCount:         totalFiles,
        messageToStudents: folder.messageToStudents || '',
        subFolderCount:    folder.subFolders.length,
        accessedAt:        h.accessedAt,
        isSaved
      };
    }).filter(Boolean);

    res.json({ history });
  } catch (err) {
    logger.error(`getAccessHistory: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch access history' });
  }
};

// ── Get files for a material (includes sub-folders) ──────────────────────────

const getMaterialFiles = async (req, res) => {
  try {
    const { id } = req.params;
    const folder = await Folder.findOne({ _id: id, active: true });
    if (!folder) return res.status(404).json({ message: 'Material not found' });

    const hasAccess =
      req.user.savedMaterials.some(m => m.materialId.toString() === id) ||
      req.user.accessHistory.some(h => h.materialId.toString() === id);

    if (!hasAccess) return res.status(403).json({ message: 'Access denied. Enter the access code first.' });

    res.json({
      material: {
        _id:               folder._id,
        subjectName:       folder.subjectName,
        department:        folder.department,
        semester:          folder.semester,
        facultyName:       folder.facultyName,
        messageToStudents: folder.messageToStudents || ''
      },
      files:      folder.files.map(mapFile),
      subFolders: folder.subFolders.map(mapSubFolder)
    });
  } catch (err) {
    logger.error(`getMaterialFiles: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch files' });
  }
};

// ── Download a file — proxied through backend so frontend fetch() gets real bytes ──────
//
// WHY PROXY: Google Drive blocks browser fetch() with CORS for binary files.
// window.open() works but opens a new tab (bad UX).
// Solution: backend fetches from Drive server-side (no CORS) and pipes bytes
// back to the browser. Frontend fetch()es this endpoint with the JWT header,
// gets real binary, saves without opening a new tab.

const https = require('https');
const http  = require('http');

const fetchDriveBinary = (url, maxRedirects = 6) => new Promise((resolve, reject) => {
  const lib = url.startsWith('https') ? https : http;
  lib.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && maxRedirects > 0) {
      return resolve(fetchDriveBinary(res.headers.location, maxRedirects - 1));
    }
    if (res.statusCode !== 200) {
      res.resume();
      return reject(new Error(`Drive returned ${res.statusCode}`));
    }
    resolve(res); // return the raw IncomingMessage so we can pipe it
  }).on('error', reject);
});

const downloadFile = async (req, res) => {
  try {
    const { id, fileId } = req.params;
    const folder = await Folder.findOne({ _id: id, active: true });
    if (!folder) return res.status(404).json({ message: 'Material not found' });

    const hasAccess =
      req.user.savedMaterials.some(m => m.materialId.toString() === id) ||
      req.user.accessHistory.some(h => h.materialId.toString() === id);

    if (!hasAccess) return res.status(403).json({ message: 'Access denied. Enter the access code first.' });

    // Search root files then sub-folders
    let file = folder.files.find(f => f._id.toString() === fileId);
    if (!file) {
      for (const sf of folder.subFolders) {
        file = sf.files.find(f => f._id.toString() === fileId);
        if (file) break;
      }
    }
    if (!file)             return res.status(404).json({ message: 'File not found' });
    if (!file.driveFileId) return res.status(404).json({ message: 'File not on Drive. Ask faculty to re-upload.' });

    await logAction(req, 'DOWNLOAD_FILE', 'Folder', folder._id, { fileName: file.name });

    // Increment downloadCount
    const rootInc = await Folder.updateOne(
      { _id: folder._id, 'files._id': file._id },
      { $inc: { 'files.$.downloadCount': 1 } }
    );
    if (rootInc.modifiedCount === 0) {
      await Folder.updateOne(
        { _id: folder._id },
        { $inc: { 'subFolders.$[].files.$[f].downloadCount': 1 } },
        { arrayFilters: [{ 'f._id': file._id }] }
      );
    }

    const { downloadUrl } = buildDriveUrls(file.driveFileId);
    const safeName = (file.name || 'file').replace(/[^\w.\-() ]/g, '_');

    // Proxy the Drive binary through the backend
    const driveRes = await fetchDriveBinary(downloadUrl);

    res.setHeader('Content-Type', driveRes.headers['content-type'] || file.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    if (driveRes.headers['content-length']) {
      res.setHeader('Content-Length', driveRes.headers['content-length']);
    }
    res.setHeader('Cache-Control', 'no-store');

    driveRes.pipe(res);

  } catch (err) {
    logger.error(`downloadFile: ${err.message}`);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Download failed. Please try again.' });
    }
  }
};

// ── Remove saved material ─────────────────────────────────────────────────────

const removeSavedMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const exists = req.user.savedMaterials.some(m => m.materialId.toString() === id);
    if (!exists) return res.status(404).json({ message: 'Material not found in your saved list' });

    req.user.savedMaterials = req.user.savedMaterials.filter(m => m.materialId.toString() !== id);
    await req.user.save();
    await logAction(req, 'REMOVE_SAVED_MATERIAL', 'Folder', id, {});
    res.json({ message: 'Material removed from saved list' });
  } catch (err) {
    logger.error(`removeSavedMaterial: ${err.message}`);
    res.status(500).json({ message: 'Failed to remove material' });
  }
};


// ── Track recently viewed file (called from frontend on preview/open) ─────────
const trackRecentFile = async (req, res) => {
  try {
    const { fileId, fileName, mimeType, materialId, subjectName, clear } = req.body;

    // Support clear-all flag from frontend
    if (clear) {
      req.user.recentFiles = [];
      await req.user.save();
      return res.json({ recentFiles: [] });
    }

    if (!fileId || !materialId) return res.status(400).json({ message: 'fileId and materialId required' });

    // Remove existing entry for this file (dedup), then prepend
    req.user.recentFiles = req.user.recentFiles.filter(r => r.fileId !== fileId);
    req.user.recentFiles.unshift({ fileId, fileName, mimeType, materialId, subjectName, viewedAt: new Date() });

    // Keep only the 10 most recent
    if (req.user.recentFiles.length > 10) req.user.recentFiles = req.user.recentFiles.slice(0, 10);

    await req.user.save();
    res.json({ recentFiles: req.user.recentFiles });
  } catch (err) {
    logger.error(`trackRecentFile: ${err.message}`);
    res.status(500).json({ message: 'Failed to track file' });
  }
};

// ── Get recent files ──────────────────────────────────────────────────────────
const getRecentFiles = async (req, res) => {
  try {
    res.json({ recentFiles: req.user.recentFiles || [] });
  } catch (err) {
    logger.error(`getRecentFiles: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch recent files' });
  }
};

// ── Star a file ───────────────────────────────────────────────────────────────
const starFile = async (req, res) => {
  try {
    const { fileId, fileName, mimeType, materialId, subjectName } = req.body;
    if (!fileId || !materialId) return res.status(400).json({ message: 'fileId and materialId required' });

    const alreadyStarred = req.user.starredFiles.some(s => s.fileId === fileId);
    if (alreadyStarred) return res.json({ starredFiles: req.user.starredFiles, alreadyStarred: true });

    req.user.starredFiles.push({ fileId, fileName, mimeType, materialId, subjectName, starredAt: new Date() });
    await req.user.save();
    res.json({ starredFiles: req.user.starredFiles });
  } catch (err) {
    logger.error(`starFile: ${err.message}`);
    res.status(500).json({ message: 'Failed to star file' });
  }
};

// ── Unstar a file ─────────────────────────────────────────────────────────────
const unstarFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    req.user.starredFiles = req.user.starredFiles.filter(s => s.fileId !== fileId);
    await req.user.save();
    res.json({ starredFiles: req.user.starredFiles });
  } catch (err) {
    logger.error(`unstarFile: ${err.message}`);
    res.status(500).json({ message: 'Failed to unstar file' });
  }
};

// ── Get starred files ─────────────────────────────────────────────────────────
const getStarredFiles = async (req, res) => {
  try {
    res.json({ starredFiles: req.user.starredFiles || [] });
  } catch (err) {
    logger.error(`getStarredFiles: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch starred files' });
  }
};




// ── Complete profile (for students) ─────────────────────────────────────────────


const completeProfile = async (req, res) => {
  
  console.log("✅ completeProfile API called");
  try {
    const { department, semester } = req.body;
    if (!department || !semester) {
      return res.status(400).json({
        message: "Department and semester are required",
      });
    }
    req.user.department = department;
    req.user.semester = semester;
    req.user.profileCompleted = true;

    await req.user.save();

    res.json({
      message: "Profile completed successfully",
      user: req.user,
    });
  } catch (err) {
    logger.error(`completeProfile: ${err.message}`);
    res.status(500).json({ message: "Failed to complete profile" });
  }
};

// ── Get profile (for students) ─────────────────────────────────────────────
const getProfile = async (req, res) => {
  try {
    res.json({
      department: req.user.department,
      semester: req.user.semester,
      profileCompleted: req.user.profileCompleted,
    });
  } catch (err) {
    logger.error(`getProfile: ${err.message}`);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
};


// ── Get materials by profile (for students) ─────────────────────────────────────────────
const getMaterialsByProfile = async (req, res) => {
  try {
        if (!req.user.profileCompleted) {
          return res.status(400).json({
           message: "Please complete your profile first",
          });
        }
    const materials = await Folder.find({
      department: req.user.department,
      semester: req.user.semester,
      active: true,
    }).sort({ createdAt: -1 });

    res.json({ materials });
  } catch (err) {
    logger.error(`getMaterialsByProfile: ${err.message}`);
    res.status(500).json({ message: "Failed to fetch materials" });
  }
};




module.exports = {
  validateAccessCode,
  saveMaterial,
  getSavedMaterials,
  getAccessHistory,
  getMaterialFiles,
  downloadFile,
  removeSavedMaterial,
  trackRecentFile,
  getRecentFiles,
  starFile,
  unstarFile,
  getStarredFiles,

  completeProfile,
  getProfile,
  getMaterialsByProfile
};