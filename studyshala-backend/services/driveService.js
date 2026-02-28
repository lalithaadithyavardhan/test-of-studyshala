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

  /* ───────────────── Folder Operations ───────────────── */

  async createFolder(folderName, parentFolderId = null) {
    try {
      const metadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder'
      };

      if (parentFolderId) {
        metadata.parents = [parentFolderId];
      }

      const res = await this.drive.files.create({
        resource: metadata,
        fields: 'id',
        supportsAllDrives: true
      });

      const folderId = res.data.id;

      // Make folder public
      await this.drive.permissions.create({
        fileId: folderId,
        requestBody: {
          type: 'anyone',
          role: 'reader'
        },
        supportsAllDrives: true
      });

      logger.info(`Folder created & shared: ${folderName} (${folderId})`);

      return folderId;

    } catch (err) {
      logger.error(`Create folder error: ${err.message}`);
      throw err;
    }
  }

  async deleteFolder(folderId) {
    try {
      await this.drive.files.delete({
        fileId: folderId,
        supportsAllDrives: true
      });

      logger.info(`Folder deleted: ${folderId}`);

    } catch (err) {
      logger.error(`Delete folder error: ${err.message}`);
      throw err;
    }
  }

  /* ───────────────── File Operations ───────────────── */

  async uploadFile(fileBuffer, fileName, mimeType, folderId) {
    try {

      const bufferStream = new stream.PassThrough();
      bufferStream.end(fileBuffer);

      const res = await this.drive.files.create({
        resource: {
          name: fileName,
          parents: folderId ? [folderId] : []
        },
        media: {
          mimeType,
          body: bufferStream
        },
        fields: 'id, name, size, webViewLink, webContentLink',
        supportsAllDrives: true
      });

      const fileId = res.data.id;

      // Make file public
      await this.drive.permissions.create({
        fileId,
        requestBody: {
          type: 'anyone',
          role: 'reader'
        },
        supportsAllDrives: true
      });

      // Reliable preview link
      const previewLink =
        `https://drive.google.com/file/d/${fileId}/preview`;

      // Reliable download link
      const downloadLink =
        `https://drive.google.com/uc?export=download&id=${fileId}`;

      logger.info(`File uploaded & shared: ${fileName} (${fileId})`);

      return {
        fileId,
        fileName,
        size: Number(res.data.size || 0),
        previewLink,
        downloadLink
      };

    } catch (err) {
      logger.error(`Upload file error: ${err.message}`);
      throw err;
    }
  }

  async downloadFile(fileId) {
    try {

      const res = await this.drive.files.get(
        {
          fileId,
          alt: 'media',
          supportsAllDrives: true
        },
        {
          responseType: 'arraybuffer'
        }
      );

      return Buffer.from(res.data);

    } catch (err) {
      logger.error(`Download file error: ${err.message}`);
      throw err;
    }
  }

  async deleteFile(fileId) {
    try {

      await this.drive.files.delete({
        fileId,
        supportsAllDrives: true
      });

      logger.info(`File deleted: ${fileId}`);

    } catch (err) {
      logger.error(`Delete file error: ${err.message}`);
      throw err;
    }
  }

}

module.exports = new DriveService();
