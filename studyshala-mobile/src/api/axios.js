import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../constants/config';

const TOKEN_KEY = 'studyshala_token';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // General timeout — 60s covers cold-start wakeup for normal API calls
  // (same reasoning as the web app: Render free tier can take a while to wake up)
  timeout: 60000,
});

// Attach JWT token to every request
api.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // File uploads need a much longer timeout — same reasoning as web app:
    // browser/app -> server (multer buffer) + server -> Google Drive can take
    // 2-3 minutes for larger files on Render free tier.
    if (config.headers['Content-Type'] === 'multipart/form-data') {
      config.timeout = 5 * 60 * 1000; // 5 minutes for file uploads
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — only clear auth on CONFIRMED token errors, never on
// network failures or backend cold-start errors. This prevents users from
// being logged out when Render free tier is waking up. authErrorHandler is
// injected from AuthContext so this file doesn't need navigation logic.
let authErrorHandler = null;
export const setAuthErrorHandler = (handler) => {
  authErrorHandler = handler;
};

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

      if (isRealTokenError && authErrorHandler) {
        authErrorHandler();
      }
      // For any other 401 (e.g. cold-start hiccup), do nothing —
      // the user stays logged in from secure storage.
    }
    return Promise.reject(error);
  }
);

export default api;
export { TOKEN_KEY };
