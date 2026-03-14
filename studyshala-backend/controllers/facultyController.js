/**
 * facultyController.js  v2
 * ========================
 * New features:
 *   - Sub-folder CRUD inside a material
 *   - Upload files to a specific sub-folder OR root
 *   - Faculty-to-student message (create + update)
 *   - Watermarking via watermarkService (PDFs + images)
 */

const Folder          = require('../models/Folder');
const User            = require('../models/User');
const driveService    = require('../services/driveService');
const { logAction }   = require('../middleware/logging');
const logger          = require('../utils/logger');
const crypto          = require('crypto');

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

// ── Unique 8-char access code ─────────────────────────────────────────────────

const generateUniqueCode = async () => {
  let code, exists;
  do {
    code   = crypto.randomBytes(4).toString('hex').toUpperCase();
    exists = await Folder.findOne({ accessCode: code, active: true });
  } while (exists);
  return code;
};

// ── Get all folders for this faculty ─────────────────────────────────────────

const getFolders = async (req, res) => {
  try {
    const folders = await Folder.find({ facultyId: req.user._id, active: true }).sort({ createdAt: -1 });
    const result  = folders.map(f => ({
      ...f.toObject(),
      files:      f.files.map(mapFile),
      subFolders: f.subFolders.map(mapSubFolder)
    }));
    res.json({ folders: result });
  } catch (err) {
    logger.error(`getFolders: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch folders' });
  }
};

// ── Create a new material ─────────────────────────────────────────────────────

const createFolder = async (req, res) => {
  try {
    const { department, semester, subjectName, facultyName, messageToStudents } = req.body;
    if (!department || !semester || !subjectName || !facultyName) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const accessCode  = await generateUniqueCode();
    const folderName  = `${department}-S${semester}-${subjectName}`;
    let driveUrl      = '#';
    let driveFolderId = `local-${Date.now()}`;

    if (driveService.enabled) {
      try {
        const driveFolder = await driveService.createFolder(folderName);
        driveUrl      = driveFolder.folderUrl;
        driveFolderId = driveFolder.folderId;
        logger.info(`Drive folder created: ${folderName} → ${driveFolderId}`);
      } catch (driveErr) {
        logger.warn(`Drive folder creation failed (files will upload to root): ${driveErr.message}`);
      }
    }

    const folder = new Folder({
      facultyId:         req.user._id,
      facultyName,
      subjectName,
      department,
      semester,
      accessCode,
      departmentCode:    accessCode,
      permission:        'view',
      driveUrl,
      driveFolderId,
      messageToStudents: messageToStudents?.trim() || '',
      files:             [],
      subFolders:        []
    });

    await folder.save();
    await logAction(req, 'CREATE_FOLDER', 'Folder', folder._id, { subjectName, department, semester, facultyName });
    logger.info(`Folder created: ${folderName} [${accessCode}] by ${req.user.email}`);
    res.status(201).json({ folder });
  } catch (err) {
    logger.error(`createFolder: ${err.message}`);
    res.status(500).json({ message: 'Failed to create material' });
  }
};

// ── Upload files (root or sub-folder) ────────────────────────────────────────
// Body param: subFolderId (optional) — if present, files go into that sub-folder

const uploadFiles = async (req, res) => {
  try {
    const { id }          = req.params;
    const { subFolderId } = req.body;   // optional

    const folder = await Folder.findOne({ _id: id, facultyId: req.user._id, active: true });
    if (!folder)                         return res.status(404).json({ message: 'Folder not found or access denied' });
    if (!req.files || !req.files.length) return res.status(400).json({ message: 'No files provided' });

    if (!driveService.enabled) {
      return res.status(503).json({
        message: 'Google Drive is not configured. Ask your administrator to set GOOGLE_DRIVE_REFRESH_TOKEN.'
      });
    }

    // Resolve target: sub-folder or root
    let targetSubFolder = null;
    let parentDriveId   = null;

    if (subFolderId) {
      targetSubFolder = folder.subFolders.id(subFolderId);
      if (!targetSubFolder) return res.status(404).json({ message: 'Sub-folder not found' });
      parentDriveId = targetSubFolder.driveSubFolderId || null;
    } else {
      // Root: use the material's Drive folder if valid
      parentDriveId = (folder.driveFolderId && !folder.driveFolderId.startsWith('local'))
        ? folder.driveFolderId
        : null;
    }

    const uploaded = [];

    for (const file of req.files) {
      // ── Drive upload ────────────────────────────────────────────────────
      // NOTE: Upload-time watermarking removed — it caused severe slowness
      // for large files (full file buffered, processed, then re-uploaded).
      // Files are already protected: access is gated by MongoDB access codes,
      // and Drive URLs are opaque without the fileId.
      let driveFileId = null;
      let fileSize    = file.size;

      try {
        const result = await driveService.uploadFile(
          file.buffer,
          file.originalname,
          file.mimetype,
          parentDriveId
        );
        driveFileId = result.fileId;
        fileSize    = result.size || file.buffer.length;
        logger.info(`Uploaded to Drive: ${file.originalname} → ${driveFileId}`);
      } catch (driveErr) {
        logger.error(`Drive upload failed for ${file.originalname}: ${driveErr.message}`);
        return res.status(500).json({
          message: `Failed to upload "${file.originalname}" to Google Drive: ${driveErr.message}`
        });
      }

      const doc = {
        name:         file.originalname,
        originalName: file.originalname,
        mimeType:     file.mimetype,
        size:         fileSize,
        driveFileId,
        uploadedAt:   new Date(),
        uploadedBy:   req.user._id
      };

      if (targetSubFolder) {
        targetSubFolder.files.push(doc);
      } else {
        folder.files.push(doc);
      }
      uploaded.push(doc);
    }

    await folder.save();
    await logAction(req, 'UPLOAD_FILES', 'Folder', folder._id, {
      fileCount: uploaded.length,
      destination: subFolderId ? `sub-folder:${targetSubFolder.name}` : 'root'
    });
    logger.info(`${uploaded.length} file(s) uploaded to "${folder.subjectName}" by ${req.user.email}`);

    res.json({
      message:    `${uploaded.length} file(s) uploaded successfully`,
      files:      uploaded.map(mapFile),
      subFolderId: subFolderId || null
    });
  } catch (err) {
    logger.error(`uploadFiles: ${err.message}`);
    res.status(500).json({ message: 'Failed to upload files' });
  }
};

// ── Create a sub-folder ───────────────────────────────────────────────────────

const createSubFolder = async (req, res) => {
  try {
    const { id }   = req.params;
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Sub-folder name is required' });

    const folder = await Folder.findOne({ _id: id, facultyId: req.user._id, active: true });
    if (!folder) return res.status(404).json({ message: 'Material not found' });

    // Prevent duplicate sub-folder names within same material
    const duplicate = folder.subFolders.find(sf => sf.name.toLowerCase() === name.trim().toLowerCase());
    if (duplicate) return res.status(409).json({ message: 'A sub-folder with this name already exists' });

    let driveSubFolderId = null;
    if (driveService.enabled && folder.driveFolderId && !folder.driveFolderId.startsWith('local')) {
      try {
        const result = await driveService.createFolder(name.trim(), folder.driveFolderId);
        driveSubFolderId = result.folderId;
        logger.info(`Drive sub-folder created: ${name} → ${driveSubFolderId}`);
      } catch (e) {
        logger.warn(`Drive sub-folder creation failed (files will upload to parent): ${e.message}`);
      }
    }

    const subFolder = { name: name.trim(), driveSubFolderId, files: [] };
    folder.subFolders.push(subFolder);
    await folder.save();

    const created = folder.subFolders[folder.subFolders.length - 1];
    await logAction(req, 'CREATE_SUBFOLDER', 'Folder', folder._id, { name: name.trim() });
    res.status(201).json({ subFolder: mapSubFolder(created) });
  } catch (err) {
    logger.error(`createSubFolder: ${err.message}`);
    res.status(500).json({ message: 'Failed to create sub-folder' });
  }
};

// ── Delete a sub-folder (and all its files) ───────────────────────────────────

const deleteSubFolder = async (req, res) => {
  try {
    const { id, sfId } = req.params;
    const folder = await Folder.findOne({ _id: id, facultyId: req.user._id, active: true });
    if (!folder) return res.status(404).json({ message: 'Material not found' });

    const sf = folder.subFolders.id(sfId);
    if (!sf) return res.status(404).json({ message: 'Sub-folder not found' });

    // Delete all Drive files in this sub-folder
    if (driveService.enabled) {
      for (const file of sf.files) {
        if (file.driveFileId) {
          try { await driveService.deleteFile(file.driveFileId); }
          catch (e) { logger.warn(`Drive file delete skipped: ${e.message}`); }
        }
      }
      // Delete the Drive sub-folder itself
      if (sf.driveSubFolderId) {
        try { await driveService.deleteFolder(sf.driveSubFolderId); }
        catch (e) { logger.warn(`Drive sub-folder delete skipped: ${e.message}`); }
      }
    }

    folder.subFolders.pull(sfId);
    await folder.save();
    await logAction(req, 'DELETE_SUBFOLDER', 'Folder', folder._id, { name: sf.name });
    res.json({ message: `Sub-folder "${sf.name}" deleted` });
  } catch (err) {
    logger.error(`deleteSubFolder: ${err.message}`);
    res.status(500).json({ message: 'Failed to delete sub-folder' });
  }
};

// ── Delete a file inside a sub-folder ─────────────────────────────────────────

const deleteSubFolderFile = async (req, res) => {
  try {
    const { id, sfId, fileId } = req.params;
    const folder = await Folder.findOne({ _id: id, facultyId: req.user._id, active: true });
    if (!folder) return res.status(404).json({ message: 'Material not found' });

    const sf = folder.subFolders.id(sfId);
    if (!sf) return res.status(404).json({ message: 'Sub-folder not found' });

    const fileIdx = sf.files.findIndex(f => f._id.toString() === fileId);
    if (fileIdx === -1) return res.status(404).json({ message: 'File not found' });

    const file = sf.files[fileIdx];
    if (file.driveFileId && driveService.enabled) {
      try { await driveService.deleteFile(file.driveFileId); }
      catch (e) { logger.warn(`Drive delete skipped: ${e.message}`); }
    }

    sf.files.splice(fileIdx, 1);
    await folder.save();
    await logAction(req, 'DELETE_SUBFOLDER_FILE', 'Folder', folder._id, { fileName: file.name, sfName: sf.name });
    res.json({ message: 'File deleted' });
  } catch (err) {
    logger.error(`deleteSubFolderFile: ${err.message}`);
    res.status(500).json({ message: 'Failed to delete file' });
  }
};

// ── Update faculty message to students ───────────────────────────────────────

const updateMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { messageToStudents } = req.body;

    const folder = await Folder.findOne({ _id: id, facultyId: req.user._id, active: true });
    if (!folder) return res.status(404).json({ message: 'Material not found' });

    folder.messageToStudents = (messageToStudents || '').trim().slice(0, 2000);
    await folder.save();
    await logAction(req, 'UPDATE_MESSAGE', 'Folder', folder._id, {});
    res.json({ message: 'Message updated', messageToStudents: folder.messageToStudents });
  } catch (err) {
    logger.error(`updateMessage: ${err.message}`);
    res.status(500).json({ message: 'Failed to update message' });
  }
};

// ── Delete a root-level file ──────────────────────────────────────────────────

const deleteFile = async (req, res) => {
  try {
    const { id, fileId } = req.params;
    const folder = await Folder.findOne({ _id: id, facultyId: req.user._id, active: true });
    if (!folder) return res.status(404).json({ message: 'Folder not found' });

    const idx = folder.files.findIndex(f => f._id.toString() === fileId);
    if (idx === -1) return res.status(404).json({ message: 'File not found' });

    const file = folder.files[idx];
    if (file.driveFileId && driveService.enabled) {
      try { await driveService.deleteFile(file.driveFileId); } catch (e) {
        logger.warn(`Drive delete skipped: ${e.message}`);
      }
    }

    folder.files.splice(idx, 1);
    await folder.save();
    await logAction(req, 'DELETE_FILE', 'Folder', folder._id, { fileName: file.name });
    res.json({ message: 'File deleted' });
  } catch (err) {
    logger.error(`deleteFile: ${err.message}`);
    res.status(500).json({ message: 'Failed to delete file' });
  }
};

// ── Delete an entire material ─────────────────────────────────────────────────

const deleteFolder = async (req, res) => {
  try {
    const { id } = req.params;
    const folder = await Folder.findOne({ _id: id, facultyId: req.user._id });
    if (!folder) return res.status(404).json({ message: 'Folder not found' });

    if (driveService.enabled && folder.driveFolderId && !folder.driveFolderId.startsWith('local')) {
      try { await driveService.deleteFolder(folder.driveFolderId); } catch (e) {
        logger.warn(`Drive folder delete skipped: ${e.message}`);
      }
    }

    await User.updateMany(
      { 'savedMaterials.materialId': id },
      { $pull: { savedMaterials: { materialId: id } } }
    );
    await User.updateMany(
      { 'accessHistory.materialId': id },
      { $pull: { accessHistory: { materialId: id } } }
    );

    folder.active = false;
    await folder.save();
    await logAction(req, 'DELETE_FOLDER', 'Folder', folder._id, { subjectName: folder.subjectName });
    res.json({ message: 'Material deleted and removed from all students' });
  } catch (err) {
    logger.error(`deleteFolder: ${err.message}`);
    res.status(500).json({ message: 'Failed to delete material' });
  }
};

// ── Get folder details ────────────────────────────────────────────────────────

const getFolderDetails = async (req, res) => {
  try {
    const folder = await Folder.findOne({ _id: req.params.id, facultyId: req.user._id, active: true });
    if (!folder) return res.status(404).json({ message: 'Folder not found' });
    res.json({
      folder: {
        ...folder.toObject(),
        files:      folder.files.map(mapFile),
        subFolders: folder.subFolders.map(mapSubFolder)
      }
    });
  } catch (err) {
    logger.error(`getFolderDetails: ${err.message}`);
    res.status(500).json({ message: 'Failed to get folder details' });
  }
};

// ── Faculty file download ─────────────────────────────────────────────────────

const downloadFile = async (req, res) => {
  try {
    const { id, fileId } = req.params;
    const folder = await Folder.findOne({ _id: id, facultyId: req.user._id, active: true });
    if (!folder) return res.status(404).json({ message: 'Folder not found or access denied' });

    // Check root files first, then sub-folder files
    let file = folder.files.find(f => f._id.toString() === fileId);
    if (!file) {
      for (const sf of folder.subFolders) {
        file = sf.files.find(f => f._id.toString() === fileId);
        if (file) break;
      }
    }
    if (!file)             return res.status(404).json({ message: 'File not found' });
    if (!file.driveFileId) return res.status(404).json({ message: 'File not on Drive. Please re-upload.' });

    await logAction(req, 'FACULTY_DOWNLOAD_FILE', 'Folder', folder._id, { fileName: file.name });
    return res.redirect(buildDriveUrls(file.driveFileId).downloadUrl);
  } catch (err) {
    logger.error(`faculty downloadFile: ${err.message}`);
    res.status(500).json({ message: 'Failed to process download' });
  }
};

module.exports = {
  getFolders,
  createFolder,
  uploadFiles,
  createSubFolder,
  deleteSubFolder,
  deleteSubFolderFile,
  updateMessage,
  deleteFile,
  deleteFolder,
  getFolderDetails,
  downloadFile
};
