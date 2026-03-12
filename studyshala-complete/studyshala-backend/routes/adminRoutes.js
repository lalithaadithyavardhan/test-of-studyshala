const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, isAdmin } = require('../middleware/auth');

// ── Self-promote (no isAdmin guard - for bootstrapping the first admin) ──────
// Any authenticated user can call this.
// It only works if their email is in ADMIN_EMAILS in .env.
router.post('/self-promote', authenticate, adminController.selfPromote);

// All routes below require authentication AND admin role
router.use(authenticate);
router.use(isAdmin);

// Statistics
router.get('/stats', adminController.getStats);

// Users management
router.get('/users', adminController.getUsers);
router.patch('/users/:id/deactivate', adminController.deactivateUser);
router.patch('/users/:id/activate', adminController.activateUser);
router.delete('/users/:id', adminController.removeUser);
router.patch('/users/:id/role', adminController.updateUserRole);

// Analytics
router.get('/analytics', adminController.getAnalytics);

module.exports = router;
