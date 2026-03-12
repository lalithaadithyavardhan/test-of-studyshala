const User   = require('../models/User');
const Folder = require('../models/Folder');
const Log    = require('../models/Log');
const { logAction } = require('../middleware/logging');
const logger = require('../utils/logger');

// Get system statistics
const getStats = async (req, res) => {
  try {
    const [totalUsers, totalFaculty, totalStudents, totalMaterials, activeFolders] = await Promise.all([
      User.countDocuments({ active: true }),
      User.countDocuments({ role: 'faculty', active: true }),
      User.countDocuments({ role: 'student', active: true }),
      Folder.countDocuments(),
      Folder.countDocuments({ active: true })
    ]);

    const departments    = await Folder.distinct('department');
    const totalDepartments = departments.length;

    res.json({ totalUsers, totalFaculty, totalStudents, totalDepartments, totalMaterials });
  } catch (error) {
    logger.error(`Get stats error: ${error.message}`);
    res.status(500).json({ message: 'Failed to fetch statistics' });
  }
};

// Get all users
const getUsers = async (req, res) => {
  try {
    const { search, role, page = 1, limit = 10 } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name:  { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) query.role = role;

    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      User.find(query).select('-__v').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      User.countDocuments(query)
    ]);

    res.json({
      users,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    logger.error(`Get users error: ${error.message}`);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};

// Get analytics data
const getAnalytics = async (req, res) => {
  try {
    const activeFacultyData = await Folder.aggregate([
      { $match: { active: true } },
      { $group: { _id: '$facultyId', materialsCount: { $sum: 1 } } },
      { $sort: { materialsCount: -1 } },
      { $limit: 5 }
    ]);

    const activeFaculty = await Promise.all(
      activeFacultyData.map(async (item) => {
        const user = await User.findById(item._id).select('name email');
        return {
          name:           user?.name || 'Unknown',
          email:          user?.email || 'Unknown',
          materialsCount: item.materialsCount
        };
      })
    );

    const popularSubjects = await Folder.aggregate([
      { $match: { active: true } },
      { $group: { _id: '$subjectName', accessCount: { $sum: '$accessCount' }, department: { $first: '$department' } } },
      { $sort: { accessCount: -1 } },
      { $limit: 5 }
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dailyActiveUsers = await User.countDocuments({ lastLogin: { $gte: today }, active: true });

    const recentActivity = await Log.find()
      .populate('userId', 'name email role')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      activeFaculty,
      popularSubjects: popularSubjects.map(s => ({ name: s._id, department: s.department, accessCount: s.accessCount })),
      dailyActiveUsers,
      recentActivity
    });
  } catch (error) {
    logger.error(`Get analytics error: ${error.message}`);
    res.status(500).json({ message: 'Failed to fetch analytics' });
  }
};

// Deactivate user
const deactivateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') return res.status(403).json({ message: 'Cannot deactivate admin users' });

    user.active = false;
    await user.save();
    await logAction(req, 'DEACTIVATE_USER', 'User', user._id, { userName: user.name, userEmail: user.email });
    logger.info(`User deactivated by ${req.user.email}: ${user.email}`);
    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    logger.error(`Deactivate user error: ${error.message}`);
    res.status(500).json({ message: 'Failed to deactivate user' });
  }
};

// Activate user
const activateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.active = true;
    await user.save();
    await logAction(req, 'ACTIVATE_USER', 'User', user._id, { userName: user.name, userEmail: user.email });
    logger.info(`User activated by ${req.user.email}: ${user.email}`);
    res.json({ message: 'User activated successfully' });
  } catch (error) {
    logger.error(`Activate user error: ${error.message}`);
    res.status(500).json({ message: 'Failed to activate user' });
  }
};

// Remove user
const removeUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') return res.status(403).json({ message: 'Cannot remove admin users' });

    if (user.role === 'faculty') {
      // FIX: Soft-delete faculty folders (consistent with facultyController.deleteFolder)
      // Also clean up student savedMaterials and accessHistory for those folders
      const folders = await Folder.find({ facultyId: user._id, active: true });
      const folderIds = folders.map(f => f._id);

      if (folderIds.length > 0) {
        // Remove from all students' saved lists and history
        await User.updateMany(
          { 'savedMaterials.materialId': { $in: folderIds } },
          { $pull: { savedMaterials: { materialId: { $in: folderIds } } } }
        );
        await User.updateMany(
          { 'accessHistory.materialId': { $in: folderIds } },
          { $pull: { accessHistory: { materialId: { $in: folderIds } } } }
        );

        // Soft-delete all their folders
        await Folder.updateMany({ facultyId: user._id }, { $set: { active: false } });
      }
    }

    await User.findByIdAndDelete(id);
    await logAction(req, 'REMOVE_USER', 'User', user._id, { userName: user.name, userEmail: user.email });
    logger.info(`User removed by ${req.user.email}: ${user.email}`);
    res.json({ message: 'User removed successfully' });
  } catch (error) {
    logger.error(`Remove user error: ${error.message}`);
    res.status(500).json({ message: 'Failed to remove user' });
  }
};

// Update user role
const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!['student', 'faculty', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.role = role;
    await user.save();
    await logAction(req, 'UPDATE_USER_ROLE', 'User', user._id, { userName: user.name, newRole: role });
    logger.info(`User role updated by ${req.user.email}: ${user.email} -> ${role}`);
    res.json({ message: 'User role updated successfully', user });
  } catch (error) {
    logger.error(`Update user role error: ${error.message}`);
    res.status(500).json({ message: 'Failed to update user role' });
  }
};

// Self-promote: one-time bootstrap to make yourself admin
// Only works if your email is already in ADMIN_EMAILS in .env
const selfPromote = async (req, res) => {
  try {
    const email = req.user.email.toLowerCase();
    const adminEmails = (process.env.ADMIN_EMAILS || '')
      .split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

    if (!adminEmails.includes(email)) {
      return res.status(403).json({
        message: `Your email (${email}) is not in the ADMIN_EMAILS list. Add it to .env and restart the backend.`
      });
    }

    req.user.role = 'admin';
    await req.user.save();

    const { generateToken } = require('../utils/jwt');
    const newToken = generateToken(req.user);

    res.json({
      message: 'You are now an admin!',
      token: newToken,
      user: { id: req.user._id, name: req.user.name, email: req.user.email, role: 'admin' }
    });
  } catch (error) {
    logger.error(`Self-promote error: ${error.message}`);
    res.status(500).json({ message: 'Failed to promote user' });
  }
};

module.exports = { getStats, getUsers, getAnalytics, deactivateUser, activateUser, removeUser, updateUserRole, selfPromote };
