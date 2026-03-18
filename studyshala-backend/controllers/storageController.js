/**
 * storageController  v3
 * =====================
 *
 * WHY the previous version failed:
 *   1. OAuth login scope was only ['profile','email'] — no Drive permission granted.
 *      The token was saved but Drive API rejected it with 403/401.
 *   2. We were building the Drive client with GOOGLE_CLIENT_ID (login OAuth app)
 *      which may not have Drive API enabled in Google Cloud Console.
 *
 * THE FIX:
 *   - authRoutes.js now requests 'drive.metadata.readonly' scope at login.
 *   - We build the user Drive client using GOOGLE_DRIVE_CLIENT_ID/SECRET
 *     (the same credentials already proven to work for file uploads).
 *   - If the token is missing or expired → return needsRelogin:true (soft error,
 *     widget shows a friendly message, not a red error box).
 *
 * Endpoints:
 *   GET /api/storage/my-drive       → personal Google Drive quota (user's token)
 *   GET /api/storage/my-studyshala  → StudyShala-specific usage (MongoDB)
 */

const { google } = require('googleapis');
const Folder     = require('../models/Folder');
const logger     = require('../utils/logger');

// ── Build a Drive client using the user's OWN access token
//    but with the Drive API OAuth credentials (these already have Drive API enabled)
const userDriveClient = (accessToken) => {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_DRIVE_CLIENT_ID,     // Drive API client (has Drive API enabled)
    process.env.GOOGLE_DRIVE_CLIENT_SECRET,
    process.env.GOOGLE_DRIVE_REDIRECT_URI
  );
  auth.setCredentials({ access_token: accessToken });
  return google.drive({ version: 'v3', auth });
};

// ── 1. Personal Google Drive quota ───────────────────────────────────────────
exports.getMyDriveStorage = async (req, res) => {
  try {
    const token = req.user.googleAccessToken;

    // Token not saved yet → user logged in before this feature was added
    if (!token) {
      return res.status(200).json({
        needsRelogin: true,
        message: 'Please log out and log back in once to enable Drive quota.'
      });
    }

    const drive = userDriveClient(token);
    const about = await drive.about.get({ fields: 'storageQuota' });
    const q     = about.data.storageQuota;

    return res.json({
      limit:             parseInt(q.limit             || 0),
      usage:             parseInt(q.usage             || 0),   // Drive + Gmail + Photos combined
      usageInDrive:      parseInt(q.usageInDrive      || 0),   // Drive files only
      usageInDriveTrash: parseInt(q.usageInDriveTrash || 0),
    });

  } catch (err) {
    const msg = err.message || '';
    // Token expired or insufficient scope → soft error, don't show red box
    if (
      err.code === 401 || err.code === 403 ||
      msg.includes('invalid_grant') ||
      msg.includes('Invalid Credentials') ||
      msg.includes('insufficientPermissions') ||
      msg.includes('Request had insufficient authentication scopes')
    ) {
      logger.warn(`getMyDriveStorage: token issue for ${req.user.email} — ${msg}`);
      return res.status(200).json({
        needsRelogin: true,
        message: 'Please log out and log back in to refresh Drive access.'
      });
    }
    logger.error(`getMyDriveStorage: ${msg}`);
    return res.status(500).json({ message: 'Failed to fetch Drive quota' });
  }
};

// ── 2. StudyShala-specific usage (pure MongoDB — no token needed) ─────────────
exports.getMyStudyshalaUsage = async (req, res) => {
  try {
    const role = req.user.role;
    let totalBytes = 0, totalFiles = 0, totalMaterials = 0;

    if (role === 'faculty' || role === 'admin') {
      const folders = await Folder.find({ facultyId: req.user._id, active: true });
      totalMaterials = folders.length;
      for (const f of folders) {
        for (const file of f.files) { totalBytes += file.size || 0; totalFiles++; }
        for (const sf of f.subFolders) {
          for (const file of sf.files) { totalBytes += file.size || 0; totalFiles++; }
        }
      }
    } else {
      const savedIds = req.user.savedMaterials.map(m => m.materialId);
      const folders  = await Folder.find({ _id: { $in: savedIds }, active: true });
      totalMaterials = folders.length;
      for (const f of folders) {
        for (const file of f.files) { totalBytes += file.size || 0; totalFiles++; }
        for (const sf of f.subFolders) {
          for (const file of sf.files) { totalBytes += file.size || 0; totalFiles++; }
        }
      }
    }

    return res.json({ role, totalBytes, totalFiles, totalMaterials });

  } catch (err) {
    logger.error(`getMyStudyshalaUsage: ${err.message}`);
    return res.status(500).json({ message: 'Failed to fetch StudyShala usage' });
  }
};
