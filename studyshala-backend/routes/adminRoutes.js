const express = require('express');
const router  = express.Router();
const c       = require('../controllers/adminController');
const { authenticate, isAdmin } = require('../middleware/auth');

// Self-promote — no isAdmin guard (bootstrap first admin)
router.post('/self-promote', authenticate, c.selfPromote);

// All routes below require auth + admin role
router.use(authenticate);
router.use(isAdmin);

// Stats & analytics
router.get('/stats',                  c.getStats);
router.get('/analytics',              c.getAnalytics);

// User management
router.get('/users',                  c.getUsers);
router.patch('/users/:id/deactivate', c.deactivateUser);
router.patch('/users/:id/activate',   c.activateUser);
router.delete('/users/:id',           c.removeUser);
router.patch('/users/:id/role',       c.updateUserRole);

// Materials management
router.get('/materials',              c.getAllMaterials);
router.patch('/materials/:id/toggle', c.toggleMaterial);
router.delete('/materials/:id',       c.deleteMaterial);

// Feedback management
router.get('/feedback',               c.getAllFeedback);
router.patch('/feedback/:id/toggle',  c.toggleFeedbackApproval);
router.delete('/feedback/:id',        c.deleteFeedback);

// Announcements
router.get('/announcements',          c.getAnnouncements);
router.post('/announcements',         c.createAnnouncement);
router.patch('/announcements/:id',    c.updateAnnouncement);
router.delete('/announcements/:id',   c.deleteAnnouncement);

module.exports = router;
