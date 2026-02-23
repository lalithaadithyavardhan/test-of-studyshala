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
    const { department, semester, subjectName, facultyName, permission } = req.body;

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
        await driveService.setFolderPermissions(folderId, permission || 'view');
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
      permission: permission || 'view',
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

    // Delete from Drive
    if (driveService.enabled && folder.driveFolderId && !folder.driveFolderId.startsWith('local')) {
      try {
        await driveService.deleteFolder(folder.driveFolderId);
      } catch (driveErr) {
        logger.warn(`Drive folder delete skipped: ${driveErr.message}`);
      }
    }

    // Remove from all students' savedMaterials and accessHistory
    await User.updateMany(
      { 'savedMaterials.materialId': id },
      { $pull: { savedMaterials: { materialId: id } } }
    );

    await User.updateMany(
      { 'accessHistory.materialId': id },
      { $pull: { accessHistory: { materialId: id } } }
    );

    // Mark folder as inactive (soft delete)
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

module.exports = {
  getFolders,
  createFolder,
  uploadFiles,
  deleteFile,
  deleteFolder,
  getFolderDetails
};
