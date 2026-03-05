const driveService = require('../services/driveService');
const logger       = require('../utils/logger');

exports.getDriveStorage = async (req, res) => {
  try {
    if (!driveService.enabled) {
      return res.status(503).json({ message: 'Drive not configured' });
    }
    const response = await driveService.oauth2Client.getTokenInfo(
      (await driveService.oauth2Client.getAccessToken()).token
    ).catch(() => null);

    const about = await driveService.drive.about.get({ fields: 'storageQuota' });
    const quota = about.data.storageQuota;
    res.json({
      limit:        parseInt(quota.limit        || 0),
      usage:        parseInt(quota.usage        || 0),
      usageInDrive: parseInt(quota.usageInDrive || 0),
    });
  } catch (err) {
    logger.error(`getDriveStorage: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch storage info' });
  }
};
