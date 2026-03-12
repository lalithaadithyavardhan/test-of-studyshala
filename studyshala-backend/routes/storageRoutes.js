const express = require('express');
const router  = express.Router();
const { getDriveStorage } = require('../controllers/storageController');
const { authenticate, isFacultyOrAdmin } = require('../middleware/auth');

// Only faculty and admin can view Drive storage info
router.get('/', authenticate, isFacultyOrAdmin, getDriveStorage);

module.exports = router;
