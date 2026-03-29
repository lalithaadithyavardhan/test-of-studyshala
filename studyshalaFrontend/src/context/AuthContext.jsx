const express  = require('express');
const router   = express.Router();
const passport = require('../config/passport');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// Google OAuth — skip account picker if we know who's logging in
router.get('/google', (req, res, next) => {
  const role = ['faculty', 'admin', 'student'].includes(req.query.role)
    ? req.query.role : 'student';

  const loginHint = req.query.hint || null;

  // 'silent=1' means the frontend wants a fully silent sign-in (no UI at all).
  // We pass prompt:'none' to Google, which auto-signs the user in without
  // showing the account picker. If Google can't do it silently (session expired,
  // multiple accounts, etc.) it returns error=interaction_required, which we
  // catch in the callback and redirect back to /login for a normal sign-in.
  const silent = req.query.silent === '1';

  const authOptions = {
    scope: ['profile', 'email'],
    state: role,
  };

  if (loginHint) {
    // Pre-fill the account so Google knows which account to use
    authOptions.login_hint = loginHint;
  }

  if (silent && loginHint) {
    // Full silent sign-in — no account picker shown at all
    authOptions.prompt = 'none';
  }
  // Without silent: no prompt set — Google auto-signs if one session active,
  // shows picker only if multiple accounts are logged in the browser.

  passport.authenticate('google', authOptions)(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
  // Handle Google's error=interaction_required (silent sign-in failed).
  // This happens when prompt:'none' was used but Google needs user interaction
  // (e.g. session expired, consent needed, multiple accounts).
  // Solution: redirect back to login page so user can click the button normally.
  if (req.query.error === 'interaction_required' || req.query.error === 'consent_required') {
    return res.redirect(`${process.env.FRONTEND_URL}/login?error=silent_failed`);
  }

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
