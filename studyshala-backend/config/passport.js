/**
 * config/passport.js  (FIXED)
 * ============================
 * BUG FIX #1: authRoutes.js sets state as "role|platform" (e.g. "student|mobile").
 * Split on '|' and take only the first part as the role.
 *
 * BUG FIX #2 (this pass): accessToken/refreshToken returned by Google were being
 * received by this callback but never saved anywhere. Faculty granted Drive
 * permission, Google sent back real tokens, and this file discarded them —
 * which is why every upload was falling back to the shared admin Drive account.
 * Now both tokens are saved on the user document.
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
    async (req, accessToken, refreshToken, params, profile, done) => {
      try {
        // state is "role|platform" e.g. "student|mobile" or "faculty|web"
        const rawState   = req.query.state || 'student';
        const chosenRole = rawState.split('|')[0];

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

          // FIX: actually persist the Drive tokens for faculty on every login.
          
            // Google only sends a refreshToken on first consent / when
            // prompt=consent forces it. Keep the previous one if this
            // particular response didn't include a new one.
          

          if (role === 'faculty') {
            user.driveAccessToken = accessToken;
              if (refreshToken) {
                user.driveRefreshToken = refreshToken;
              }
            if (params?.expiry_date) {
              user.driveTokenExpiry = params.expiry_date;
           }
          }




          user.lastLogin = new Date();
          await user.save();
          logger.info(`Login: ${email} as ${user.role} (driveRefreshToken ${user.driveRefreshToken ? 'present' : 'MISSING'})`);
          return done(null, user);
        }

        user = new User({
          googleId:          profile.id,
          name:              profile.displayName,
          email:             profile.emails[0].value,
          role,
          profilePicture:    profile.photos[0]?.value,
          lastLogin:         new Date(),
          driveAccessToken:  role === 'faculty' ? accessToken                   : undefined,
          driveRefreshToken: role === 'faculty' ? refreshToken                  : undefined,
          driveTokenExpiry:  role === 'faculty' ? (params?.expiry_date || null) : undefined,
        });
        await user.save();
        logger.info(`New user: ${email} as ${role} (driveRefreshToken ${user.driveRefreshToken ? 'present' : 'MISSING'})`);
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