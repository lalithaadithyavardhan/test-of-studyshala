/**
 * api/authApi.js
 * ===============
 * 1:1 mapping to authRoutes.js (the auth endpoints that need a JWT already —
 * the actual login call lives in screens/LoginScreen.jsx since it talks to
 * /auth/google/mobile directly via fetch(), matching mobileAuthController.js).
 */
import api from './client';

export const getCurrentUser = () => api.get('/auth/user');

export const logoutRequest = () => api.post('/auth/logout');

export const tourComplete = () => api.post('/auth/tour-complete');
export const tourReset = () => api.post('/auth/tour-reset');
export const phase2TourComplete = () => api.post('/auth/phase2-tour-complete');
export const phase2TourReset = () => api.post('/auth/phase2-tour-reset');
