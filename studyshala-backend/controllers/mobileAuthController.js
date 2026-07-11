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

    // Faculty need Drive permission which cannot be granted through the native
    // idToken flow. Tell the app to open the browser OAuth flow instead.
    // The browser flow (/api/auth/google?role=faculty&platform=mobile) will
    // save driveRefreshToken on the user and redirect back via the
    // studyshala://auth-callback deep link with a JWT token — exactly the
    // same as if the faculty logged in through the website.
    // Students and admins are not affected — they continue below as normal.
    if (chosenRole === 'faculty') {
      const oauthUrl = `${process.env.BACKEND_URL}/api/auth/google?role=faculty&platform=mobile`;
      logger.info(`Faculty mobile login redirected to browser OAuth: ${oauthUrl}`);
      return res.status(200).json({
        requiresOAuth: true,
        oauthUrl,
        message: 'Faculty login requires Google Drive permission. Please complete login in the browser.',
      });
    }

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