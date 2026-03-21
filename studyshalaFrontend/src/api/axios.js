import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  // Give the Render backend time to wake up from sleep
  timeout: 60000,
});

// Attach JWT token to every request
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

// ── Response interceptor ──────────────────────────────────────────────────────
// FIX: Do NOT clear token on every 401.
// Render free tier backends sleep after 15 min — a cold-start wakeup can
// cause temporary failures that look like 401s. Clearing the token here
// would force the user to log in again every time the backend sleeps.
//
// Instead: only clear the token if the backend explicitly says the token
// is invalid (via a specific error message), not on any network hiccup.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const msg = error.response?.data?.message || '';
      // Only log out if backend explicitly says token is bad
      // NOT on cold-start errors, CORS issues, or network timeouts
      const isRealAuthError =
        msg.toLowerCase().includes('invalid') ||
        msg.toLowerCase().includes('expired') ||
        msg.toLowerCase().includes('no token') ||
        msg.toLowerCase().includes('not found');

      if (isRealAuthError) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      // Otherwise: just reject the promise — let the page handle it gracefully
    }
    return Promise.reject(error);
  }
);

export default api;
