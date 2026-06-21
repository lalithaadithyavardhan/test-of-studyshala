/**
 * api/authApi.js
 * ==============
 * Maps to routes/authRoutes.js:
 *   GET  /auth/google           (browser redirect — handled separately
 *                                 via WebBrowser, see GoogleLoginScreen)
 *   GET  /auth/user             authenticate -> getCurrentUser
 *   POST /auth/logout           authenticate -> logout
 */
import api from './client';

// GET /auth/user -> { user: {...} }
export const getCurrentUser = () => api.get('/auth/user');

// POST /auth/logout -> { message: 'Logged out successfully' }
export const logoutRequest = () => api.post('/auth/logout');
