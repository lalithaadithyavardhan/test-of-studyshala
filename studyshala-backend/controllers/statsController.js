const User   = require('../models/User');
const Folder = require('../models/Folder');
const Visit  = require('../models/Visit');
const logger = require('../utils/logger');

exports.getStats = async (req, res) => {
  try {
    const [totalUsers, totalStudents, totalFaculty, totalMaterials, totalVisits] = await Promise.all([
      User.countDocuments({ active: { $ne: false } }),
      User.countDocuments({ role: 'student', active: { $ne: false } }),
      User.countDocuments({ role: 'faculty', active: { $ne: false } }),
      Folder.countDocuments({ active: true }),
      Visit.countDocuments()
    ]);
    res.json({ totalUsers, totalStudents, totalFaculty, totalMaterials, totalVisits });
  } catch (err) {
    logger.error(`getStats: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
};
