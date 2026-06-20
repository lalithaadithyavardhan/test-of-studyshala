import api from './axios';

export const getStats = () => api.get('/admin/stats');
export const getUsers = () => api.get('/admin/users');
export const deactivateUser = (id) => api.patch(`/admin/users/${id}/deactivate`);
export const activateUser = (id) => api.patch(`/admin/users/${id}/activate`);
export const getAnnouncements = () => api.get('/admin/announcements');
export const createAnnouncement = (payload) => api.post('/admin/announcements', payload);
