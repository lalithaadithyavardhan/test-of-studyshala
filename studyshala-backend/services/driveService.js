/**
 * DriveService
 * ============
 * ARCHITECTURE: "anyoneWithLink" at upload time.
 *
 * Every file gets role:reader / type:anyone the moment it is uploaded.
 * Access control lives in MongoDB: a student must validate the correct
 * code to learn a fileId. Without the fileId, the Drive URL is unreachable.
 *
 * GOOGLE_DRIVE_REFRESH_TOKEN is needed only for upload/delete.
 * Downloads and previews are direct browser→Drive redirects — no token needed.
 *
 * FIX: Drive API uses its own dedicated OAuth2 client (GOOGLE_DRIVE_CLIENT_ID,
 * GOOGLE_DRIVE_CLIENT_SECRET) — completely separate from the user login OAuth
 * client (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET). This prevents conflicts.
 */

const { google } = require('googleapis');
const stream     = require('stream');
const logger     = require('../utils/logger');

class DriveService {
  constructor () {
    // FIX: Use dedicated Drive API credentials (separate from login OAuth)
    // In your .env, GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET
    // should be from the same Google Cloud project but configured for Drive API,
    // with GOOGLE_DRIVE_REDIRECT_URI pointing to a separate /api/auth/drive/callback
    // (or just use urn:ietf:wg:oauth:2.0:oob for offline token generation)
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
      logger.warn('DriveService: GOOGLE_DRIVE_REFRESH_TOKEN missing — file uploads disabled.');
      logger.warn('See README for how to generate your refresh token.');
    }
  }

  // ── Folder operations ───────────────────────────────────────────────────

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

  // ── File operations ─────────────────────────────────────────────────────

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

    // Make file publicly accessible — anyoneWithLink reader forever
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
