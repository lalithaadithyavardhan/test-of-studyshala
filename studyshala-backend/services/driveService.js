const { google } = require('googleapis');
const stream = require('stream');
const logger = require('../utils/logger');

class DriveService {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_DRIVE_CLIENT_ID,
      process.env.GOOGLE_DRIVE_CLIENT_SECRET,
      process.env.GOOGLE_DRIVE_REDIRECT_URI
    );

    if (process.env.GOOGLE_DRIVE_REFRESH_TOKEN) {
      this.oauth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN
      });
    }

    this.drive = google.drive({
      version: 'v3',
      auth: this.oauth2Client
    });

    this.enabled = !!process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
  }

  // ─────────────────────────────────────────────
  // Folder operations
  // ─────────────────────────────────────────────

  async createFolder(folderName, parentFolderId = null) {
    try {
      const fileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder'
      };

      if (parentFolderId) {
        fileMetadata.parents = [parentFolderId];
      }

      const res = await this.drive.files.create({
        resource: fileMetadata,
        fields: 'id, webViewLink'
      });

      logger.info(`Folder created: ${folderName} (${res.data.id})`);

      return {
        folderId: res.data.id,
        folderUrl: res.data.webViewLink
      };
    } catch (error) {
      logger.error(`Create folder error: ${error.message}`);
      throw error;
    }
  }

  async deleteFolder(folderId) {
    try {
      await this.drive.files.delete({ fileId: folderId });
      logger.info(`Folder deleted: ${folderId}`);
    } catch (error) {
      logger.error(`Delete folder error: ${error.message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────────────
  // File operations
  // ─────────────────────────────────────────────

  /**
   * Upload a file to Google Drive
   * This version:
   * - Uploads the file
   * - Makes it readable by anyone
   * - Returns preview + download links
   */
  async uploadFile(fileBuffer, fileName, mimeType, folderId = null) {
    try {
      const bufferStream = new stream.PassThrough();
      bufferStream.end(fileBuffer);

      const fileMetadata = { name: fileName };
      if (folderId) {
        fileMetadata.parents = [folderId];
      }

      const media = {
        mimeType,
        body: bufferStream
      };

      const res = await this.drive.files.create({
        resource: fileMetadata,
        media,
        fields: 'id, name, size'
      });

      const fileId = res.data.id;

      // ✅ CRITICAL FIX: Make file readable by anyone
      await this.drive.permissions.create({
        fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone'
        }
      });

      // ✅ Correct Google Drive links
      const previewLink = `https://drive.google.com/file/d/${fileId}/preview`;
      const downloadLink = `https://drive.google.com/uc?id=${fileId}&export=download`;

      logger.info(`File uploaded: ${fileName} (${fileId})`);

      return {
        fileId,
        fileName,
        size: parseInt(res.data.size || 0, 10),
        previewLink,
        downloadLink
      };
    } catch (error) {
      logger.error(`Upload file error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Download file as buffer (optional use)
   * NOTE: frontend should prefer downloadLink instead
   */
  async downloadFile(fileId) {
    try {
      const res = await this.drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'arraybuffer' }
      );

      return Buffer.from(res.data);
    } catch (error) {
      logger.error(`Download file error: ${error.message}`);
      throw error;
    }
  }

  async getFileMetadata(fileId) {
    try {
      const res = await this.drive.files.get({
        fileId,
        fields: 'id, name, mimeType, size, createdTime, modifiedTime'
      });

      return res.data;
    } catch (error) {
      logger.error(`Get file metadata error: ${error.message}`);
      throw error;
    }
  }

  async listFiles(folderId) {
    try {
      const res = await this.drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType, size, createdTime, modifiedTime)',
        orderBy: 'createdTime desc'
      });

      return res.data.files || [];
    } catch (error) {
      logger.error(`List files error: ${error.message}`);
      throw error;
    }
  }

  async deleteFile(fileId) {
    try {
      await this.drive.files.delete({ fileId });
      logger.info(`File deleted: ${fileId}`);
    } catch (error) {
      logger.error(`Delete file error: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new DriveService();
