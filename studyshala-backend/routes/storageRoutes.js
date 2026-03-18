const express = require('express');
const router  = express.Router();
const { getDriveStorage, getFacultyFootprint, getStudentFootprint } = require('../controllers/storageController');
const { authenticate, isFacultyOrAdmin, isFaculty, isStudent } = require('../middleware/auth');

// Platform-wide Drive quota — faculty & admin only
router.get('/',                  authenticate, isFacultyOrAdmin, getDriveStorage);

// Faculty personal upload footprint — faculty only
router.get('/faculty-footprint', authenticate, isFaculty, getFacultyFootprint);

// Student saved-materials footprint — student only
router.get('/student-footprint', authenticate, isStudent, getStudentFootprint);

module.exports = router;
