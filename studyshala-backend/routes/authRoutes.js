const express  = require('express');
const router   = express.Router();
const passport = require('../config/passport');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// Google OAuth — prompt=select_account ensures account picker shows every time
router.get('/google', (req, res, next) => {
  const role = ['faculty', 'admin', 'student'].includes(req.query.role)
    ? req.query.role : 'student';

  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state: role,
    prompt: 'select_account'
  })(req, res, next);
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

router.get('/user',   authenticate, authController.getCurrentUser);
router.post('/logout', authenticate, authController.logout);

module.exports = router;
