const express = require('express');
const router  = express.Router();
const { getMyStudyshalaUsage } = require('../controllers/storageController');
const { authenticate } = require('../middleware/auth');

router.get('/my-studyshala', authenticate, getMyStudyshalaUsage);

module.exports = router;

