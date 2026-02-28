const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const logger = require('../utils/logger');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      passReqToCallback: true
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const chosenRole = req.query.state || 'student'; // 'student' | 'faculty' | 'admin'
        const email = profile.emails[0].value.toLowerCase();

        // Admin access guard — only whitelisted emails can be admin
        if (chosenRole === 'admin') {
          const adminEmails = (process.env.ADMIN_EMAILS || '')
            .split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

          if (!adminEmails.includes(email)) {
            logger.warn(`Blocked admin login attempt: ${email}`);
            return done(null, false, { message: 'not_admin' });
          }
        }

        // Find existing user
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          // Update role to what they chose (admin only if whitelisted — checked above)
          user.role      = chosenRole;
          user.lastLogin = new Date();
          await user.save();
          logger.info(`Login: ${email} as ${chosenRole}`);
          return done(null, user);
        }

        // New user
        user = new User({
          googleId:       profile.id,
          name:           profile.displayName,
          email:          profile.emails[0].value,
          role:           chosenRole,
          profilePicture: profile.photos[0]?.value,
          lastLogin:      new Date()
        });
        await user.save();
        logger.info(`New user: ${email} as ${chosenRole}`);
        done(null, user);

      } catch (error) {
        logger.error(`OAuth error: ${error.message}`);
        done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (id, done) => {
  try {
    done(null, await User.findById(id));
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
