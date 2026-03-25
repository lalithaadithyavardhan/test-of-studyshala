const express  = require('express');
const router   = express.Router();
const passport = require('../config/passport');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// Google OAuth — skip account picker if we know who's logging in
router.get('/google', (req, res, next) => {
  const role = ['faculty', 'admin', 'student'].includes(req.query.role)
    ? req.query.role : 'student';

  // login_hint: if the frontend passes the user's email, Google skips the
  // account picker and signs them in directly. No prompt needed.
  // If no hint, omit prompt so Google uses its own smart default
  // (signs in automatically if only one account, shows picker if multiple).
  const loginHint = req.query.hint || null;

  const authOptions = {
    scope: ['profile', 'email'],
    state: role,
  };

  if (loginHint) {
    // Known user — skip picker, go straight to their account
    authOptions.login_hint = loginHint;
  }
  // No prompt: 'select_account' — never force the picker

  passport.authenticate('google', authOptions)(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', (err, user, info) => {
    if (err)   return next(err);

    // Blocked admin attempt
    if (!user && info?.message === 'not_admin') {
      const redirectBase = req.query.state === 'admin'
        ? `${process.env.FRONTEND_URL}/admin/login`
        : `${process.env.FRONTEND_URL}/login`;
      return res.redirect(`${redirectBase}?error=not_admin`);
    }

    if (!user) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
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
