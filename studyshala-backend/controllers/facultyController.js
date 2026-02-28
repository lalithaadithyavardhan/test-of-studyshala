const Folder = require('../models/Folder');
const User = require('../models/User');
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

const getFolders = async (req, res) => {
  try {
    const folders = await Folder.find({
      facultyId: req.user._id,
      active: true
    }).sort({ createdAt: -1 });
    res.json({ folders });
  } catch (error) {
    logger.error(`Get folders error: ${error.message}`);
    res.status(500).json({ message: 'Failed to fetch folders' });
  }
};

const createFolder = async (req, res) => {
  try {
    const { department, semester, subjectName, facultyName } = req.body;
    // FIX: permission field removed from input - always 'view' (public access via code)

    if (!department || !semester || !subjectName || !facultyName) {
      return res.status(400).json({ 
        message: 'Department, semester, subject name, and faculty name required' 
      });
    }

    const accessCode = await generateUniqueCode();
    const folderName = `${department}-S${semester}-${subjectName}`;

    let driveUrl = '#';
    let driveFolderId = 'local-' + Date.now();

    if (driveService.enabled) {
      try {
        const { folderId, folderUrl } = await driveService.createFolder(folderName);
        driveUrl = folderUrl;
        driveFolderId = folderId;
        // FIX: always set Drive folder permissions to 'reader' (anyone with link can view)
        // This ensures ANY Google account can view/download - not just the uploader's account
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
      permission: 'view', // FIX: always 'view' - not user-selectable
      driveUrl,
      driveFolderId,
      files: []
    });

    await folder.save();
    await logAction(req, 'CREATE_FOLDER', 'Folder', folder._id, { 
      subjectName, department, semester, facultyName 
    });

    logger.info(`Folder created: ${folderName} [${accessCode}] by ${req.user.email}`);
    res.status(201).json({ folder });
  } catch (error) {
    logger.error(`Create folder error: ${error.message}`);
    res.status(500).json({ message: 'Failed to create folder' });
  }
};

const uploadFiles = async (req, res) => {
  try {
    const { id } = req.params;
    const folder = await Folder.findOne({ _id: id, facultyId: req.user._id, active: true });

    if (!folder) {
      return res.status(404).json({ message: 'Folder not found or access denied' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const uploadedFiles = [];

    for (const file of req.files) {
      let driveFileId = null;
      let driveViewLink = null;
      let fileSize = file.size;

      if (driveService.enabled && folder.driveFolderId && !folder.driveFolderId.startsWith('local')) {
        try {
          const driveResult = await driveService.uploadFile(
            file.buffer,
            file.originalname,
            file.mimetype,
            folder.driveFolderId
          );
          driveFileId = driveResult.fileId;
          driveViewLink = driveResult.webViewLink; // FIX: store view link for preview
          fileSize = driveResult.size;
        } catch (driveErr) {
          logger.warn(`Drive upload failed for ${file.originalname}: ${driveErr.message}`);
        }
      }

      const fileDoc = {
        name: file.originalname,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: fileSize,
        driveFileId,
        driveViewLink, // FIX: store for preview
        uploadedAt: new Date(),
        uploadedBy: req.user._id
      };

      folder.files.push(fileDoc);
      uploadedFiles.push(fileDoc);
    }

    await folder.save();

    await logAction(req, 'UPLOAD_FILES', 'Folder', folder._id, {
      fileCount: uploadedFiles.length,
      totalSize: uploadedFiles.reduce((sum, f) => sum + f.size, 0)
    });

    logger.info(`${uploadedFiles.length} files uploaded to ${folder.subjectName} by ${req.user.email}`);
    res.json({
      message: `${uploadedFiles.length} file(s) uploaded successfully`,
      files: uploadedFiles
    });
  } catch (error) {
    logger.error(`Upload files error: ${error.message}`);
    res.status(500).json({ message: 'Failed to upload files' });
  }
};

const deleteFile = async (req, res) => {
  try {
    const { id, fileId } = req.params;
    const folder = await Folder.findOne({ _id: id, facultyId: req.user._id, active: true });

    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    const fileIndex = folder.files.findIndex(f => f._id.toString() === fileId);
    if (fileIndex === -1) {
      return res.status(404).json({ message: 'File not found' });
    }

    const file = folder.files[fileIndex];

    if (file.driveFileId && driveService.enabled) {
      try {
        await driveService.deleteFile(file.driveFileId);
      } catch (driveErr) {
        logger.warn(`Drive file delete failed: ${driveErr.message}`);
      }
    }

    folder.files.splice(fileIndex, 1);
    await folder.save();

    await logAction(req, 'DELETE_FILE', 'Folder', folder._id, { fileName: file.name });
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    logger.error(`Delete file error: ${error.message}`);
    res.status(500).json({ message: 'Failed to delete file' });
  }
};

const deleteFolder = async (req, res) => {
  try {
    const { id } = req.params;
    const folder = await Folder.findOne({ _id: id, facultyId: req.user._id });

    if (!folder) return res.status(404).json({ message: 'Folder not found' });

    if (driveService.enabled && folder.driveFolderId && !folder.driveFolderId.startsWith('local')) {
      try {
        await driveService.deleteFolder(folder.driveFolderId);
      } catch (driveErr) {
        logger.warn(`Drive folder delete skipped: ${driveErr.message}`);
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
    logger.info(`Folder deleted: ${folder.subjectName} by ${req.user.email}`);
    
    res.json({ message: 'Material deleted successfully and removed from all students' });
  } catch (error) {
    logger.error(`Delete folder error: ${error.message}`);
    res.status(500).json({ message: 'Failed to delete folder' });
  }
};

const getFolderDetails = async (req, res) => {
  try {
    const folder = await Folder.findOne({
      _id: req.params.id,
      facultyId: req.user._id,
      active: true
    });

    if (!folder) return res.status(404).json({ message: 'Folder not found' });
    res.json({ folder });
  } catch (error) {
    logger.error(`Get folder details error: ${error.message}`);
    res.status(500).json({ message: 'Failed to get folder details' });
  }
};

// FIX: Faculty download - uses faculty route, so faculty can download their own files
const downloadFile = async (req, res) => {
  try {
    const { id, fileId } = req.params;
    // Faculty can only download from their own folders
    const folder = await Folder.findOne({ _id: id, facultyId: req.user._id, active: true });

    if (!folder) {
      return res.status(404).json({ message: 'Folder not found or access denied' });
    }

    const file = folder.files.find(f => f._id.toString() === fileId);
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    if (file.driveFileId && driveService.enabled) {
      try {
        const buffer = await driveService.downloadFile(file.driveFileId);
        res.set({
          'Content-Type': file.mimeType,
          'Content-Disposition': `attachment; filename="${encodeURIComponent(file.name)}"`,
          'Content-Length': buffer.length
        });
        await logAction(req, 'FACULTY_DOWNLOAD_FILE', 'Folder', folder._id, { fileName: file.name });
        return res.send(buffer);
      } catch (driveErr) {
        logger.error(`Drive download failed: ${driveErr.message}`);
        return res.status(500).json({ message: 'File download failed from Drive' });
      }
    }

    return res.status(404).json({ message: 'File content not available (Drive not configured)' });
  } catch (error) {
    logger.error(`Faculty download file error: ${error.message}`);
    res.status(500).json({ message: 'Failed to download file' });
  }
};

module.exports = {
  getFolders,
  createFolder,
  uploadFiles,
  deleteFile,
  deleteFolder,
  getFolderDetails,
  downloadFile  // FIX: export new faculty download
};
