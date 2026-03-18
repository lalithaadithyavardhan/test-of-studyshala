/**
 * storageController  v2
 * =====================
 * Endpoints:
 *
 *  GET /api/storage/my-drive
 *    → Calls Google Drive API with the LOGGED-IN USER's own OAuth token.
 *    → Returns their personal Google Drive quota (e.g. 15 GB free accounts)
 *      and how much of it they've used — ACROSS ALL their Google activity,
 *      not just StudyShala. This is the correct "how full is my Drive?" answer.
 *
 *  GET /api/storage/my-studyshala
 *    → Faculty:  sum of file sizes stored on StudyShala (from MongoDB).
 *    → Student:  sum of file sizes in their saved materials (from MongoDB).
 *    → No Drive API call needed — pure MongoDB aggregation.
 *
 * WHY we no longer use /api/storage (old service-account endpoint):
 *    The old endpoint used the platform's service-account Drive token.
 *    Service accounts get a 2TB quota — shared by the whole platform.
 *    Every user saw the same 2TB number. That was wrong.
 *    Each user's personal Drive has its own quota (usually 15 GB free)
 *    which requires calling Drive API with THEIR OWN token.
 */

const { google } = require('googleapis');
const Folder     = require('../models/Folder');
const logger     = require('../utils/logger');

// ── Helper: build a Drive client from the user's stored OAuth access token ────
const userDriveClient = (accessToken) => {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ access_token: accessToken });
  return google.drive({ version: 'v3', auth });
};

// ── 1. Personal Google Drive quota for the logged-in user ────────────────────
exports.getMyDriveStorage = async (req, res) => {
  try {
    const token = req.user.googleAccessToken;

    if (!token) {
      // Token not yet stored — user needs to log out and back in once.
      return res.status(202).json({
        needsRelogin: true,
        message: 'Please log out and log back in once to enable Drive quota display.'
      });
    }

    const drive = userDriveClient(token);
    const about = await drive.about.get({ fields: 'storageQuota' });
    const quota = about.data.storageQuota;

    /*
     * Google Drive storageQuota fields:
     *   limit        — total quota in bytes (e.g. 16106127360 = 15 GB)
     *   usage        — total bytes used across ALL Google products (Drive + Gmail + Photos)
     *   usageInDrive — bytes used only in Drive files
     *   usageInDriveTrash — bytes in trash (still counted against quota)
     */
    res.json({
      limit:              parseInt(quota.limit              || 0),
      usage:              parseInt(quota.usage              || 0),   // total (Drive+Gmail+Photos)
      usageInDrive:       parseInt(quota.usageInDrive       || 0),   // Drive files only
      usageInDriveTrash:  parseInt(quota.usageInDriveTrash  || 0),
    });

  } catch (err) {
    // Token may have expired (Google short-lived tokens expire in ~1hr)
    if (err.code === 401 || err.message?.includes('invalid_grant') || err.message?.includes('Invalid Credentials')) {
      return res.status(202).json({
        needsRelogin: true,
        message: 'Google session expired. Please log out and log back in.'
      });
    }
    logger.error(`getMyDriveStorage: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch Drive quota' });
  }
};

// ── 2. StudyShala-specific usage for the logged-in user ──────────────────────
exports.getMyStudyshalaUsage = async (req, res) => {
  try {
    const role = req.user.role;
    let totalBytes = 0, totalFiles = 0, totalMaterials = 0;

    if (role === 'faculty' || role === 'admin') {
      // Faculty: files they've uploaded
      const folders = await Folder.find({ facultyId: req.user._id, active: true });
      totalMaterials = folders.length;
      for (const folder of folders) {
        for (const file of folder.files) { totalBytes += file.size || 0; totalFiles++; }
        for (const sf of folder.subFolders) {
          for (const file of sf.files) { totalBytes += file.size || 0; totalFiles++; }
        }
      }
    } else {
      // Student: files in their saved materials
      const savedIds = req.user.savedMaterials.map(m => m.materialId);
      const folders  = await Folder.find({ _id: { $in: savedIds }, active: true });
      totalMaterials = folders.length;
      for (const folder of folders) {
        for (const file of folder.files) { totalBytes += file.size || 0; totalFiles++; }
        for (const sf of folder.subFolders) {
          for (const file of sf.files) { totalBytes += file.size || 0; totalFiles++; }
        }
      }
    }

    res.json({ role, totalBytes, totalFiles, totalMaterials });

  } catch (err) {
    logger.error(`getMyStudyshalaUsage: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch StudyShala usage' });
  }
};
