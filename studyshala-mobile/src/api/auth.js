import api from './axios';

// Exchanges a Google ID token (from native Google Sign-In) for a StudyShala JWT.
// Backend route: POST /api/auth/google/mobile  (added alongside the existing
// web OAuth routes — see studyshala-backend changes).
export const googleMobileLogin = (idToken, role) =>
  api.post('/auth/google/mobile', { idToken, role });

export const getCurrentUser = () => api.get('/auth/user');

export const logout = () => api.post('/auth/logout');

export const completeTour = () => api.post('/auth/tour-complete');
export const resetTour = () => api.post('/auth/tour-reset');
export const completePhase2Tour = () => api.post('/auth/phase2-tour-complete');
export const resetPhase2Tour = () => api.post('/auth/phase2-tour-reset');
