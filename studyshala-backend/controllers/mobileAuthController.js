const { OAuth2Client } = require('google-auth-library');
const { generateToken } = require('../utils/jwt');
const User = require('../models/User');
const logger = require('../utils/logger');

const client = new OAuth2Client();

const googleMobileLogin = async (req, res) => {
  try {
    const { idToken, role } = req.body;
    if (!idToken) {
      return res.status(400).json({ message: 'idToken is required' });
    }

    const chosenRole = ['student', 'faculty', 'admin'].includes(role) ? role : 'student';

    const ticket = await client.verifyIdToken({
      idToken,
      audience: [process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_ANDROID_CLIENT_ID],
    });
    const payload = ticket.getPayload();
    const email = payload.email.toLowerCase();

    // Admin access guard — identical logic to config/passport.js
    if (chosenRole === 'admin') {
      const adminEmails = (process.env.ADMIN_EMAILS || '')
        .split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
      if (!adminEmails.includes(email)) {
        logger.warn(`Blocked admin mobile login attempt: ${email}`);
        return res.status(403).json({ message: 'not_admin' });
      }
    }

    let user = await User.findOne({ googleId: payload.sub });

    if (user) {
      // Never downgrade an existing admin — same rule as config/passport.js
      if (user.role !== 'admin') {
        user.role = chosenRole;
      }
      user.lastLogin = new Date();
      await user.save();
      logger.info(`Mobile login: ${email} as ${user.role}`);
    } else {
      user = new User({
        googleId: payload.sub,
        name: payload.name,
        email: payload.email,
        role: chosenRole,
        profilePicture: payload.picture,
        lastLogin: new Date(),
      });
      await user.save();
      logger.info(`New mobile user: ${email} as ${chosenRole}`);
    }

    const token = generateToken(user);
    await User.findByIdAndUpdate(user._id, { token });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        profilePicture: user.profilePicture,
        tourCompleted: user.tourCompleted || false,
        phase2TourCompleted: user.phase2TourCompleted || false,
      },
    });
  } catch (error) {
    logger.error(`Mobile Google auth error: ${error.message}`);
    res.status(401).json({ message: 'Google authentication failed' });
  }
};

module.exports = { googleMobileLogin };