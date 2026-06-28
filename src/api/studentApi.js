/**
 * api/studentApi.js
 * ==================
 * 1:1 mapping to studentRoutes.js / studentController.js.
 */
import api from './client';

export const validateAccessCode = (accessCode) =>
  api.post('/student/validate-code', { accessCode });

export const saveMaterial = (materialId) =>
  api.post('/student/save-material', { materialId });

export const getSavedMaterials = () => api.get('/student/saved-materials');

export const removeSavedMaterial = (id) =>
  api.delete(`/student/saved-materials/${id}`);

export const getAccessHistory = () => api.get('/student/access-history');

export const getMaterialFiles = (id) => api.get(`/student/materials/${id}/files`);

// NOTE: backend redirects this route straight to the Google Drive public URL
// (no proxy) — see studentRoutes.js comment. For mobile we don't call this
// via axios; fileActions.js opens file.downloadUrl / previewUrl directly.
export const getDownloadUrl = (id, fileId) =>
  `${api.defaults.baseURL}/student/materials/${id}/files/${fileId}/download`;

export const trackRecentFile = (payload) => api.post('/student/recent-files', payload);

export const getRecentFiles = () => api.get('/student/recent-files');

export const starFile = (payload) => api.post('/student/starred-files', payload);

export const unstarFile = (fileId) => api.delete(`/student/starred-files/${fileId}`);

export const getStarredFiles = () => api.get('/student/starred-files');
export const getMaterialVersion = (id, localVersion) =>
  api.get(`/student/material-version/${id}`, { params: { localVersion } });
