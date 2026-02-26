const { generateToken } = require('../utils/jwt');
const User = require('../models/User');
const logger = require('../utils/logger');

// Get current user
// Guards against the case where a valid JWT references a user that no longer exists in the DB.
const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-__v');

    if (!user) {
      // JWT was valid but user has been deleted from the database
      return res.status(401).json({ message: 'User no longer exists. Please log in again.' });
    }

    if (!user.active) {
      return res.status(403).json({ message: 'Account has been deactivated.' });
    }

    res.json({ user });
  } catch (error) {
    logger.error(`Get current user error: ${error.message}`);
    res.status(500).json({ message: 'Failed to get user information' });
  }
};

// Google OAuth callback
const googleCallback = (req, res) => {
  try {
    // 1. Generate JWT Token
    const token = generateToken(req.user);

    // 2. Prepare User Data for the URL
    const userData = {
      id:             req.user._id,
      name:           req.user.name,
      email:          req.user.email,
      role:           req.user.role,
      department:     req.user.department,
      profilePicture: req.user.profilePicture
    };

    // 3. Redirect back to Frontend
    const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectUrl = `${frontendURL}/auth-callback?token=${token}&user=${encodeURIComponent(JSON.stringify(userData))}`;

    res.redirect(redirectUrl);
  } catch (error) {
    logger.error(`Google callback error: ${error.message}`);
    const fallbackURL = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${fallbackURL}/login?error=auth_failed`);
  }
};

// Logout — stateless JWT logout.
// Because JWTs are stateless, true server-side invalidation requires a token
// blocklist (e.g. Redis). Here we simply confirm the logout; the client is
// responsible for discarding the token from its storage.
// We do NOT call req.logout() or req.session.destroy() because this API is
// JWT-only and Passport sessions are not used in authenticated routes.
const logout = (req, res) => {
  try {
    logger.info(`User logged out: ${req.user?.email}`);
    res.json({ message: 'Logged out successfully. Please discard your token.' });
  } catch (error) {
    logger.error(`Logout error: ${error.message}`);
    res.status(500).json({ message: 'Logout failed' });
  }
};

module.exports = { getCurrentUser, googleCallback, logout };
