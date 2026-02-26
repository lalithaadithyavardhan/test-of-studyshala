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
    const folders = await Folder.find({ facultyId: req.user._id, active: true }).sort({ createdAt: -1 });
    res.json({ folders });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch folders' });
  }
};

const createFolder = async (req, res) => {
  try {
    const { department, semester, subjectName, facultyName, permission } = req.body;
    const accessCode = await generateUniqueCode();
    const folderName = `${department}-S${semester}-${subjectName}`;

    let driveUrl = '#';
    let driveFolderId = null;

    if (driveService.enabled) {
      try {
        const { folderId, folderUrl } = await driveService.createFolder(folderName);
        driveUrl = folderUrl;
        driveFolderId = folderId;
        await driveService.setFolderPermissions(folderId, permission || 'view');
      } catch (driveErr) {
        logger.warn(`Drive folder creation failed: ${driveErr.message}`);
      }
    }

    const folder = new Folder({
      facultyId: req.user._id, facultyName, subjectName, department,
      semester, accessCode, departmentCode: accessCode,
      permission: permission || 'view', driveUrl, driveFolderId, files: []
    });

    await folder.save();
    res.status(201).json({ folder });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create folder' });
  }
};

const uploadFiles = async (req, res) => {
  try {
    const { id } = req.params;
    const folder = await Folder.findOne({ _id: id, facultyId: req.user._id, active: true });

    if (!folder) return res.status(404).json({ message: 'Folder not found' });
    if (!req.files || req.files.length === 0) return res.status(400).json({ message: 'No files uploaded' });

    const uploadedFiles = [];

    for (const file of req.files) {
      let driveFileId = null;

      if (driveService.enabled && folder.driveFolderId) {
        try {
          const driveResult = await driveService.uploadFile(
            file.buffer, file.originalname, file.mimetype, folder.driveFolderId
          );
          driveFileId = driveResult.fileId;
          
          // CRITICAL FIX: Make the individual file readable so Previews work!
          await driveService.setFolderPermissions(driveFileId, 'view');
          
        } catch (driveErr) {
          logger.warn(`Drive upload failed for ${file.originalname}`);
        }
      }

      const fileDoc = {
        name: file.originalname, originalName: file.originalname,
        mimeType: file.mimetype, size: file.size, driveFileId,
        uploadedAt: new Date(), uploadedBy: req.user._id
      };

      folder.files.push(fileDoc);
      uploadedFiles.push(fileDoc);
    }

    await folder.save();
    res.json({ message: 'Files uploaded successfully', files: uploadedFiles });
  } catch (error) {
    res.status(500).json({ message: 'Failed to upload files' });
  }
};

const deleteFile = async (req, res) => {
  try {
    const { id, fileId } = req.params;
    const folder = await Folder.findOne({ _id: id, facultyId: req.user._id, active: true });
    
    const fileIndex = folder.files.findIndex(f => String(f._id) === String(fileId));
    if (fileIndex > -1) {
      if (folder.files[fileIndex].driveFileId && driveService.enabled) {
        await driveService.deleteFile(folder.files[fileIndex].driveFileId);
      }
      folder.files.splice(fileIndex, 1);
      await folder.save();
    }
    res.json({ message: 'File deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete file' });
  }
};

const deleteFolder = async (req, res) => {
  try {
    const { id } = req.params;
    const folder = await Folder.findOne({ _id: id, facultyId: req.user._id });
    folder.active = false;
    await folder.save();
    res.json({ message: 'Material deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete folder' });
  }
};

const getFolderDetails = async (req, res) => {
  try {
    const folder = await Folder.findOne({ _id: req.params.id, facultyId: req.user._id, active: true });
    res.json({ folder });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get folder' });
  }
};

module.exports = { getFolders, createFolder, uploadFiles, deleteFile, deleteFolder, getFolderDetails };
