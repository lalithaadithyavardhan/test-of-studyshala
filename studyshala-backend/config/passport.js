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
        // 1. Safely extract email and profile picture
        if (!profile.emails || profile.emails.length === 0) {
          return done(new Error('No email found in Google profile'), null);
        }
        const email = profile.emails[0].value.toLowerCase();
        const profilePicture = profile.photos && profile.photos.length > 0 
          ? profile.photos[0].value 
          : '';

        // 2. Strictly validate the requested role
        const rawRole = req.oauthRole || req.query.role || req.query.state;
        let chosenRole = ['student', 'faculty', 'admin'].includes(rawRole) 
          ? rawRole 
          : 'student';

        // Parse admin whitelist
        const adminEmails = (process.env.ADMIN_EMAILS || '')
          .split(',')
          .map(e => e.trim().toLowerCase())
          .filter(Boolean);

        // 3. Admin Access Guard & Auto-Upgrade
        if (chosenRole === 'admin') {
          if (!adminEmails.includes(email)) {
            logger.warn(`Blocked unauthorized admin login attempt: ${email}`);
            return done(null, false, { message: 'not_admin' });
          }
        } else if (adminEmails.includes(email)) {
          // Automatically upgrade whitelisted emails to admin securely
          chosenRole = 'admin';
        }

        // 4. Find existing user
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          // 👇 MODIFIED FOR TESTING: 
          // Removed the safeguard that prevents switching between Student and Faculty.
          // We only protect the 'admin' role from being overwritten.
          if (user.role === 'admin') {
            chosenRole = 'admin'; 
          }

          // Update user details to whatever button was clicked
          user.role      = chosenRole;
          user.lastLogin = new Date();
          await user.save();
          
          logger.info(`Login: ${email} as ${chosenRole}`);
          return done(null, user);
        }

        // 5. Create new user
        user = new User({
          googleId:       profile.id,
          name:           profile.displayName,
          email:          email,
          role:           chosenRole,
          profilePicture: profilePicture,
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
