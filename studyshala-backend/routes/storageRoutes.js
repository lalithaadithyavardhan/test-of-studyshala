const express = require('express');
const router  = express.Router();
const { getMyDriveStorage, getMyStudyshalaUsage } = require('../controllers/storageController');
const { authenticate } = require('../middleware/auth');

// Both endpoints work for any authenticated role (student, faculty, admin)
router.get('/my-drive',       authenticate, getMyDriveStorage);
router.get('/my-studyshala',  authenticate, getMyStudyshalaUsage);

module.exports = router;
