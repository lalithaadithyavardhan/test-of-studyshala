import api from './axios';

export const validateAccessCode = (code) => api.post('/student/validate-code', { code });
export const saveMaterial = (materialId) => api.post('/student/save-material', { materialId });
export const getSavedMaterials = () => api.get('/student/saved-materials');
export const removeSavedMaterial = (id) => api.delete(`/student/saved-materials/${id}`);
export const getAccessHistory = () => api.get('/student/access-history');
export const getMaterialFiles = (materialId) => api.get(`/student/materials/${materialId}/files`);

// Returns the Google Drive public download URL for this file — open with
// expo-web-browser or Linking.openURL, no need to stream the bytes yourself.
export const getDownloadUrl = (materialId, fileId) =>
  `/student/materials/${materialId}/files/${fileId}/download`;

export const trackRecentFile = (payload) => api.post('/student/recent-files', payload);
export const getRecentFiles = () => api.get('/student/recent-files');

export const starFile = (payload) => api.post('/student/starred-files', payload);
export const unstarFile = (fileId) => api.delete(`/student/starred-files/${fileId}`);
export const getStarredFiles = () => api.get('/student/starred-files');
