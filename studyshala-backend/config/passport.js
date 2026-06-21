/**
 * config/passport.js  (FIXED)
 * ============================
 * BUG FIX: authRoutes.js sets state as "role|platform" (e.g. "student|mobile").
 * The old code did:  const chosenRole = req.query.state || 'student'
 * which gave chosenRole = "student|mobile" — corrupting the role field for new users.
 *
 * Fix: split state on '|' and take only the first part as the role.
 */
const passport       = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User           = require('../models/User');
const logger         = require('../utils/logger');

passport.use(
  new GoogleStrategy(
    {
      clientID:          process.env.GOOGLE_CLIENT_ID,
      clientSecret:      process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:       process.env.GOOGLE_CALLBACK_URL,
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        // state is "role|platform" e.g. "student|mobile" or "faculty|web"
        // Split on '|' and take the first segment as the role only.
        const rawState   = req.query.state || 'student';
        const chosenRole = rawState.split('|')[0]; // ← THE FIX

        const validRoles = ['student', 'faculty', 'admin'];
        const role = validRoles.includes(chosenRole) ? chosenRole : 'student';

        const email = profile.emails[0].value.toLowerCase();

        // Admin access guard
        if (role === 'admin') {
          const adminEmails = (process.env.ADMIN_EMAILS || '')
            .split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
          if (!adminEmails.includes(email)) {
            logger.warn(`Blocked admin login attempt: ${email}`);
            return done(null, false, { message: 'not_admin' });
          }
        }

        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          if (user.role !== 'admin') {
            user.role = role;
          }
          user.lastLogin = new Date();
          await user.save();
          logger.info(`Login: ${email} as ${user.role}`);
          return done(null, user);
        }

        user = new User({
          googleId:       profile.id,
          name:           profile.displayName,
          email:          profile.emails[0].value,
          role,
          profilePicture: profile.photos[0]?.value,
          lastLogin:      new Date(),
        });
        await user.save();
        logger.info(`New user: ${email} as ${role}`);
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