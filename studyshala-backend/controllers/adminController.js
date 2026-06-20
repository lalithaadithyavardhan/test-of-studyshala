const User           = require('../models/User');
const Folder         = require('../models/Folder');
const Log            = require('../models/Log');
const Feedback       = require('../models/Feedback');
const Announcement   = require('../models/Announcement');
const SystemSettings = require('../models/SystemSettings');
const { logAction }  = require('../middleware/logging');
const logger         = require('../utils/logger');

/* ══ STATS ══════════════════════════════════════════════════════════════════ */
const getStats = async (req, res) => {
  try {
    const [totalUsers, totalFaculty, totalStudents, totalMaterials, activeMaterials, adminCourses, totalFeedback] = await Promise.all([
      User.countDocuments({ active: true }),
      User.countDocuments({ role: 'faculty', active: true }),
      User.countDocuments({ role: 'student', active: true }),
      Folder.countDocuments({ isAdminCourse: { $ne: true } }),
      Folder.countDocuments({ isAdminCourse: { $ne: true }, active: true }),
      Folder.countDocuments({ isAdminCourse: true, active: true }),
      Feedback.countDocuments({ approved: true }),
    ]);
    const departments      = await Folder.distinct('department');
    const totalDepartments = departments.length;
    res.json({ totalUsers, totalFaculty, totalStudents, totalDepartments, totalMaterials, activeMaterials, adminCourses, totalFeedback });
  } catch (err) {
    logger.error(`getStats: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch statistics' });
  }
};

/* ══ ANALYTICS — date range + dept + semester filters ══════════════════════ */
const getAnalytics = async (req, res) => {
  try {
    const { timeline = 'today', from, to, department, semester } = req.query;
    let since = new Date();
    let until = new Date();

    if (from && to) {
      since = new Date(from);
      until = new Date(to);
      until.setHours(23, 59, 59, 999);
    } else {
      const now = new Date();
      if (timeline === 'today')  { since.setHours(0, 0, 0, 0); }
      if (timeline === 'week')   { since.setDate(now.getDate() - 7); }
      if (timeline === 'month')  { since.setMonth(now.getMonth() - 1); }
      if (timeline === '3month') { since.setMonth(now.getMonth() - 3); }
      if (timeline === '6month') { since.setMonth(now.getMonth() - 6); }
      if (timeline === 'year')   { since.setFullYear(now.getFullYear() - 1); }
      if (timeline === 'all')    { since = new Date('2000-01-01'); }
    }

    const folderMatch = { active: true, isAdminCourse: { $ne: true } };
    if (department) folderMatch.department = department;
    if (semester)   folderMatch.semester   = semester;

    const activeFacultyData = await Folder.aggregate([
      { $match: folderMatch },
      { $group: { _id: '$facultyId', materialsCount: { $sum: 1 }, totalAccess: { $sum: '$accessCount' } } },
      { $sort: { materialsCount: -1 } }, { $limit: 5 }
    ]);
    const activeFaculty = await Promise.all(activeFacultyData.map(async (item) => {
      const user = await User.findById(item._id).select('name email');
      return { name: user?.name || 'Unknown', email: user?.email || '', materialsCount: item.materialsCount, totalAccess: item.totalAccess };
    }));

    const popularSubjects = await Folder.aggregate([
      { $match: folderMatch },
      { $group: { _id: '$subjectName', accessCount: { $sum: '$accessCount' }, department: { $first: '$department' }, semester: { $first: '$semester' } } },
      { $sort: { accessCount: -1 } }, { $limit: 5 }
    ]);

    const departmentStats = await Folder.aggregate([
      { $match: { active: true, isAdminCourse: { $ne: true } } },
      { $group: { _id: '$department', materialCount: { $sum: 1 }, totalAccess: { $sum: '$accessCount' } } },
      { $sort: { materialCount: -1 } }
    ]);

    const semesterStats = await Folder.aggregate([
      { $match: { active: true, isAdminCourse: { $ne: true }, ...(department ? { department } : {}) } },
      { $group: { _id: '$semester', materialCount: { $sum: 1 }, totalAccess: { $sum: '$accessCount' } } },
      { $sort: { _id: 1 } }
    ]);

    const allStudents = await User.find({ role: 'student', active: true }).select('name email accessHistory savedMaterials').lean();
    const activeStudents = allStudents
      .map(s => ({ name: s.name, email: s.email, accessCount: (s.accessHistory || []).length, savedCount: (s.savedMaterials || []).length }))
      .sort((a, b) => b.accessCount - a.accessCount).slice(0, 5);

    const activeUsers    = await User.countDocuments({ lastLogin: { $gte: since, $lte: until }, active: true });
    const recentActivity = await Log.find({ createdAt: { $gte: since, $lte: until } })
      .populate('userId', 'name email role').sort({ createdAt: -1 }).limit(15);

    const allDepts = await Folder.distinct('department', { isAdminCourse: { $ne: true } });
    const allSems  = await Folder.distinct('semester',   { isAdminCourse: { $ne: true } });

    res.json({
      activeFaculty,
      popularSubjects:  popularSubjects.map(s => ({ name: s._id, department: s.department, semester: s.semester, accessCount: s.accessCount })),
      departmentStats:  departmentStats.map(d => ({ department: d._id, materialCount: d.materialCount, totalAccess: d.totalAccess })),
      semesterStats:    semesterStats.map(s => ({ semester: s._id, materialCount: s.materialCount, totalAccess: s.totalAccess })),
      activeStudents, activeUsers, recentActivity,
      timeline, dateRange: { from: since, to: until },
      allDepts, allSems: allSems.sort(),
    });
  } catch (err) {
    logger.error(`getAnalytics: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch analytics' });
  }
};

/* ══ USER MANAGEMENT ════════════════════════════════════════════════════════ */
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
    logger.error(`getUsers: ${err.message}`); res.status(500).json({ message: 'Failed to fetch users' });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-__v').lean();
    if (!user) return res.status(404).json({ message: 'User not found' });
    let uploadedMaterials = [];
    if (user.role === 'faculty') {
      const folders = await Folder.find({ facultyId: user._id }).select('subjectName department semester accessCount active createdAt files subFolders').lean();
      uploadedMaterials = folders.map(f => ({
        _id: f._id, subjectName: f.subjectName, department: f.department, semester: f.semester,
        accessCount: f.accessCount, active: f.active,
        fileCount: f.files.length + f.subFolders.reduce((s, sf) => s + sf.files.length, 0),
        createdAt: f.createdAt
      }));
    }
    res.json({ user, uploadedMaterials });
  } catch (err) {
    logger.error(`getUserProfile: ${err.message}`); res.status(500).json({ message: 'Failed to fetch profile' });
  }
};

const resetUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') return res.status(403).json({ message: 'Cannot reset admin accounts' });
    if (user.role === 'faculty') {
      const folders   = await Folder.find({ facultyId: user._id, active: true });
      const folderIds = folders.map(f => f._id);
      if (folderIds.length > 0) {
        await User.updateMany({ 'savedMaterials.materialId': { $in: folderIds } }, { $pull: { savedMaterials: { materialId: { $in: folderIds } } } });
        await User.updateMany({ 'accessHistory.materialId': { $in: folderIds } }, { $pull: { accessHistory: { materialId: { $in: folderIds } } } });
        await Folder.updateMany({ facultyId: user._id }, { $set: { active: false } });
      }
    }
    user.savedMaterials = []; user.accessHistory = []; user.recentFiles = []; user.starredFiles = [];
    await user.save();
    await logAction(req, 'RESET_USER', 'User', user._id, { userName: user.name });
    res.json({ message: `Account reset for ${user.name}. All data cleared.` });
  } catch (err) {
    logger.error(`resetUser: ${err.message}`); res.status(500).json({ message: 'Failed to reset user' });
  }
};

const deactivateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') return res.status(403).json({ message: 'Cannot deactivate admin users' });
    user.active = false; await user.save();
    await logAction(req, 'DEACTIVATE_USER', 'User', user._id, { userName: user.name });
    res.json({ message: 'User deactivated' });
  } catch (err) { res.status(500).json({ message: 'Failed to deactivate user' }); }
};

const activateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.active = true; await user.save();
    await logAction(req, 'ACTIVATE_USER', 'User', user._id, { userName: user.name });
    res.json({ message: 'User activated' });
  } catch (err) { res.status(500).json({ message: 'Failed to activate user' }); }
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
    res.json({ message: 'User removed' });
  } catch (err) { res.status(500).json({ message: 'Failed to remove user' }); }
};

const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!['student', 'faculty', 'admin'].includes(role)) return res.status(400).json({ message: 'Invalid role' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.role = role; await user.save();
    await logAction(req, 'UPDATE_USER_ROLE', 'User', user._id, { userName: user.name, newRole: role });
    res.json({ message: 'Role updated', user });
  } catch (err) { res.status(500).json({ message: 'Failed to update role' }); }
};

const selfPromote = async (req, res) => {
  try {
    const email       = req.user.email.toLowerCase();
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    if (!adminEmails.includes(email)) return res.status(403).json({ message: `Your email (${email}) is not in ADMIN_EMAILS.` });
    req.user.role = 'admin'; await req.user.save();
    const { generateToken } = require('../utils/jwt');
    const newToken = generateToken(req.user);
    res.json({ message: 'You are now an admin!', token: newToken, user: { id: req.user._id, name: req.user.name, email: req.user.email, role: 'admin' } });
  } catch (err) { res.status(500).json({ message: 'Failed to promote user' }); }
};

/* ══ MATERIALS (Study Material Control) ════════════════════════════════════ */
const getAllMaterials = async (req, res) => {
  try {
    const { search, department, semester, status } = req.query;
    const query = { isAdminCourse: { $ne: true } };
    if (search)     query.$or = [{ subjectName: { $regex: search, $options: 'i' } }, { facultyName: { $regex: search, $options: 'i' } }];
    if (department) query.department = department;
    if (semester)   query.semester   = semester;
    if (status === 'active')   query.active = true;
    if (status === 'disabled') query.active = false;

    const materials = await Folder.find(query).populate('facultyId', 'name email').sort({ createdAt: -1 }).lean();
    const result = materials.map(m => ({
      _id: m._id, subjectName: m.subjectName, department: m.department, semester: m.semester,
      facultyName: m.facultyName, facultyEmail: m.facultyId?.email || '',
      accessCode: m.accessCode, accessCount: m.accessCount || 0,
      fileCount: (m.files || []).length + (m.subFolders || []).reduce((acc, sf) => acc + sf.files.length, 0),
      totalDownloads: (m.files || []).reduce((s, f) => s + (f.downloadCount || 0), 0) +
                      (m.subFolders || []).reduce((s, sf) => s + sf.files.reduce((ss, f) => ss + (f.downloadCount || 0), 0), 0),
      active: m.active, createdAt: m.createdAt,
    }));
    const allDepts = await Folder.distinct('department', { isAdminCourse: { $ne: true } });
    const allSems  = await Folder.distinct('semester',   { isAdminCourse: { $ne: true } });
    res.json({ materials: result, total: result.length, departments: allDepts, semesters: allSems.sort() });
  } catch (err) {
    logger.error(`getAllMaterials: ${err.message}`); res.status(500).json({ message: 'Failed to fetch materials' });
  }
};

const toggleMaterial = async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.id);
    if (!folder) return res.status(404).json({ message: 'Material not found' });
    folder.active = !folder.active; await folder.save();
    await logAction(req, folder.active ? 'ENABLE_MATERIAL' : 'DISABLE_MATERIAL', 'Folder', folder._id, { subjectName: folder.subjectName });
    res.json({ message: `Material ${folder.active ? 'enabled' : 'disabled'}`, active: folder.active });
  } catch (err) { res.status(500).json({ message: 'Failed to toggle material' }); }
};

const deleteMaterial = async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.id);
    if (!folder) return res.status(404).json({ message: 'Material not found' });
    await User.updateMany({ 'savedMaterials.materialId': folder._id }, { $pull: { savedMaterials: { materialId: folder._id } } });
    await User.updateMany({ 'accessHistory.materialId': folder._id }, { $pull: { accessHistory: { materialId: folder._id } } });
    await Folder.findByIdAndDelete(req.params.id);
    await logAction(req, 'ADMIN_DELETE_MATERIAL', 'Folder', folder._id, { subjectName: folder.subjectName });
    res.json({ message: 'Material deleted' });
  } catch (err) { res.status(500).json({ message: 'Failed to delete material' }); }
};

/* ══ ADMIN COURSES ══════════════════════════════════════════════════════════ */
const getAdminCourses = async (req, res) => {
  try {
    const courses = await Folder.find({ isAdminCourse: true }).sort({ createdAt: -1 }).lean();
    res.json({ courses: courses.map(c => ({
      _id: c._id, subjectName: c.subjectName, department: c.department, semester: c.semester,
      courseCategory: c.courseCategory || '', accessCount: c.accessCount || 0,
      fileCount: (c.files || []).length + (c.subFolders || []).reduce((s, sf) => s + sf.files.length, 0),
      active: c.active, createdAt: c.createdAt,
    })) });
  } catch (err) { res.status(500).json({ message: 'Failed to fetch admin courses' }); }
};

const getPublicAdminCourses = async (req, res) => {
  try {
    const courses = await Folder.find({ isAdminCourse: true, active: true })
      .select('subjectName department semester courseCategory facultyName accessCount files subFolders createdAt')
      .sort({ createdAt: -1 }).lean();
    res.json({ courses: courses.map(c => ({
      _id: c._id, subjectName: c.subjectName, department: c.department, semester: c.semester,
      courseCategory: c.courseCategory || '', accessCount: c.accessCount || 0,
      fileCount: (c.files || []).length + (c.subFolders || []).reduce((s, sf) => s + sf.files.length, 0),
      files: c.files, subFolders: c.subFolders, createdAt: c.createdAt,
      isAdminCourse: true,  // needed by BrowseMaterials to use the public endpoint
    })) });
  } catch (err) { res.status(500).json({ message: 'Failed to fetch courses' }); }
};

const createAdminCourse = async (req, res) => {
  try {
    const { subjectName, department, semester, courseCategory } = req.body;
    if (!subjectName?.trim() || !department?.trim() || !semester?.trim())
      return res.status(400).json({ message: 'Subject name, department and semester are required' });

    // Create a Drive folder for this admin course so uploaded files stay organised
    let driveFolderId = `local-${Date.now()}`;
    let driveUrl      = '#';
    if (driveService.enabled) {
      try {
        const folderName  = `[Admin] ${subjectName.trim()} — ${department.trim()} Sem${semester.trim()}`;
        const driveFolder = await driveService.createFolder(folderName);
        driveFolderId     = driveFolder.folderId;
        driveUrl          = driveFolder.folderUrl;
        logger.info(`Admin course Drive folder created: ${folderName} → ${driveFolderId}`);
      } catch (driveErr) {
        logger.warn(`Admin course Drive folder creation failed (files will upload to root): ${driveErr.message}`);
      }
    }

    const course = await Folder.create({
      facultyId: req.user._id, facultyName: 'Admin',
      subjectName: subjectName.trim(), department: department.trim(),
      semester: semester.trim(), courseCategory: courseCategory?.trim() || '',
      isAdminCourse: true, active: true,
      driveFolderId, driveUrl,
    });
    await logAction(req, 'CREATE_ADMIN_COURSE', 'Folder', course._id, { subjectName: course.subjectName });
    res.status(201).json({ course });
  } catch (err) {
    logger.error(`createAdminCourse: ${err.message}`);
    res.status(500).json({ message: 'Failed to create course' });
  }
};

const updateAdminCourse = async (req, res) => {
  try {
    const { subjectName, department, semester, courseCategory, active } = req.body;
    const course = await Folder.findOneAndUpdate({ _id: req.params.id, isAdminCourse: true }, { subjectName, department, semester, courseCategory, active }, { new: true });
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.json({ course });
  } catch (err) { res.status(500).json({ message: 'Failed to update course' }); }
};

const deleteAdminCourse = async (req, res) => {
  try {
    const course = await Folder.findOneAndDelete({ _id: req.params.id, isAdminCourse: true });
    if (!course) return res.status(404).json({ message: 'Course not found' });
    // Delete Drive folder if it was created
    if (driveService.enabled && course.driveFolderId && !course.driveFolderId.startsWith('local')) {
      try { await driveService.deleteFolder(course.driveFolderId); }
      catch (e) { logger.warn(`Could not delete admin course Drive folder: ${e.message}`); }
    }
    await logAction(req, 'DELETE_ADMIN_COURSE', 'Folder', course._id, { subjectName: course.subjectName });
    res.json({ message: 'Course deleted' });
  } catch (err) { res.status(500).json({ message: 'Failed to delete course' }); }
};

/* ══ FEEDBACK ═══════════════════════════════════════════════════════════════ */
const getAllFeedback = async (req, res) => {
  try {
    const feedbacks = await Feedback.find().sort({ createdAt: -1 }).populate('userId', 'name email role');
    res.json({ feedbacks, total: feedbacks.length });
  } catch (err) { res.status(500).json({ message: 'Failed to fetch feedback' }); }
};
const toggleFeedbackApproval = async (req, res) => {
  try {
    const f = await Feedback.findById(req.params.id);
    if (!f) return res.status(404).json({ message: 'Feedback not found' });
    f.approved = !f.approved; await f.save();
    res.json({ message: `Feedback ${f.approved ? 'approved' : 'hidden'}`, approved: f.approved });
  } catch (err) { res.status(500).json({ message: 'Failed to update feedback' }); }
};
const deleteFeedback = async (req, res) => {
  try { await Feedback.findByIdAndDelete(req.params.id); res.json({ message: 'Feedback deleted' }); }
  catch (err) { res.status(500).json({ message: 'Failed to delete feedback' }); }
};

/* ══ ANNOUNCEMENTS ══════════════════════════════════════════════════════════ */
const getAnnouncements = async (req, res) => {
  try { const a = await Announcement.find().populate('createdBy', 'name').sort({ createdAt: -1 }); res.json({ announcements: a }); }
  catch (err) { res.status(500).json({ message: 'Failed to fetch announcements' }); }
};
const createAnnouncement = async (req, res) => {
  try {
    const { title, message, audience = 'all' } = req.body;
    if (!title?.trim() || !message?.trim()) return res.status(400).json({ message: 'Title and message required' });
    const ann = await Announcement.create({ title: title.trim(), message: message.trim(), audience, createdBy: req.user._id });
    await logAction(req, 'CREATE_ANNOUNCEMENT', 'Announcement', ann._id, { title: ann.title });
    res.status(201).json({ announcement: ann });
  } catch (err) { res.status(500).json({ message: 'Failed to create announcement' }); }
};
const updateAnnouncement = async (req, res) => {
  try {
    const { title, message, audience, active } = req.body;
    const ann = await Announcement.findByIdAndUpdate(req.params.id, { title, message, audience, active }, { new: true });
    if (!ann) return res.status(404).json({ message: 'Not found' });
    res.json({ announcement: ann });
  } catch (err) { res.status(500).json({ message: 'Failed to update announcement' }); }
};
const deleteAnnouncement = async (req, res) => {
  try { await Announcement.findByIdAndDelete(req.params.id); res.json({ message: 'Deleted' }); }
  catch (err) { res.status(500).json({ message: 'Failed to delete announcement' }); }
};

/* ══ SYSTEM SETTINGS ════════════════════════════════════════════════════════ */
const getSettings = async (req, res) => {
  try {
    let s = await SystemSettings.findOne({ _singleton: 'settings' });
    if (!s) s = await SystemSettings.create({ _singleton: 'settings' });
    res.json({ settings: s });
  } catch (err) { res.status(500).json({ message: 'Failed to fetch settings' }); }
};
const updateSettings = async (req, res) => {
  try {
    const { maxUploadSizeMB, allowedFileTypes, features } = req.body;
    const update = { updatedBy: req.user._id };
    if (maxUploadSizeMB !== undefined) update.maxUploadSizeMB = maxUploadSizeMB;
    if (allowedFileTypes)              update.allowedFileTypes = allowedFileTypes;
    if (features)                      update.features = features;
    const s = await SystemSettings.findOneAndUpdate({ _singleton: 'settings' }, { $set: update }, { new: true, upsert: true });
    await logAction(req, 'UPDATE_SETTINGS', 'SystemSettings', s._id, {});
    res.json({ settings: s, message: 'Settings saved' });
  } catch (err) { res.status(500).json({ message: 'Failed to save settings' }); }
};

/* ══ DOWNLOAD REPORTS ═══════════════════════════════════════════════════════ */
const downloadReport = async (req, res) => {
  try {
    const { type = 'users' } = req.query;
    let csv = '';
    if (type === 'users') {
      const users = await User.find().select('name email role active createdAt lastLogin').lean();
      csv  = 'Name,Email,Role,Status,Joined,Last Login\n';
      csv += users.map(u => `"${u.name}","${u.email}","${u.role}","${u.active ? 'Active' : 'Inactive'}","${new Date(u.createdAt).toLocaleDateString()}","${u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}"`).join('\n');
      res.setHeader('Content-Disposition', 'attachment; filename="users-report.csv"');
    }
    if (type === 'materials') {
      const mats = await Folder.find({ isAdminCourse: { $ne: true } }).select('subjectName department semester facultyName accessCount active createdAt files subFolders').lean();
      csv  = 'Subject,Department,Semester,Faculty,Access Count,Downloads,Files,Status,Created\n';
      csv += mats.map(m => {
        const dl  = (m.files||[]).reduce((s,f)=>s+(f.downloadCount||0),0) + (m.subFolders||[]).reduce((s,sf)=>s+sf.files.reduce((ss,f)=>ss+(f.downloadCount||0),0),0);
        const fc  = (m.files||[]).length + (m.subFolders||[]).reduce((s,sf)=>s+sf.files.length,0);
        return `"${m.subjectName}","${m.department}","${m.semester}","${m.facultyName}","${m.accessCount}","${dl}","${fc}","${m.active?'Active':'Disabled'}","${new Date(m.createdAt).toLocaleDateString()}"`;
      }).join('\n');
      res.setHeader('Content-Disposition', 'attachment; filename="materials-report.csv"');
    }
    if (type === 'feedback') {
      const fbs = await Feedback.find().select('name role message approved createdAt').lean();
      csv  = 'Name,Role,Message,Status,Date\n';
      csv += fbs.map(f => `"${f.name}","${f.role}","${f.message.replace(/"/g,'""')}","${f.approved?'Approved':'Hidden'}","${new Date(f.createdAt).toLocaleDateString()}"`).join('\n');
      res.setHeader('Content-Disposition', 'attachment; filename="feedback-report.csv"');
    }
    res.setHeader('Content-Type', 'text/csv');
    res.send(csv);
  } catch (err) { res.status(500).json({ message: 'Failed to generate report' }); }
};

/* ══ ADMIN COURSE UPLOAD — upload files to admin courses ════════════════════ */
const driveService = require('../services/driveService');

const mapFile = (f) => ({
  _id:           f._id,
  name:          f.name,
  originalName:  f.originalName,
  mimeType:      f.mimeType,
  size:          f.size,
  driveFileId:   f.driveFileId || null,
  downloadCount: f.downloadCount || 0,
  uploadedAt:    f.uploadedAt,
});

// POST /api/admin/courses/:id/files
const uploadCourseFiles = async (req, res) => {
  try {
    const { id }          = req.params;
    const { subFolderId } = req.body;

    // Admin can upload to any admin course (no facultyId check)
    const folder = await Folder.findOne({ _id: id, isAdminCourse: true, active: true });
    if (!folder)                         return res.status(404).json({ message: 'Course not found' });
    if (!req.files || !req.files.length) return res.status(400).json({ message: 'No files provided' });

    if (!driveService.enabled) {
      return res.status(503).json({ message: 'Google Drive is not configured on this server.' });
    }

    let targetSubFolder = null;
    let parentDriveId   = null;

    if (subFolderId) {
      targetSubFolder = folder.subFolders.id(subFolderId);
      if (!targetSubFolder) return res.status(404).json({ message: 'Sub-folder not found' });
      parentDriveId = targetSubFolder.driveSubFolderId || null;
    } else {
      parentDriveId = (folder.driveFolderId && !folder.driveFolderId.startsWith('local'))
        ? folder.driveFolderId : null;
    }

    const uploaded = [];
    for (const file of req.files) {
      let driveFileId = null;
      let fileSize    = file.size;
      try {
        const result = await driveService.uploadFile(file.buffer, file.originalname, file.mimetype, parentDriveId);
        driveFileId = result.fileId;
        fileSize    = result.size || file.buffer.length;
      } catch (driveErr) {
        return res.status(500).json({ message: `Failed to upload "${file.originalname}": ${driveErr.message}` });
      }
      const doc = { name: file.originalname, originalName: file.originalname, mimeType: file.mimetype, size: fileSize, driveFileId, uploadedAt: new Date(), uploadedBy: req.user._id };
      if (targetSubFolder) { targetSubFolder.files.push(doc); } else { folder.files.push(doc); }
      uploaded.push(doc);
    }

    await folder.save();
    await logAction(req, 'ADMIN_UPLOAD_FILES', 'Folder', folder._id, { fileCount: uploaded.length });
    res.json({ message: `${uploaded.length} file(s) uploaded`, files: uploaded.map(mapFile), subFolderId: subFolderId || null });
  } catch (err) {
    logger.error(`uploadCourseFiles: ${err.message}`);
    res.status(500).json({ message: 'Failed to upload files' });
  }
};

// POST /api/admin/courses/:id/subfolders
const createCourseSubFolder = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Folder name required' });
    const folder = await Folder.findOne({ _id: req.params.id, isAdminCourse: true });
    if (!folder) return res.status(404).json({ message: 'Course not found' });
    folder.subFolders.push({ name: name.trim() });
    await folder.save();
    const newSf = folder.subFolders[folder.subFolders.length - 1];
    res.status(201).json({ subFolder: { _id: newSf._id, name: newSf.name, files: [], fileCount: 0, createdAt: newSf.createdAt } });
  } catch (err) {
    logger.error(`createCourseSubFolder: ${err.message}`);
    res.status(500).json({ message: 'Failed to create sub-folder' });
  }
};

// DELETE /api/admin/courses/:id/files/:fileId
const deleteCourseFile = async (req, res) => {
  try {
    const folder = await Folder.findOne({ _id: req.params.id, isAdminCourse: true });
    if (!folder) return res.status(404).json({ message: 'Course not found' });
    folder.files = folder.files.filter(f => f._id.toString() !== req.params.fileId);
    await folder.save();
    res.json({ message: 'File deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete file' });
  }
};

/* ══ ADMIN BROWSE — full folder list + single folder detail for BrowseMaterials ══ */

// Returns all active folders (faculty + admin courses) with enough data for the grid
const getBrowseFolders = async (req, res) => {
  try {
    const folders = await Folder.find({ active: true })
      .select('subjectName department semester facultyName accessCode accessCount files subFolders messageToStudents isAdminCourse courseCategory createdAt')
      .sort({ createdAt: -1 })
      .lean();

    const result = folders.map(f => ({
      _id:               f._id,
      subjectName:       f.subjectName,
      department:        f.department,
      semester:          f.semester,
      facultyName:       f.facultyName,
      accessCode:        f.accessCode || '',
      accessCount:       f.accessCount || 0,
      isAdminCourse:     f.isAdminCourse || false,
      courseCategory:    f.courseCategory || '',
      messageToStudents: f.messageToStudents || '',
      files:             f.files || [],
      subFolders:        (f.subFolders || []).map(sf => ({
        _id:       sf._id,
        name:      sf.name,
        createdAt: sf.createdAt,
        fileCount: sf.files.length,
        files:     sf.files
      })),
      createdAt: f.createdAt,
    }));

    res.json({ folders: result });
  } catch (err) {
    logger.error(`getBrowseFolders: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch folders' });
  }
};

// Returns single folder detail (same shape as /faculty/folders/:id)
const getBrowseFolder = async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.id).lean();
    if (!folder) return res.status(404).json({ message: 'Folder not found' });
    res.json({ folder });
  } catch (err) {
    logger.error(`getBrowseFolder: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch folder' });
  }
};

module.exports = {
  getStats, getAnalytics,
  getUsers, getUserProfile, resetUser, deactivateUser, activateUser, removeUser, updateUserRole, selfPromote,
  getAllMaterials, toggleMaterial, deleteMaterial,
  getAdminCourses, getPublicAdminCourses, createAdminCourse, updateAdminCourse, deleteAdminCourse,
  getAllFeedback, toggleFeedbackApproval, deleteFeedback,
  getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement,
  getSettings, updateSettings,
  downloadReport,
  getBrowseFolders, getBrowseFolder,
  uploadCourseFiles, createCourseSubFolder, deleteCourseFile,
};
