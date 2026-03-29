import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  // General timeout — 60s covers cold-start wakeup for normal API calls
  timeout: 60000,
});

// Attach JWT token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // File uploads need a much longer timeout:
    // browser→server (multer buffer) + server→Google Drive can take 2-3 minutes
    // for larger files on Render free tier. Override timeout for multipart requests.
    if (config.headers['Content-Type'] === 'multipart/form-data') {
      config.timeout = 5 * 60 * 1000; // 5 minutes for file uploads
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — only clear auth on CONFIRMED token errors, never on
// network failures or backend cold-start errors. This prevents users from being
// logged out when Render free tier is waking up.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only act on 401 responses that actually came back from the server
    // (i.e. error.response exists). A timeout or network error has no response.
    if (error.response?.status === 401) {
      const msg = (error.response?.data?.message || '').toLowerCase();

      // These messages are sent by our own auth middleware only when the
      // token is genuinely bad — never during a cold-start timeout.
      const isRealTokenError =
        msg.includes('invalid or expired token') ||
        msg.includes('invalid token') ||
        msg.includes('expired') ||
        msg.includes('user not found');

      // NOTE: Do NOT include 'no token' here — that fires on requests that race
      // before the token is attached, not on actual bad tokens.

      if (isRealTokenError) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      // For any other 401 (e.g. cold-start hiccup), do nothing —
      // the user stays logged in from localStorage.
    }
    return Promise.reject(error);
  }
);

export default api;
