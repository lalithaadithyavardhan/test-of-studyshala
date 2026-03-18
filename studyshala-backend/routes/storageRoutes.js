const express = require('express');
const router  = express.Router();
const { getPlatformDriveStorage, getMyStudyshalaUsage } = require('../controllers/storageController');
const { authenticate, isFacultyOrAdmin } = require('../middleware/auth');

// Platform Drive quota — faculty & admin only (uses service account)
router.get('/platform-drive',  authenticate, isFacultyOrAdmin, getPlatformDriveStorage);

// Personal StudyShala footprint — any logged-in user
router.get('/my-studyshala',   authenticate, getMyStudyshalaUsage);

module.exports = router;
