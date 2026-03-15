const User         = require('../models/User');
const Folder       = require('../models/Folder');
const Log          = require('../models/Log');
const Feedback     = require('../models/Feedback');
const Announcement = require('../models/Announcement');
const { logAction } = require('../middleware/logging');
const logger       = require('../utils/logger');

/* ════════════════════════════════════════════════════════════════════════════
   STATS
   ════════════════════════════════════════════════════════════════════════════ */
const getStats = async (req, res) => {
  try {
    const [totalUsers, totalFaculty, totalStudents, totalMaterials, activeMaterials, totalFeedback] = await Promise.all([
      User.countDocuments({ active: true }),
      User.countDocuments({ role: 'faculty', active: true }),
      User.countDocuments({ role: 'student', active: true }),
      Folder.countDocuments(),
      Folder.countDocuments({ active: true }),
      Feedback.countDocuments({ approved: true }),
    ]);
    const departments      = await Folder.distinct('department');
    const totalDepartments = departments.length;

    res.json({ totalUsers, totalFaculty, totalStudents, totalDepartments, totalMaterials, activeMaterials, totalFeedback });
  } catch (err) {
    logger.error(`getStats: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch statistics' });
  }
};

/* ════════════════════════════════════════════════════════════════════════════
   ANALYTICS
   ════════════════════════════════════════════════════════════════════════════ */
const getAnalytics = async (req, res) => {
  try {
    const { timeline = 'today' } = req.query;
    const now   = new Date();
    const since = new Date();
    if (timeline === 'today') { since.setHours(0, 0, 0, 0); }
    if (timeline === 'week')  { since.setDate(now.getDate() - 7); }
    if (timeline === 'month') { since.setMonth(now.getMonth() - 1); }

    // Most active faculty (by material count)
    const activeFacultyData = await Folder.aggregate([
      { $match: { active: true } },
      { $group: { _id: '$facultyId', materialsCount: { $sum: 1 }, totalAccess: { $sum: '$accessCount' } } },
      { $sort: { materialsCount: -1 } },
      { $limit: 5 }
    ]);
    const activeFaculty = await Promise.all(
      activeFacultyData.map(async (item) => {
        const user = await User.findById(item._id).select('name email');
        return { name: user?.name || 'Unknown', email: user?.email || '', materialsCount: item.materialsCount, totalAccess: item.totalAccess };
      })
    );

    // Popular materials
    const popularSubjects = await Folder.aggregate([
      { $match: { active: true } },
      { $group: { _id: '$subjectName', accessCount: { $sum: '$accessCount' }, department: { $first: '$department' } } },
      { $sort: { accessCount: -1 } },
      { $limit: 5 }
    ]);

    // Most active students
    const allStudents = await User.find({ role: 'student', active: true })
      .select('name email accessHistory savedMaterials')
      .lean();
    const activeStudents = allStudents
      .map(s => ({ name: s.name, email: s.email, accessCount: (s.accessHistory || []).length, savedCount: (s.savedMaterials || []).length }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 5);

    // Active users in timeline
    const activeUsers = await User.countDocuments({ lastLogin: { $gte: since }, active: true });

    // Recent activity logs
    const recentActivity = await Log.find()
      .populate('userId', 'name email role')
      .sort({ createdAt: -1 })
      .limit(15);

    res.json({ activeFaculty, popularSubjects: popularSubjects.map(s => ({ name: s._id, department: s.department, accessCount: s.accessCount })), activeStudents, activeUsers, recentActivity, timeline });
  } catch (err) {
    logger.error(`getAnalytics: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch analytics' });
  }
};

/* ════════════════════════════════════════════════════════════════════════════
   USER MANAGEMENT
   ════════════════════════════════════════════════════════════════════════════ */
const getUsers = async (req, res) => {
  try {
    const { search, role, page = 1, limit = 20 } = req.query;
    const query = {};
    if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
    if (role)   query.role = role;

    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      User.find(query).select('-__v').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      User.countDocuments(query)
    ]);
    res.json({ users, pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) } });
  } catch (err) {
    logger.error(`getUsers: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};

const deactivateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') return res.status(403).json({ message: 'Cannot deactivate admin users' });
    user.active = false;
    await user.save();
    await logAction(req, 'DEACTIVATE_USER', 'User', user._id, { userName: user.name });
    res.json({ message: 'User deactivated successfully' });
  } catch (err) {
    logger.error(`deactivateUser: ${err.message}`);
    res.status(500).json({ message: 'Failed to deactivate user' });
  }
};

const activateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.active = true;
    await user.save();
    await logAction(req, 'ACTIVATE_USER', 'User', user._id, { userName: user.name });
    res.json({ message: 'User activated successfully' });
  } catch (err) {
    logger.error(`activateUser: ${err.message}`);
    res.status(500).json({ message: 'Failed to activate user' });
  }
};

const removeUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') return res.status(403).json({ message: 'Cannot remove admin users' });

    if (user.role === 'faculty') {
      const folders   = await Folder.find({ facultyId: user._id, active: true });
      const folderIds = folders.map(f => f._id);
      if (folderIds.length > 0) {
        await User.updateMany({ 'savedMaterials.materialId': { $in: folderIds } }, { $pull: { savedMaterials: { materialId: { $in: folderIds } } } });
        await User.updateMany({ 'accessHistory.materialId': { $in: folderIds } }, { $pull: { accessHistory: { materialId: { $in: folderIds } } } });
        await Folder.updateMany({ facultyId: user._id }, { $set: { active: false } });
      }
    }
    await User.findByIdAndDelete(req.params.id);
    await logAction(req, 'REMOVE_USER', 'User', user._id, { userName: user.name, userEmail: user.email });
    res.json({ message: 'User removed successfully' });
  } catch (err) {
    logger.error(`removeUser: ${err.message}`);
    res.status(500).json({ message: 'Failed to remove user' });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!['student', 'faculty', 'admin'].includes(role)) return res.status(400).json({ message: 'Invalid role' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.role = role;
    await user.save();
    await logAction(req, 'UPDATE_USER_ROLE', 'User', user._id, { userName: user.name, newRole: role });
    res.json({ message: 'Role updated successfully', user });
  } catch (err) {
    logger.error(`updateUserRole: ${err.message}`);
    res.status(500).json({ message: 'Failed to update role' });
  }
};

const selfPromote = async (req, res) => {
  try {
    const email       = req.user.email.toLowerCase();
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    if (!adminEmails.includes(email)) {
      return res.status(403).json({ message: `Your email (${email}) is not in the ADMIN_EMAILS list.` });
    }
    req.user.role = 'admin';
    await req.user.save();
    const { generateToken } = require('../utils/jwt');
    const newToken = generateToken(req.user);
    res.json({ message: 'You are now an admin!', token: newToken, user: { id: req.user._id, name: req.user.name, email: req.user.email, role: 'admin' } });
  } catch (err) {
    logger.error(`selfPromote: ${err.message}`);
    res.status(500).json({ message: 'Failed to promote user' });
  }
};

/* ════════════════════════════════════════════════════════════════════════════
   MATERIALS MANAGEMENT
   ════════════════════════════════════════════════════════════════════════════ */
const getAllMaterials = async (req, res) => {
  try {
    const { search, department, status } = req.query;
    const query = {};
    if (search)     query.$or = [{ subjectName: { $regex: search, $options: 'i' } }, { facultyName: { $regex: search, $options: 'i' } }];
    if (department) query.department = department;
    if (status === 'active')   query.active = true;
    if (status === 'disabled') query.active = false;

    const materials = await Folder.find(query)
      .populate('facultyId', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    const result = materials.map(m => ({
      _id:          m._id,
      subjectName:  m.subjectName,
      department:   m.department,
      semester:     m.semester,
      facultyName:  m.facultyName,
      facultyEmail: m.facultyId?.email || '',
      accessCode:   m.accessCode,
      accessCount:  m.accessCount || 0,
      fileCount:    (m.files || []).length + (m.subFolders || []).reduce((acc, sf) => acc + sf.files.length, 0),
      active:       m.active,
      createdAt:    m.createdAt,
    }));

    res.json({ materials: result, total: result.length });
  } catch (err) {
    logger.error(`getAllMaterials: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch materials' });
  }
};

const toggleMaterial = async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.id);
    if (!folder) return res.status(404).json({ message: 'Material not found' });
    folder.active = !folder.active;
    await folder.save();
    await logAction(req, folder.active ? 'ENABLE_MATERIAL' : 'DISABLE_MATERIAL', 'Folder', folder._id, { subjectName: folder.subjectName });
    res.json({ message: `Material ${folder.active ? 'enabled' : 'disabled'}`, active: folder.active });
  } catch (err) {
    logger.error(`toggleMaterial: ${err.message}`);
    res.status(500).json({ message: 'Failed to toggle material' });
  }
};

const deleteMaterial = async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.id);
    if (!folder) return res.status(404).json({ message: 'Material not found' });
    await User.updateMany({ 'savedMaterials.materialId': folder._id }, { $pull: { savedMaterials: { materialId: folder._id } } });
    await User.updateMany({ 'accessHistory.materialId': folder._id }, { $pull: { accessHistory: { materialId: folder._id } } });
    await Folder.findByIdAndDelete(req.params.id);
    await logAction(req, 'ADMIN_DELETE_MATERIAL', 'Folder', folder._id, { subjectName: folder.subjectName });
    res.json({ message: 'Material deleted permanently' });
  } catch (err) {
    logger.error(`deleteMaterial: ${err.message}`);
    res.status(500).json({ message: 'Failed to delete material' });
  }
};

/* ════════════════════════════════════════════════════════════════════════════
   FEEDBACK MANAGEMENT
   ════════════════════════════════════════════════════════════════════════════ */
const getAllFeedback = async (req, res) => {
  try {
    const feedbacks = await Feedback.find()
      .sort({ createdAt: -1 })
      .populate('userId', 'name email role');
    res.json({ feedbacks, total: feedbacks.length });
  } catch (err) {
    logger.error(`getAllFeedback: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch feedback' });
  }
};

const toggleFeedbackApproval = async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) return res.status(404).json({ message: 'Feedback not found' });
    feedback.approved = !feedback.approved;
    await feedback.save();
    res.json({ message: `Feedback ${feedback.approved ? 'approved — now visible on landing page' : 'hidden from landing page'}`, approved: feedback.approved });
  } catch (err) {
    logger.error(`toggleFeedbackApproval: ${err.message}`);
    res.status(500).json({ message: 'Failed to update feedback' });
  }
};

const deleteFeedback = async (req, res) => {
  try {
    await Feedback.findByIdAndDelete(req.params.id);
    res.json({ message: 'Feedback deleted' });
  } catch (err) {
    logger.error(`deleteFeedback: ${err.message}`);
    res.status(500).json({ message: 'Failed to delete feedback' });
  }
};

/* ════════════════════════════════════════════════════════════════════════════
   ANNOUNCEMENTS
   ════════════════════════════════════════════════════════════════════════════ */
const getAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find()
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
    res.json({ announcements });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch announcements' });
  }
};

const createAnnouncement = async (req, res) => {
  try {
    const { title, message, audience = 'all' } = req.body;
    if (!title?.trim() || !message?.trim()) return res.status(400).json({ message: 'Title and message are required' });
    const ann = await Announcement.create({ title: title.trim(), message: message.trim(), audience, createdBy: req.user._id });
    await logAction(req, 'CREATE_ANNOUNCEMENT', 'Announcement', ann._id, { title: ann.title });
    res.status(201).json({ announcement: ann });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create announcement' });
  }
};

const updateAnnouncement = async (req, res) => {
  try {
    const { title, message, audience, active } = req.body;
    const ann = await Announcement.findByIdAndUpdate(req.params.id, { title, message, audience, active }, { new: true });
    if (!ann) return res.status(404).json({ message: 'Announcement not found' });
    res.json({ announcement: ann });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update announcement' });
  }
};

const deleteAnnouncement = async (req, res) => {
  try {
    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ message: 'Announcement deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete announcement' });
  }
};

module.exports = {
  // stats & analytics
  getStats, getAnalytics,
  // users
  getUsers, deactivateUser, activateUser, removeUser, updateUserRole, selfPromote,
  // materials
  getAllMaterials, toggleMaterial, deleteMaterial,
  // feedback
  getAllFeedback, toggleFeedbackApproval, deleteFeedback,
  // announcements
  getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement,
};
