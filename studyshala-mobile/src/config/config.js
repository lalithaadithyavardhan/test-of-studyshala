/**
 * ============================================================================
 *  StudyShala Mobile — Central Configuration
 * ============================================================================
 *  This is the ONLY file you should need to edit to connect this app to
 *  your real studyshala-backend deployment on Render.
 *
 *  Everything here was reverse-engineered directly from your live
 *  studyshala-backend source (server.js, authRoutes.js, authController.js,
 *  studentRoutes.js, studentController.js, middleware/auth.js) — so the
 *  paths, response shapes, and auth flow below match your actual API.
 * ============================================================================
 */

// -----------------------------------------------------------------------
// 1. SET YOUR BACKEND URL HERE
// -----------------------------------------------------------------------
// This is your Render deployment, e.g. "https://studyshala-backend.onrender.com"
// Do NOT include a trailing slash.
export const API_BASE_URL = 'https://test-of-studyshala.onrender.com';

// Derived: all API routes are mounted under /api in server.js
export const API_URL = `${API_BASE_URL}/api`;

// -----------------------------------------------------------------------
// 2. GOOGLE OAUTH (matches authRoutes.js: GET /api/auth/google)
// -----------------------------------------------------------------------
// Your backend does browser-redirect OAuth (Passport + sessions), not a
// native id_token exchange — there's no mobileAuthController route wired
// up in the live backend yet. So the mobile app opens an in-app browser
// to this URL, the backend does its normal Google OAuth + Passport flow,
// and authController.js's googleCallback() redirects to:
//   `${FRONTEND_URL}/auth-callback?token=...&user=...`
//
// IMPORTANT: For this to work on mobile, your backend's FRONTEND_URL env
// var (or a parallel MOBILE_REDIRECT_URL you add) needs to be able to
// redirect back into this app via a deep link, e.g.:
//   studyshala://auth-callback?token=...&user=...
// Ask your backend dev (or future you) to add this as an allowed redirect,
// OR keep using the web FRONTEND_URL and have the in-app browser detect
// the `/auth-callback` URL and intercept it (handled in GoogleLoginScreen).
export const GOOGLE_AUTH_URL = `${API_URL}/auth/google?role=student`;

// Deep link scheme registered in app.json — used if/when the backend adds
// native deep-link redirect support.
export const APP_SCHEME = 'studyshala';

// -----------------------------------------------------------------------
// 3. STORAGE KEYS (SecureStore)
// -----------------------------------------------------------------------
export const STORAGE_KEYS = {
  TOKEN: 'studyshala_token',
  USER: 'studyshala_user',
};

// -----------------------------------------------------------------------
// 4. REQUEST TIMEOUTS
// -----------------------------------------------------------------------
// Matches axios.js: 60s default (covers Render free-tier cold start),
// longer timeout reserved for any future upload-type calls.
export const DEFAULT_TIMEOUT = 60000;
export const UPLOAD_TIMEOUT = 5 * 60 * 1000;
