const express = require('express');
const multer  = require('multer');
const router  = express.Router();
const c       = require('../controllers/adminController');
const { authenticate, isAdmin } = require('../middleware/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 200 * 1024 * 1024 }, // admin gets 200MB limit
  fileFilter: (req, file, cb) => {
    const allowed = /pdf|doc|docx|ppt|pptx|xls|xlsx|txt|jpg|jpeg|png|gif|webp|zip|rar|7z|mp4|mp3/;
    const ext = file.originalname.split('.').pop().toLowerCase();
    allowed.test(ext) ? cb(null, true) : cb(new Error(`File type .${ext} not allowed`));
  }
});

// Self-promote — no isAdmin guard (bootstrap first admin)
router.post('/self-promote', authenticate, c.selfPromote);

router.use(authenticate);
router.use(isAdmin);

// Stats & Analytics
router.get('/stats',              c.getStats);
router.get('/analytics',          c.getAnalytics);

// User management
router.get('/users',                    c.getUsers);
router.get('/users/:id/profile',        c.getUserProfile);
router.patch('/users/:id/reset',        c.resetUser);
router.patch('/users/:id/deactivate',   c.deactivateUser);
router.patch('/users/:id/activate',     c.activateUser);
router.delete('/users/:id',             c.removeUser);
router.patch('/users/:id/role',         c.updateUserRole);

// Materials (Study Material Control)
router.get('/materials',                c.getAllMaterials);
router.patch('/materials/:id/toggle',   c.toggleMaterial);
router.delete('/materials/:id',         c.deleteMaterial);

// Admin Courses (public — no code required)
router.get('/courses',                  c.getAdminCourses);
router.get('/courses/public',           c.getPublicAdminCourses);
router.post('/courses',                 c.createAdminCourse);
router.patch('/courses/:id',            c.updateAdminCourse);
router.delete('/courses/:id',           c.deleteAdminCourse);

// Feedback management
router.get('/feedback',                 c.getAllFeedback);
router.patch('/feedback/:id/toggle',    c.toggleFeedbackApproval);
router.delete('/feedback/:id',          c.deleteFeedback);

// Announcements
router.get('/announcements',            c.getAnnouncements);
router.post('/announcements',           c.createAnnouncement);
router.patch('/announcements/:id',      c.updateAnnouncement);
router.delete('/announcements/:id',     c.deleteAnnouncement);

// System Settings
router.get('/settings',                 c.getSettings);
router.patch('/settings',               c.updateSettings);

// Reports
router.get('/reports/download',         c.downloadReport);

// Admin Course file management
router.post('/courses/:id/files',           upload.array('files', 20), c.uploadCourseFiles);
router.post('/courses/:id/subfolders',      c.createCourseSubFolder);
router.delete('/courses/:id/files/:fileId', c.deleteCourseFile);

// Browse Materials (admin view of all folders)
router.get('/browse',           c.getBrowseFolders);
router.get('/browse/:id',       c.getBrowseFolder);

module.exports = router;
