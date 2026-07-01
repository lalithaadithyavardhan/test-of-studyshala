const Folder = require('../models/Folder');

const versionService = {

  // Increment folder version when faculty uploads or updates files
  async incrementVersion(folderId) {
    const folder = await Folder.findByIdAndUpdate(
      folderId,
      { $inc: { version: 1 }, updatedAt: new Date() },
      { new: true }
    );
    return folder.version;
  },

  // Get current version and file list for a folder
  async getVersionInfo(folderId) {
    const folder = await Folder.findById(folderId).select('version files updatedAt');
    if (!folder) throw new Error('Material not found');

    return {
      version: folder.version || 1,
      files: folder.files.map(f => ({
        fileId: f._id.toString(),
        name: f.name,
        mimeType: f.mimeType,
        size: f.size,
        driveFileId: f.driveFileId,
        uploadedAt: f.uploadedAt,
      })),
      updatedAt: folder.updatedAt,
    };
  },

  // Check if student's local version is outdated
  async hasUpdate(folderId, studentVersion) {
    const folder = await Folder.findById(folderId).select('version');
    if (!folder) return false;
    return (folder.version || 1) > (studentVersion || 0);
  },
};

module.exports = versionService;