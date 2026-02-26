import axios from 'axios';

/**
 * StudyShala Axios Instance
 * Configured for dynamic environment switching (Local Dev vs Production).
 */
const api = axios.create({
  // FIXED: Prioritize environment variables over hardcoded URLs.
  // Falls back to local proxy '/api' if DEV, otherwise the deployed Render URL if the env var is missing.
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.DEV 
    ? '/api' 
    : 'https://test-of-studyshala.onrender.com/api'),
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Navigation injector — avoids hard reloads in the SPA.
 *
 * Usage in your App.jsx (or main router file):
 *
 * import { useEffect } from 'react';
 * import { useNavigate } from 'react-router-dom';
 * import { injectNavigator } from '../api/axios';
 *
 * function NavigationInjector() {
 * const navigate = useNavigate();
 * useEffect(() => { injectNavigator(navigate); }, [navigate]);
 * return null;
 * }
 *
 * Then render <NavigationInjector /> as the first child inside <Router>.
 * This gives the interceptor access to React Router's navigate function
 * without violating the rules of hooks.
 */
let _navigate = null;
export const injectNavigator = (navigateFn) => {
  _navigate = navigateFn;
};

// ── Request interceptor: attach JWT ─────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: handle global errors ──────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const responseCode = error.response?.data?.code; // e.g. 'TOKEN_EXPIRED'
    const requestUrl = error.config?.url || '';

    // Do NOT redirect on 401 from the logout endpoint itself — the token may
    // already be expired when the user clicks "Logout", and we must let the
    // logout flow finish cleanly without the interceptor hijacking it.
    const isLogoutRequest = requestUrl.includes('/auth/logout');

    if (status === 401 && !isLogoutRequest) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // Use React Router's navigate for a smooth SPA redirect (no hard reload /
      // no React state destruction / no white flash).
      if (_navigate) {
        if (responseCode === 'TOKEN_EXPIRED') {
          // Pass a flag so the login page can show a "Session expired" message.
          _navigate('/login', { replace: true, state: { sessionExpired: true } });
        } else {
          _navigate('/login', { replace: true });
        }
      } else {
        // Fallback: _navigate not yet injected (very early load). A hard redirect
        // is unavoidable here, but this path should almost never be hit.
        // FIXED: Added a check to prevent infinite reload loops if already on the login page.
        if (window.location.pathname !== '/login') {
          window.location.href = responseCode === 'TOKEN_EXPIRED' 
            ? '/login?expired=true' 
            : '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
