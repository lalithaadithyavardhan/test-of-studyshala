/**
 * api/client.js
 * ==============
 * Mirrors studyshalaFrontend's src/api/axios.js, adapted for React Native:
 *   - SecureStore instead of localStorage for the JWT
 *   - A force-logout HANDLER (set by AuthContext) instead of a hard
 *     `window.location.href` redirect, since RN has no such thing —
 *     navigation reacts to isAuthenticated flipping to false instead.
 *   - Same "only clear auth on a CONFIRMED token error" rule, so a
 *     Render cold-start timeout or flaky network never logs the user out.
 */
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL, STORAGE_KEYS } from '../config/config';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  // 60s covers Render free-tier cold-start wakeup for normal API calls
  timeout: 60000,
});

let forceLogoutHandler = null;
export const setForceLogoutHandler = (fn) => {
  forceLogoutHandler = fn;
};

// Attach JWT token to every request
api.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync(STORAGE_KEYS.TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // File uploads: server → Google Drive can take minutes for large files
    // on Render's free tier. Give multipart requests a much longer timeout.
    if (
      typeof config.headers['Content-Type'] === 'string' &&
      config.headers['Content-Type'].includes('multipart/form-data')
    ) {
      config.timeout = 5 * 60 * 1000; // 5 minutes
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — only clear auth on CONFIRMED token errors, never on
// network failures or backend cold-start errors. Prevents users from being
// logged out just because Render free tier is waking up.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const msg = (error.response?.data?.message || '').toLowerCase();

      const isRealTokenError =
        msg.includes('invalid or expired token') ||
        msg.includes('invalid token') ||
        msg.includes('expired') ||
        msg.includes('user not found');

      // NOTE: deliberately excludes 'no token' — that fires on requests that
      // race before the token is attached, not on a genuinely bad token.

      if (isRealTokenError) {
        await SecureStore.deleteItemAsync(STORAGE_KEYS.TOKEN).catch(() => {});
        await SecureStore.deleteItemAsync(STORAGE_KEYS.USER).catch(() => {});
        if (forceLogoutHandler) forceLogoutHandler();
      }
      // Any other 401 (e.g. cold-start hiccup) — do nothing, user stays logged in.
    }
    return Promise.reject(error);
  }
);

export default api;
