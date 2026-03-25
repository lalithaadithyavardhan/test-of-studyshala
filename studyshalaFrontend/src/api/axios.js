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

// Response interceptor — only clear auth on explicit token errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const msg = error.response?.data?.message || '';
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
    }
    return Promise.reject(error);
  }
);

export default api;
