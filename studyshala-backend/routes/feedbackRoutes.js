const express  = require('express');
const router   = express.Router();
const { submitFeedback, getPublicFeedback, getMyFeedback } = require('../controllers/feedbackController');
const { authenticate } = require('../middleware/auth');

// Public — no auth needed (landing page reads this)
router.get('/', getPublicFeedback);

// Auth required
router.post('/',     authenticate, submitFeedback);
router.get('/mine',  authenticate, getMyFeedback);

module.exports = router;
