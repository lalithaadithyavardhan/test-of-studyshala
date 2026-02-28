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
        mimeType: 'application/vnd.google-apps.folder',
        ...(parentFolderId && { parents: [parentFolderId] })
      };

      const res = await this.drive.files.create({
        resource: metadata,
        fields: 'id'
      });

      const folderId = res.data.id;

      // ✅ CRITICAL: Make folder public
      await this.drive.permissions.create({
        fileId: folderId,
        requestBody: {
          type: 'anyone',
          role: 'reader'
        }
      });

      logger.info(`Folder created & shared: ${folderName} (${folderId})`);

      return folderId;
    } catch (err) {
      logger.error(`Create folder error: ${err.message}`);
      throw err;
    }
  }

  async deleteFolder(folderId) {
    await this.drive.files.delete({ fileId: folderId });
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
        fields: 'id, name, size, webViewLink, webContentLink'
      });

      const fileId = res.data.id;

      // ✅ CRITICAL: Make file public
      await this.drive.permissions.create({
        fileId,
        requestBody: {
          type: 'anyone',
          role: 'reader'
        }
      });

      // ✅ Reliable links
      const previewLink =
        res.data.webViewLink ||
        `https://drive.google.com/file/d/${fileId}/preview`;

      const downloadLink =
        res.data.webContentLink ||
        `https://drive.google.com/uc?id=${fileId}&export=download`;

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
    const res = await this.drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );
    return Buffer.from(res.data);
  }

  async deleteFile(fileId) {
    await this.drive.files.delete({ fileId });
  }
}

module.exports = new DriveService();
