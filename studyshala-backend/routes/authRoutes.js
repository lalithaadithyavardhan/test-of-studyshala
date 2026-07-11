const express  = require('express');
const router   = express.Router();
const passport = require('../config/passport');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// For mobile login
const mobileAuthController = require('../controllers/mobileAuthController');
router.post('/google/mobile', mobileAuthController.googleMobileLogin);

// Google OAuth — request Drive scope for faculty so files upload to their own Drive
router.get('/google', (req, res, next) => {
  const role = ['faculty', 'admin', 'student'].includes(req.query.role)
    ? req.query.role : 'student';

  // Check if request is coming from mobile
  const platform = req.query.platform === 'mobile' ? 'mobile' : 'web';

  const loginHint = req.query.hint || null;

  // Faculty need Drive scope so their files go to their own Google Drive.
  // Students and admins only need profile + email.
  const scope = role === 'faculty'
    ? ['profile', 'email', 'https://www.googleapis.com/auth/drive.file']
    : ['profile', 'email'];

  const authOptions = {
    scope,
    // Pass both role and platform in the state string, separated by a pipe
    state:          `${role}|${platform}`,
    // Always prompt faculty for consent so Google returns a refresh token
    // NOTE: passport-google-oauth20 only reads the camelCase key "accessType" —
    // it silently ignores "access_type", which was the root cause of refresh
    // tokens never being issued to faculty accounts.
    accessType:     role === 'faculty' ? 'offline' : 'online',
    prompt:         role === 'faculty' ? 'consent' : undefined,
  };

  if (loginHint) {
    authOptions.login_hint = loginHint;
  }

  passport.authenticate('google', authOptions)(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', (err, user, info) => {
    if (err) return next(err);

    const state = req.query.state || '';
    const isMobile = state.includes('mobile');
    const isAdmin = state.includes('admin');

    // Blocked admin attempt
    if (!user && info?.message === 'not_admin') {
      const redirectBase = isAdmin
        ? `${process.env.FRONTEND_URL}/admin/login`
        : `${process.env.FRONTEND_URL}/login`;
      return res.redirect(`${redirectBase}?error=not_admin`);
    }

    if (!user) {
      const failBase = isMobile ? 'studyshala://auth-callback' : process.env.FRONTEND_URL;
      return res.redirect(`${failBase}/login?error=auth_failed`);
    }

    req.logIn(user, (loginErr) => {
      if (loginErr) return next(loginErr);
      authController.googleCallback(req, res);
    });
  })(req, res, next);
});

router.get('/user',            authenticate, authController.getCurrentUser);
router.post('/logout',         authenticate, authController.logout);
router.post('/tour-complete',        authenticate, authController.tourComplete);
router.post('/tour-reset',           authenticate, authController.tourReset);
router.post('/phase2-tour-complete', authenticate, authController.phase2TourComplete);
router.post('/phase2-tour-reset',    authenticate, authController.phase2TourReset);

module.exports = router;