const express  = require('express');
const router   = express.Router();
const passport = require('../config/passport');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// For mobile login
const mobileAuthController = require('../controllers/mobileAuthController');
router.post('/google/mobile', mobileAuthController.googleMobileLogin);

// Google OAuth — skip account picker if we know who's logging in
router.get('/google', (req, res, next) => {
  const role = ['faculty', 'admin', 'student'].includes(req.query.role)
    ? req.query.role : 'student';
    
  // Check if request is coming from mobile
  const platform = req.query.platform === 'mobile' ? 'mobile' : 'web';

  const loginHint = req.query.hint || null;

  const authOptions = {
    scope: ['profile', 'email'],
    // Pass both role and platform in the state string, separated by a pipe
    state: `${role}|${platform}`,
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