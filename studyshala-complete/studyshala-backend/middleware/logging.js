const Log = require('../models/Log');
const logger = require('../utils/logger');

const logAction = async (req, action, resource = null, resourceId = null, details = {}) => {
  try {
    const logEntry = new Log({
      userId: req.user?._id,
      action,
      resource,
      resourceId,
      details,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    });

    await logEntry.save();
  } catch (error) {
    logger.error(`Error creating log: ${error.message}`);
  }
};

module.exports = { logAction };
