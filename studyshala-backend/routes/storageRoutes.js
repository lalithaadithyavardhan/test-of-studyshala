const express = require('express');
const router  = express.Router();
const { getDriveStorage } = require('../controllers/storageController');
const { protect, authorize } = require('../middleware/auth');
router.get('/', protect, authorize('faculty','admin'), getDriveStorage);
module.exports = router;
