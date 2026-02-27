import axios from 'axios';

/**
 * Helper function to ensure the API URL is always formatted correctly.
 * If VITE_API_URL is just "https://test-of-studyshala.onrender.com", 
 * this will automatically append "/api" to prevent 404 Route Not Found errors.
 */
const getBaseUrl = () => {
  let url = import.meta.env.VITE_API_URL;
  
  if (!url) {
    // Fallback if environment variable is missing entirely
    return import.meta.env.DEV 
      ? '/api' 
      : 'https://test-of-studyshala.onrender.com/api';
  }

  // Remove trailing slash if present (e.g., .com/ -> .com)
  url = url.replace(/\/$/, '');
  
  // Auto-append /api if it's missing
  if (!url.endsWith('/api')) {
    url += '/api';
  }
  
  return url;
};

/**
 * StudyShala Axios Instance
 */
const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Navigation injector — avoids hard reloads in the SPA.
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

    // Do NOT redirect on 401 from the logout endpoint itself
    const isLogoutRequest = requestUrl.includes('/auth/logout');

    if (status === 401 && !isLogoutRequest) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      if (_navigate) {
        if (responseCode === 'TOKEN_EXPIRED') {
          _navigate('/login', { replace: true, state: { sessionExpired: true } });
        } else {
          _navigate('/login', { replace: true });
        }
      } else {
        // Fallback guard to prevent infinite reload loops
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
