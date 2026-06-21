/**
 * config/config.js
 * ==================
 * ⚠️  EDIT THIS FILE — set API_BASE_URL to your real Render backend URL.
 * Everything else is derived automatically.
 */

export const API_BASE_URL = 'https://YOUR_BACKEND.onrender.com';

export const API_URL = `${API_BASE_URL}/api`;

// Used for the browser-redirect Google OAuth flow (web-style, used as a
// fallback / alternative to native Google Sign-In). Matches authRoutes.js:
//   GET /api/auth/google?role=<role>&platform=mobile&hint=<email>
export const GOOGLE_AUTH_URL = (role, hint) => {
  const url = new URL(`${API_URL}/auth/google`);
  url.searchParams.set('role', role);
  url.searchParams.set('platform', 'mobile');
  if (hint) url.searchParams.set('hint', hint);
  return url.toString();
};

// Native Google Sign-In Web Client ID (Google Cloud Console → OAuth Client →
// "Web application" type — same one used as GOOGLE_CLIENT_ID on the backend).
export const GOOGLE_WEB_CLIENT_ID =
  '1051792797895-c6cmvt6gm8f565tu81l14tafdhae123r.apps.googleusercontent.com';

export const STORAGE_KEYS = {
  TOKEN: 'studyshala_token',
  USER: 'studyshala_user',
  LAST_ROLE: 'studyshala_last_role',
};

export const DEPARTMENTS = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT'];
export const SEMESTERS = ['1', '2', '3', '4', '5', '6', '7', '8'];

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB, matches backend multer limit

export const ALLOWED_FILE_EXTENSIONS = [
  'pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt',
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'zip', 'rar', '7z', 'mp4', 'mp3',
];
