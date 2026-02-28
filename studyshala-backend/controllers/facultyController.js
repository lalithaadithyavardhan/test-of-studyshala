const Folder = require('../models/Folder');
const User   = require('../models/User');
const driveService = require('../services/driveService');
const { logAction } = require('../middleware/logging');
const logger = require('../utils/logger');
const crypto = require('crypto');

const generateUniqueCode = async () => {
  let code, exists;
  do {
    code = crypto.randomBytes(4).toString('hex').toUpperCase();
    exists = await Folder.findOne({ accessCode: code, active: true });
  } while (exists);
  return code;
};

const driveUrls = (driveFileId) => ({
  downloadUrl: driveFileId
    ? `https://drive.usercontent.google.com/download?id=${driveFileId}&export=download&authuser=0`
    : null,
  previewUrl: driveFileId
    ? `https://drive.google.com/file/d/${driveFileId}/preview`
    : null
});

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
const getFolders = async (req, res) => {
  try {
    const folders = await Folder.find({ facultyId: req.user._id, active: true }).sort({ createdAt: -1 });
    // Include driveUrls per file so FacultyMaterials page can preview/download too
    const result = folders.map(f => ({ ...f.toObject(), files: f.files.map(mapFile) }));
    res.json({ folders: result });
  } catch (err) {
    logger.error(`getFolders: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch folders' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
const createFolder = async (req, res) => {
  try {
    const { department, semester, subjectName, facultyName } = req.body;
    // FIX: permission field removed — always public reader for anyone with the code
    if (!department || !semester || !subjectName || !facultyName) {
      return res.status(400).json({ message: 'All fields required' });
    }

    const accessCode  = await generateUniqueCode();
    const folderName  = `${department}-S${semester}-${subjectName}`;
    let driveUrl      = '#';
    let driveFolderId = `local-${Date.now()}`;

    if (driveService.enabled) {
      try {
        const { folderId, folderUrl } = await driveService.createFolder(folderName);
        driveUrl      = folderUrl;
        driveFolderId = folderId;
        // Always reader so any Google account — or none — can access
        await driveService.setFolderPermissions(folderId, 'view');
      } catch (driveErr) {
        logger.warn(`Drive folder creation skipped: ${driveErr.message}`);
      }
    }

    const folder = new Folder({
      facultyId: req.user._id,
      facultyName,
      subjectName,
      department,
      semester,
      accessCode,
      departmentCode: accessCode,
      permission: 'view',
      driveUrl,
      driveFolderId,
      files: []
    });

    await folder.save();
    await logAction(req, 'CREATE_FOLDER', 'Folder', folder._id, { subjectName, department, semester, facultyName });
    logger.info(`Folder created: ${folderName} [${accessCode}] by ${req.user.email}`);
    res.status(201).json({ folder });
  } catch (err) {
    logger.error(`createFolder: ${err.message}`);
    res.status(500).json({ message: 'Failed to create folder' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
const uploadFiles = async (req, res) => {
  try {
    const { id } = req.params;
    const folder = await Folder.findOne({ _id: id, facultyId: req.user._id, active: true });
    if (!folder)                            return res.status(404).json({ message: 'Folder not found or access denied' });
    if (!req.files || !req.files.length)    return res.status(400).json({ message: 'No files uploaded' });

    const uploaded = [];

    for (const file of req.files) {
      let driveFileId = null;
      let fileSize    = file.size;

      if (driveService.enabled && folder.driveFolderId && !folder.driveFolderId.startsWith('local')) {
        try {
          const r = await driveService.uploadFile(file.buffer, file.originalname, file.mimetype, folder.driveFolderId);
          driveFileId = r.fileId;
          fileSize    = r.size;
        } catch (driveErr) {
          logger.warn(`Drive upload failed for ${file.originalname}: ${driveErr.message}`);
        }
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

      folder.files.push(doc);
      uploaded.push(doc);
    }

    await folder.save();
    await logAction(req, 'UPLOAD_FILES', 'Folder', folder._id, { fileCount: uploaded.length });
    logger.info(`${uploaded.length} files uploaded to ${folder.subjectName} by ${req.user.email}`);
    res.json({ message: `${uploaded.length} file(s) uploaded`, files: uploaded.map(mapFile) });
  } catch (err) {
    logger.error(`uploadFiles: ${err.message}`);
    res.status(500).json({ message: 'Failed to upload files' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
const deleteFile = async (req, res) => {
  try {
    const { id, fileId } = req.params;
    const folder = await Folder.findOne({ _id: id, facultyId: req.user._id, active: true });
    if (!folder) return res.status(404).json({ message: 'Folder not found' });

    const idx = folder.files.findIndex(f => f._id.toString() === fileId);
    if (idx === -1) return res.status(404).json({ message: 'File not found' });

    const file = folder.files[idx];
    if (file.driveFileId && driveService.enabled) {
      try { await driveService.deleteFile(file.driveFileId); } catch (e) { logger.warn(e.message); }
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

// ─────────────────────────────────────────────────────────────────────────────
const deleteFolder = async (req, res) => {
  try {
    const { id } = req.params;
    const folder = await Folder.findOne({ _id: id, facultyId: req.user._id });
    if (!folder) return res.status(404).json({ message: 'Folder not found' });

    if (driveService.enabled && folder.driveFolderId && !folder.driveFolderId.startsWith('local')) {
      try { await driveService.deleteFolder(folder.driveFolderId); } catch (e) { logger.warn(e.message); }
    }

    await User.updateMany({ 'savedMaterials.materialId': id }, { $pull: { savedMaterials: { materialId: id } } });
    await User.updateMany({ 'accessHistory.materialId':  id }, { $pull: { accessHistory:  { materialId: id } } });

    folder.active = false;
    await folder.save();
    await logAction(req, 'DELETE_FOLDER', 'Folder', folder._id, { subjectName: folder.subjectName });
    res.json({ message: 'Material deleted and removed from all students' });
  } catch (err) {
    logger.error(`deleteFolder: ${err.message}`);
    res.status(500).json({ message: 'Failed to delete folder' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
const getFolderDetails = async (req, res) => {
  try {
    const folder = await Folder.findOne({ _id: req.params.id, facultyId: req.user._id, active: true });
    if (!folder) return res.status(404).json({ message: 'Folder not found' });
    res.json({ folder });
  } catch (err) {
    logger.error(`getFolderDetails: ${err.message}`);
    res.status(500).json({ message: 'Failed to get folder details' });
  }
};

// Faculty download — same redirect approach, no REFRESH_TOKEN needed
const downloadFile = async (req, res) => {
  try {
    const { id, fileId } = req.params;
    const folder = await Folder.findOne({ _id: id, facultyId: req.user._id, active: true });
    if (!folder) return res.status(404).json({ message: 'Folder not found or access denied' });

    const file = folder.files.find(f => f._id.toString() === fileId);
    if (!file)             return res.status(404).json({ message: 'File not found' });
    if (!file.driveFileId) return res.status(404).json({ message: 'File has no Drive ID' });

    await logAction(req, 'FACULTY_DOWNLOAD_FILE', 'Folder', folder._id, { fileName: file.name });
    return res.redirect(driveUrls(file.driveFileId).downloadUrl);
  } catch (err) {
    logger.error(`faculty downloadFile: ${err.message}`);
    res.status(500).json({ message: 'Failed to download file' });
  }
};

module.exports = { getFolders, createFolder, uploadFiles, deleteFile, deleteFolder, getFolderDetails, downloadFile };
