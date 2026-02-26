const { google } = require('googleapis');
const stream = require('stream');
const fs = require('fs');
const path = require('path');
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

    // Listen for new tokens and persist them dynamically
    this.oauth2Client.on('tokens', (tokens) => {
      if (tokens.refresh_token) {
        process.env.GOOGLE_DRIVE_REFRESH_TOKEN = tokens.refresh_token;
        logger.info('Google Drive refresh token rotated and updated in memory.');
        
        // FIXED: Persist the rotated token to the .env file so it survives restarts
        try {
          // Resolve the path to the root .env file
          const envPath = path.resolve(process.cwd(), '.env');
          
          if (fs.existsSync(envPath)) {
            let envContent = fs.readFileSync(envPath, 'utf8');
            
            // Regex to match the existing token line
            const regex = /^GOOGLE_DRIVE_REFRESH_TOKEN=.*$/m;
            
            if (regex.test(envContent)) {
              // Replace existing token
              envContent = envContent.replace(regex, `GOOGLE_DRIVE_REFRESH_TOKEN=${tokens.refresh_token}`);
            } else {
              // Append if it doesn't exist for some reason
              envContent += `\nGOOGLE_DRIVE_REFRESH_TOKEN=${tokens.refresh_token}\n`;
            }
            
            fs.writeFileSync(envPath, envContent);
            logger.info('Google Drive refresh token successfully saved to .env file.');
          } else {
            logger.warn('No .env file found. Refresh token was not persisted to disk.');
          }
        } catch (err) {
          logger.error(`Failed to write new refresh token to .env file: ${err.message}`);
        }
      }
      
      if (tokens.access_token) {
        logger.info('Google Drive access token refreshed.');
      }
    });

    this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
    this.enabled = !!process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
  }

  // ── Folder operations ───────────────────────────────────────────────────
  async createFolder(folderName, parentFolderId = null) {
    try {
      const fileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder'
      };
      if (parentFolderId) fileMetadata.parents = [parentFolderId];

      const res = await this.drive.files.create({
        resource: fileMetadata,
        fields: 'id, webViewLink'
      });

      logger.info(`Folder created: ${folderName} (${res.data.id})`);
      return { folderId: res.data.id, folderUrl: res.data.webViewLink };
    } catch (error) {
      logger.error(`Create folder error: ${error.message}`);
      throw error;
    }
  }

  async setFolderPermissions(folderId, permission = 'view') {
    try {
      const role = { view: 'reader', comment: 'commenter', edit: 'writer' }[permission] || 'reader';
      await this.drive.permissions.create({
        fileId: folderId,
        requestBody: { role, type: 'anyone' }
      });
      logger.info(`Permissions set: ${folderId} → ${permission}`);
    } catch (error) {
      logger.error(`Set permissions error: ${error.message}`);
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

  // ── File operations ──────────────────────────────────────────────────────

  /**
   * Upload a file to Drive
   * @param {Buffer} fileBuffer - File buffer from multer
   * @param {string} fileName - Name to save as
   * @param {string} mimeType - MIME type
   * @param {string} folderId - Parent folder ID (optional)
   * @returns {Promise<{fileId: string, webViewLink: string, size: number}>}
   */
  async uploadFile(fileBuffer, fileName, mimeType, folderId = null) {
    try {
      const bufferStream = new stream.PassThrough();
      bufferStream.end(fileBuffer);

      const fileMetadata = { name: fileName };
      if (folderId) fileMetadata.parents = [folderId];

      const media = { mimeType, body: bufferStream };

      const res = await this.drive.files.create({
        resource: fileMetadata,
        media,
        fields: 'id, name, webViewLink, size'
      });

      // Make file publicly accessible (reader only)
      await this.drive.permissions.create({
        fileId: res.data.id,
        requestBody: { role: 'reader', type: 'anyone' }
      });

      logger.info(`File uploaded: ${fileName} (${res.data.id})`);
      return {
        fileId: res.data.id,
        webViewLink: res.data.webViewLink,
        size: parseInt(res.data.size || 0)
      };
    } catch (error) {
      logger.error(`Upload file error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Download a file from Drive as a readable stream to avoid OOM issues.
   * @param {string} fileId - Drive file ID
   * @returns {Promise<stream.Readable>}
   */
  async downloadFile(fileId) {
    try {
      const res = await this.drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'stream' }
      );
      return res.data; // This is a readable stream
    } catch (error) {
      logger.error(`Download file error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get file metadata
   * @param {string} fileId - Drive file ID
   * @returns {Promise<Object>}
   */
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

  /**
   * List files in a folder
   * @param {string} folderId - Drive folder ID
   * @returns {Promise<Array>}
   */
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

  /**
   * Delete a file
   * @param {string} fileId - Drive file ID
   */
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
