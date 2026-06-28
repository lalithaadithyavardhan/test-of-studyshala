const express = require('express');
const router  = express.Router();
const { getStats, recordVisit } = require('../controllers/statsController');

// GET  /api/stats        — returns cached live numbers for landing page
router.get('/', getStats);

// POST /api/stats/visit  — called by frontend on every page load to count real visits
router.post('/visit', recordVisit);

module.exports = router;
