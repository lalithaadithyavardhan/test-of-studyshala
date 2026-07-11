/**
 * DriveService  (FIXED)
 * ============
 * ARCHITECTURE: "anyoneWithLink" at upload time.
 *
 * Every file gets role:reader / type:anyone the moment it is uploaded.
 * Access control lives in MongoDB: a student must validate the correct
 * code to learn a fileId. Without the fileId, the Drive URL is unreachable.
 *
 * BUG FIX (this pass): every method in this file used one single, hardcoded
 * `this.drive` client — every upload from every faculty member always went
 * to the account behind GOOGLE_DRIVE_REFRESH_TOKEN, regardless of who logged
 * in or what permission they granted. There was no per-user routing at all.
 *
 * Now every method accepts a `user` argument. If that user has their own
 * driveRefreshToken (saved by config/passport.js at login), their file goes
 * to THEIR Drive. The GOOGLE_DRIVE_* app-level credentials are now only a
 * fallback for the rare case a faculty user has no token yet.
 *
 * CONVERSION: Non-PDF files (PPTX, DOCX, XLSX, etc.) are automatically
 * converted to PDF via Google Drive export before being stored. This ensures
 * all files are renderable offline in the mobile app.
 */

const { google } = require('googleapis');
const stream     = require('stream');
const logger     = require('../utils/logger');

// MIME types that must be converted to PDF before storing
const CONVERT_MIME_MAP = {
  // PowerPoint
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'application/vnd.google-apps.presentation',
  'application/vnd.ms-powerpoint':                                              'application/vnd.google-apps.presentation',
  // Word
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':   'application/vnd.google-apps.document',
  'application/msword':                                                         'application/vnd.google-apps.document',
  // Excel
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':         'application/vnd.google-apps.spreadsheet',
  'application/vnd.ms-excel':                                                   'application/vnd.google-apps.spreadsheet',
};

class DriveService {
  constructor () {
    // App-level fallback client (used ONLY when a faculty user has no token yet)
    this.appOauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_DRIVE_CLIENT_ID,
      process.env.GOOGLE_DRIVE_CLIENT_SECRET,
      process.env.GOOGLE_DRIVE_REDIRECT_URI
    );

    if (process.env.GOOGLE_DRIVE_REFRESH_TOKEN) {
      this.appOauth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN
      });
    }

    this.enabled = !!process.env.GOOGLE_DRIVE_REFRESH_TOKEN;

    if (!this.enabled) {
      logger.warn('DriveService: GOOGLE_DRIVE_REFRESH_TOKEN missing — fallback uploads disabled.');
    }
  }

  /**
   * Build a Drive client authenticated as the given faculty user.
   * Falls back to the app-level client only if the user has no stored tokens.
   *
   * IMPORTANT: this uses GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET (the SAME
   * client that issued the token in config/passport.js) — not the separate
   * GOOGLE_DRIVE_CLIENT_ID. A refresh token is only valid with the client
   * that originally issued it.
   */
  _getDriveForUser (user) {
    if (user && user.driveRefreshToken) {
      const oauth2 = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_CALLBACK_URL
      );
      oauth2.setCredentials({
        access_token:  user.driveAccessToken  || undefined,
        refresh_token: user.driveRefreshToken,
      });
      logger.info(`Using faculty Drive account: ${user.email}`);
      return google.drive({ version: 'v3', auth: oauth2 });
    }
    logger.warn(`No Drive tokens for user ${user?.email || 'unknown'} — using app fallback`);
    return google.drive({ version: 'v3', auth: this.appOauth2Client });
  }

  // ── Folder operations ───────────────────────────────────────────────────

  async createFolder (name, parentId = null, user = null) {
    const drive = this._getDriveForUser(user);
    const meta = { name, mimeType: 'application/vnd.google-apps.folder' };
    if (parentId) meta.parents = [parentId];
    const res = await drive.files.create({ resource: meta, fields: 'id, webViewLink' });
    logger.info(`Drive folder created: ${name} (${res.data.id})`);
    return { folderId: res.data.id, folderUrl: res.data.webViewLink };
  }

  async deleteFolder (folderId, user = null) {
    const drive = this._getDriveForUser(user);
    await drive.files.delete({ fileId: folderId });
    logger.info(`Drive folder deleted: ${folderId}`);
  }

  // ── File operations ─────────────────────────────────────────────────────

  /**
   * Upload a file to Drive and immediately set anyoneWithLink reader access.
   * Returns { fileId, webViewLink, size }.
   */
  async uploadFile (buffer, fileName, mimeType, folderId = null, user = null) {
    const drive = this._getDriveForUser(user);
    const pass = new stream.PassThrough();
    pass.end(buffer);

    const meta = { name: fileName };
    if (folderId) meta.parents = [folderId];

    const res = await drive.files.create({
      resource: meta,
      media:    { mimeType, body: pass },
      fields:   'id, name, webViewLink, size'
    });

    // Make file publicly accessible — anyoneWithLink reader forever
    await drive.permissions.create({
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

  /**
   * Upload a non-PDF file, convert it to PDF via Google Drive, then store
   * only the PDF. The intermediate Google Workspace file is deleted.
   * Returns { fileId, webViewLink, size, convertedName }.
   */
  async convertAndUploadAsPdf (buffer, fileName, mimeType, folderId = null, user = null) {
    const googleMimeType = CONVERT_MIME_MAP[mimeType];
    if (!googleMimeType) {
      throw new Error(`No conversion path for mimeType: ${mimeType}`);
    }

    const drive   = this._getDriveForUser(user);
    const pdfName = fileName.replace(/\.[^.]+$/, '.pdf');
    let intermediateFileId = null;

    try {
      // Step 1: Upload original file as Google Workspace format (triggers conversion)
      const pass = new stream.PassThrough();
      pass.end(buffer);

      const importRes = await drive.files.create({
        resource: { name: fileName, mimeType: googleMimeType },
        media:    { mimeType, body: pass },
        fields:   'id'
      });
      intermediateFileId = importRes.data.id;
      logger.info(`Intermediate Google Workspace file created: ${fileName} → ${intermediateFileId}`);

      // Step 2: Export as PDF (returns a readable stream)
      const exportRes = await drive.files.export(
        { fileId: intermediateFileId, mimeType: 'application/pdf' },
        { responseType: 'arraybuffer' }
      );

      const pdfBuffer = Buffer.from(exportRes.data);
      logger.info(`Exported to PDF: ${pdfName} (${pdfBuffer.length} bytes)`);

      // Step 3: Upload the PDF buffer as a regular file (same user's Drive)
      const result = await this.uploadFile(pdfBuffer, pdfName, 'application/pdf', folderId, user);

      logger.info(`PDF stored on Drive: ${pdfName} → ${result.fileId}`);
      return { ...result, convertedName: pdfName };

    } finally {
      // Always clean up the intermediate Google Workspace file
      if (intermediateFileId) {
        try {
          await drive.files.delete({ fileId: intermediateFileId });
          logger.info(`Intermediate file deleted: ${intermediateFileId}`);
        } catch (cleanupErr) {
          logger.warn(`Failed to delete intermediate file ${intermediateFileId}: ${cleanupErr.message}`);
        }
      }
    }
  }

  async deleteFile (fileId, user = null) {
    const drive = this._getDriveForUser(user);
    await drive.files.delete({ fileId });
    logger.info(`Drive file deleted: ${fileId}`);
  }

  async getFileMetadata (fileId, user = null) {
    const drive = this._getDriveForUser(user);
    const res = await drive.files.get({ fileId, fields: 'id, name, mimeType, size' });
    return res.data;
  }
}

module.exports = new DriveService();