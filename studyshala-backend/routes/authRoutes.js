const express  = require('express');
const router   = express.Router();
const passport = require('../config/passport');
const crypto   = require('crypto');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// In-memory CSRF state store.
// For multi-instance deployments, replace this with a shared cache (e.g. Redis)
// with a short TTL (e.g. 10 minutes).
const oauthStateStore = new Map();

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Periodically clean up expired state entries to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of oauthStateStore.entries()) {
    if (now > value.expiresAt) {
      oauthStateStore.delete(key);
    }
  }
}, 5 * 60 * 1000); // run every 5 minutes

// Google OAuth initiation
// Uses a cryptographically secure random `state` parameter to prevent CSRF attacks.
// The requested user role is embedded inside the state store (server-side), NOT in
// the URL, so it cannot be tampered with by an attacker.
router.get('/google', (req, res, next) => {
  const role = ['faculty', 'admin', 'student'].includes(req.query.role)
    ? req.query.role
    : 'student';

  // Generate a cryptographically secure random state token
  const stateToken = crypto.randomBytes(32).toString('hex');

  // Store the role alongside an expiry time, keyed by the state token
  oauthStateStore.set(stateToken, {
    role,
    expiresAt: Date.now() + STATE_TTL_MS
  });

  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state: stateToken,
    prompt: 'select_account'
  })(req, res, next);
});

// Google OAuth callback
router.get('/google/callback', (req, res, next) => {
  const stateToken = req.query.state;

  // --- CSRF Validation ---
  const stateData = stateToken ? oauthStateStore.get(stateToken) : null;

  if (!stateData) {
    logger && logger.warn && logger.warn(`OAuth callback: unknown or missing state token`);
    return res.redirect(`${process.env.FRONTEND_URL}/login?error=invalid_state`);
  }

  if (Date.now() > stateData.expiresAt) {
    oauthStateStore.delete(stateToken);
    return res.redirect(`${process.env.FRONTEND_URL}/login?error=state_expired`);
  }

  // State is valid — consume it (one-time use)
  oauthStateStore.delete(stateToken);

  const { role } = stateData;

  passport.authenticate('google', (err, user, info) => {
    if (err) return next(err);

    // Blocked admin attempt
    if (!user && info?.message === 'not_admin') {
      const redirectBase = role === 'admin'
        ? `${process.env.FRONTEND_URL}/admin/login`
        : `${process.env.FRONTEND_URL}/login`;
      return res.redirect(`${redirectBase}?error=not_admin`);
    }

    if (!user) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
    }

    // Attach the verified role to the user object so googleCallback can use it if needed
    req.resolvedRole = role;

    req.logIn(user, (loginErr) => {
      if (loginErr) return next(loginErr);
      authController.googleCallback(req, res);
    });
  })(req, res, next);
});

router.get('/user',    authenticate, authController.getCurrentUser);
router.post('/logout', authenticate, authController.logout);

module.exports = router;
