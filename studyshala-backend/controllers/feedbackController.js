const Feedback = require('../models/Feedback');
const logger   = require('../utils/logger');

/* ── POST /api/feedback  (auth required — student or faculty) ── */
exports.submitFeedback = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim())
      return res.status(400).json({ message: 'Feedback message is required.' });

    const trimmed = message.trim();
    if (trimmed.length > 60)
      return res.status(400).json({ message: 'Feedback must be 60 characters or less.' });

    // One feedback per user — update if already submitted, else create
    const existing = await Feedback.findOne({ userId: req.user._id });
    if (existing) {
      existing.message = trimmed;
      existing.name    = req.user.name;
      existing.role    = req.user.role;
      await existing.save();
      return res.json({ success: true, feedback: existing, updated: true });
    }

    const feedback = await Feedback.create({
      message: trimmed,
      name:    req.user.name,
      role:    req.user.role,
      userId:  req.user._id,
    });

    logger.info(`Feedback submitted by ${req.user.email}`);
    res.status(201).json({ success: true, feedback });
  } catch (err) {
    logger.error(`submitFeedback: ${err.message}`);
    res.status(500).json({ message: 'Failed to submit feedback.' });
  }
};

/* ── GET /api/feedback  (public — used by login landing page) ── */
exports.getPublicFeedback = async (req, res) => {
  try {
    const feedbacks = await Feedback.find({ approved: true })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('message name role createdAt');

    res.json({ feedbacks });
  } catch (err) {
    logger.error(`getPublicFeedback: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch feedback.' });
  }
};

/* ── GET /api/feedback/mine  (auth — check if current user already submitted) ── */
exports.getMyFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findOne({ userId: req.user._id }).select('message');
    res.json({ feedback: feedback || null });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch your feedback.' });
  }
};
