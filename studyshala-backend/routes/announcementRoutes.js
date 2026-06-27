const express      = require('express');
const router       = express.Router();
const Announcement = require('../models/Announcement');
const { authenticate } = require('../middleware/auth');

// GET /api/announcements — any logged-in user can read announcements for their role
router.get('/', authenticate, async (req, res) => {
  try {
    const role = req.user.role;
    // Return announcements for this user's role OR for everyone
    const announcements = await Announcement.find({
      active: true,
      $or: [{ audience: 'all' }, { audience: role }]
    }).sort({ createdAt: -1 }).limit(10);

    res.json({ announcements });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch announcements' });
  }
});

module.exports = router;
