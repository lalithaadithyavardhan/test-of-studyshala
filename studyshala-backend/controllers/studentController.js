const Folder = require('../models/Folder');
const User = require('../models/User');
const driveService = require('../services/driveService');
const { logAction } = require('../middleware/logging');
const logger = require('../utils/logger');

// Validate access code - returns material details but does NOT save yet
const validateAccessCode = async (req, res) => {
  try {
    const { accessCode } = req.body;

    if (!accessCode || !accessCode.trim()) {
      return res.status(400).json({ message: 'Access code required' });
    }

    const code = accessCode.trim().toUpperCase();

    const folder = await Folder.findOne({
      $or: [{ accessCode: code }, { departmentCode: code }],
      active: true
    });

    if (!folder) {
      return res.json({ valid: false, message: 'Code not found or inactive' });
    }

    // Add to access history (if not already present)
    const historyExists = req.user.accessHistory.find(
      h => h.materialId.toString() === folder._id.toString()
    );

    if (!historyExists) {
      req.user.accessHistory.push({
        materialId: folder._id,
        accessCode: code,
        accessedAt: new Date()
      });
      await req.user.save();
    }

    folder.accessCount += 1;
    await folder.save();

    await logAction(req, 'ACCESS_MATERIAL', 'Folder', folder._id, { code });

    res.json({
      valid: true,
      material: {
        _id: folder._id,
        subjectName: folder.subjectName,
        department: folder.department,
        semester: folder.semester,
        facultyName: folder.facultyName,
        accessCode: folder.accessCode || folder.departmentCode,
        permission: folder.permission,
        fileCount: folder.files?.length || 0,
        createdAt: folder.createdAt,
        files: folder.files.map(f => ({
          _id: f._id,
          name: f.name,
          mimeType: f.mimeType,
          size: f.size,
          uploadedAt: f.uploadedAt
        }))
      }
    });
  } catch (error) {
    logger.error(`Validate access code error: ${error.message}`);
    res.status(500).json({ message: 'Validation failed' });
  }
};

// Save material to "My Materials"
const saveMaterial = async (req, res) => {
  try {
    const { materialId } = req.body;

    if (!materialId) {
      return res.status(400).json({ message: 'Material ID required' });
    }

    const folder = await Folder.findOne({ _id: materialId, active: true });
    if (!folder) {
      return res.status(404).json({ message: 'Material not found' });
    }

    // Check if already saved
    const alreadySaved = req.user.savedMaterials.find(
      m => m.materialId.toString() === materialId
    );

    if (alreadySaved) {
      return res.json({ message: 'Material already saved', alreadySaved: true });
    }

    req.user.savedMaterials.push({
      materialId,
      savedAt: new Date()
    });
    await req.user.save();

    await logAction(req, 'SAVE_MATERIAL', 'Folder', folder._id, { subjectName: folder.subjectName });

    res.json({ message: 'Material saved successfully', saved: true });
  } catch (error) {
    logger.error(`Save material error: ${error.message}`);
    res.status(500).json({ message: 'Failed to save material' });
  }
};

// Get saved materials
const getSavedMaterials = async (req, res) => {
  try {
    const materialIds = req.user.savedMaterials.map(m => m.materialId);

    const folders = await Folder.find({
      _id: { $in: materialIds },
      active: true
    }).sort({ createdAt: -1 });

    const materials = folders.map(m => {
      const savedEntry = req.user.savedMaterials.find(
        s => s.materialId.toString() === m._id.toString()
      );

      return {
        _id: m._id,
        subjectName: m.subjectName,
        department: m.department,
        semester: m.semester,
        facultyName: m.facultyName,
        accessCode: m.accessCode || m.departmentCode,
        fileCount: m.files?.length || 0,
        savedAt: savedEntry?.savedAt,
        createdAt: m.createdAt
      };
    });

    res.json({ materials });
  } catch (error) {
    logger.error(`Get saved materials error: ${error.message}`);
    res.status(500).json({ message: 'Failed to fetch saved materials' });
  }
};

// Get access history
const getAccessHistory = async (req, res) => {
  try {
    const materialIds = req.user.accessHistory.map(h => h.materialId);

    const folders = await Folder.find({
      _id: { $in: materialIds },
      active: true
    }).sort({ createdAt: -1 });

    const history = req.user.accessHistory.map(h => {
      const folder = folders.find(f => f._id.toString() === h.materialId.toString());
      
      if (!folder) return null;

      const isSaved = req.user.savedMaterials.some(
        s => s.materialId.toString() === folder._id.toString()
      );

      return {
        _id: folder._id,
        subjectName: folder.subjectName,
        department: folder.department,
        semester: folder.semester,
        facultyName: folder.facultyName,
        accessCode: h.accessCode,
        fileCount: folder.files?.length || 0,
        accessedAt: h.accessedAt,
        isSaved
      };
    }).filter(Boolean);

    res.json({ history });
  } catch (error) {
    logger.error(`Get access history error: ${error.message}`);
    res.status(500).json({ message: 'Failed to fetch access history' });
  }
};

// Get files in a material (for preview/download from saved or history)
const getMaterialFiles = async (req, res) => {
  try {
    const { id } = req.params;
    const folder = await Folder.findOne({ _id: id, active: true });

    if (!folder) {
      return res.status(404).json({ message: 'Material not found' });
    }

    // Check access: must be in savedMaterials or accessHistory
    const hasAccess = 
      req.user.savedMaterials.some(m => m.materialId.toString() === id) ||
      req.user.accessHistory.some(h => h.materialId.toString() === id);

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({
      material: {
        _id: folder._id,
        subjectName: folder.subjectName,
        department: folder.department,
        semester: folder.semester,
        facultyName: folder.facultyName,
        permission: folder.permission
      },
      files: folder.files.map(f => ({
        _id: f._id,
        name: f.name,
        mimeType: f.mimeType,
        size: f.size,
        uploadedAt: f.uploadedAt
      }))
    });
  } catch (error) {
    logger.error(`Get material files error: ${error.message}`);
    res.status(500).json({ message: 'Failed to fetch files' });
  }
};

// Download a file
const downloadFile = async (req, res) => {
  try {
    const { id, fileId } = req.params;
    const folder = await Folder.findOne({ _id: id, active: true });

    if (!folder) {
      return res.status(404).json({ message: 'Material not found' });
    }

    const hasAccess = 
      req.user.savedMaterials.some(m => m.materialId.toString() === id) ||
      req.user.accessHistory.some(h => h.materialId.toString() === id);

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
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

        await logAction(req, 'DOWNLOAD_FILE', 'Folder', folder._id, { fileName: file.name });
        return res.send(buffer);
      } catch (driveErr) {
        logger.error(`Drive download failed: ${driveErr.message}`);
        return res.status(500).json({ message: 'File download failed' });
      }
    }

    return res.status(404).json({ message: 'File content not available' });
  } catch (error) {
    logger.error(`Download file error: ${error.message}`);
    res.status(500).json({ message: 'Failed to download file' });
  }
};

// Remove from saved materials
const removeSavedMaterial = async (req, res) => {
  try {
    const { id } = req.params;

    req.user.savedMaterials = req.user.savedMaterials.filter(
      m => m.materialId.toString() !== id
    );
    await req.user.save();

    await logAction(req, 'REMOVE_SAVED_MATERIAL', 'Folder', id, {});
    res.json({ message: 'Material removed from saved list' });
  } catch (error) {
    logger.error(`Remove saved material error: ${error.message}`);
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
