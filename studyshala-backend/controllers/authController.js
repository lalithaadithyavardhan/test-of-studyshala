const { generateToken } = require('../utils/jwt');
const User = require('../models/User');
const logger = require('../utils/logger');

// Get current user
const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-__v');
    res.json({ user });
  } catch (error) {
    logger.error(`Get current user error: ${error.message}`);
    res.status(500).json({ message: 'Failed to get user information' });
  }
};

// Google OAuth callback
const googleCallback = (req, res) => {
  try {
    const token = generateToken(req.user);
    const userData = {
      id:             req.user._id,
      name:           req.user.name,
      email:          req.user.email,
      role:           req.user.role,
      department:     req.user.department,
      profilePicture: req.user.profilePicture
    };

    const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(
      `${frontendURL}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(userData))}`
    );
  } catch (error) {
    logger.error(`Google callback error: ${error.message}`);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=auth_failed`);
  }
};

// Logout — destroy passport session fully so next login shows account picker
const logout = (req, res) => {
  req.logout((err) => {
    if (err) {
      logger.error(`Logout error: ${err.message}`);
      return res.status(500).json({ message: 'Logout failed' });
    }
    // Destroy the session completely
    req.session.destroy((destroyErr) => {
      if (destroyErr) {
        logger.warn(`Session destroy warning: ${destroyErr.message}`);
      }
      res.clearCookie('connect.sid');          // clear session cookie
      res.json({ message: 'Logged out successfully' });
    });
  });
};

module.exports = { getCurrentUser, googleCallback, logout };
