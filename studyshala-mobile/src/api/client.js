/**
 * api/client.js
 * =============
 * Mirrors studyshalaFrontend's src/api/axios.js, adapted for React Native:
 *  - SecureStore instead of localStorage
 *  - Same "don't log out on cold-start/network errors" interceptor logic,
 *    copied from the real axios.js to avoid kicking students out while the
 *    Render free-tier backend wakes up from sleep.
 */
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL, STORAGE_KEYS, DEFAULT_TIMEOUT } from '../config/config';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // 60s covers Render cold-start wakeup, same as the website
  timeout: DEFAULT_TIMEOUT,
});

// Attach JWT token to every request
api.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync(STORAGE_KEYS.TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Listeners the AuthContext can subscribe to, so this file never has to
// import AuthContext directly (avoids circular imports).
let onForceLogout = null;
export const setForceLogoutHandler = (fn) => {
  onForceLogout = fn;
};

// Response interceptor — only clear auth on CONFIRMED token errors, never
// on network failures or backend cold-start errors. This is the exact
// logic from the real axios.js so behavior matches the website.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const msg = (error.response?.data?.message || '').toLowerCase();

      // These messages are sent by the real auth middleware only when the
      // token is genuinely bad — never during a cold-start timeout.
      const isRealTokenError =
        msg.includes('invalid or expired token') ||
        msg.includes('invalid token') ||
        msg.includes('expired') ||
        msg.includes('user not found');

      // NOTE: deliberately NOT matching 'no token' — that can fire on
      // requests that race before the token is attached, not on actual
      // bad tokens.

      if (isRealTokenError) {
        await SecureStore.deleteItemAsync(STORAGE_KEYS.TOKEN);
        await SecureStore.deleteItemAsync(STORAGE_KEYS.USER);
        if (onForceLogout) onForceLogout();
      }
      // For any other 401 (e.g. cold-start hiccup), do nothing —
      // the user stays logged in.
    }
    return Promise.reject(error);
  }
);

export default api;
