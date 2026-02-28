/**
 * DriveService
 * ============
 * ARCHITECTURE: "anyoneWithLink" at upload time.
 *
 * Every file gets  role:reader / type:anyone  the moment it is uploaded.
 * This replaces the broken per-student permission model entirely.
 *
 * Access control lives in MongoDB: a student must validate the correct
 * 8-digit code to learn a fileId.  Without the fileId, the Drive URL is
 * unreachable.
 *
 * GOOGLE_DRIVE_REFRESH_TOKEN is needed only for upload/delete.
 * Downloads and previews are direct browser→Drive redirects — no token needed.
 */

const { google } = require('googleapis');
const stream     = require('stream');
const logger     = require('../utils/logger');

class DriveService {
  constructor () {
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

    this.drive   = google.drive({ version: 'v3', auth: this.oauth2Client });
    this.enabled = !!process.env.GOOGLE_DRIVE_REFRESH_TOKEN;

    if (!this.enabled) {
      logger.warn('DriveService: REFRESH_TOKEN missing — uploads disabled. Existing file downloads/previews still work.');
    }
  }

  // ── Folder operations ──────────────────────────────────────────────────

  async createFolder (name, parentId = null) {
    const meta = { name, mimeType: 'application/vnd.google-apps.folder' };
    if (parentId) meta.parents = [parentId];
    const res = await this.drive.files.create({ resource: meta, fields: 'id, webViewLink' });
    logger.info(`Drive folder created: ${name} (${res.data.id})`);
    return { folderId: res.data.id, folderUrl: res.data.webViewLink };
  }

  async deleteFolder (folderId) {
    await this.drive.files.delete({ fileId: folderId });
    logger.info(`Drive folder deleted: ${folderId}`);
  }

  // ── File operations ────────────────────────────────────────────────────

  /**
   * Upload a file to Drive and immediately set anyoneWithLink reader access.
   * Returns { fileId, webViewLink, size }.
   */
  async uploadFile (buffer, fileName, mimeType, folderId = null) {
    const pass = new stream.PassThrough();
    pass.end(buffer);

    const meta = { name: fileName };
    if (folderId) meta.parents = [folderId];

    const res = await this.drive.files.create({
      resource: meta,
      media:    { mimeType, body: pass },
      fields:   'id, name, webViewLink, size'
    });

    // Make file publicly accessible — one permission, forever, for all students
    await this.drive.permissions.create({
      fileId:      res.data.id,
      requestBody: { role: 'reader', type: 'anyone' }
    });

    logger.info(`File uploaded & public: ${fileName} (${res.data.id})`);
    return {
      fileId:      res.data.id,
      webViewLink: res.data.webViewLink,
      size:        parseInt(res.data.size || 0)
    };
  }

  async deleteFile (fileId) {
    await this.drive.files.delete({ fileId });
    logger.info(`Drive file deleted: ${fileId}`);
  }

  async getFileMetadata (fileId) {
    const res = await this.drive.files.get({ fileId, fields: 'id, name, mimeType, size' });
    return res.data;
  }
}

module.exports = new DriveService();
