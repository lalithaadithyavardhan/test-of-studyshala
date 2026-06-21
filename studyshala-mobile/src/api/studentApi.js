/**
 * api/studentApi.js
 * =================
 * Every function here maps 1:1 to a route in your real backend's
 * routes/studentRoutes.js (mounted at /api/student, requires
 * authenticate + isStudent middleware — handled automatically by the
 * Authorization header attached in client.js).
 *
 *   POST   /validate-code
 *   POST   /save-material
 *   GET    /saved-materials
 *   DELETE /saved-materials/:id
 *   GET    /access-history
 *   GET    /materials/:id/files
 *   GET    /materials/:id/files/:fileId/download
 *   POST   /recent-files
 *   GET    /recent-files
 *   POST   /starred-files
 *   DELETE /starred-files/:fileId
 *   GET    /starred-files
 */
import api from './client';

// POST /student/validate-code  body: { accessCode }
// -> { valid: true, material: {...} } | { valid: false, message }
export const validateAccessCode = (accessCode) =>
  api.post('/student/validate-code', { accessCode });

// POST /student/save-material  body: { materialId }
export const saveMaterial = (materialId) =>
  api.post('/student/save-material', { materialId });

// GET /student/saved-materials -> { materials: [...] }
export const getSavedMaterials = () => api.get('/student/saved-materials');

// DELETE /student/saved-materials/:id
export const removeSavedMaterial = (id) =>
  api.delete(`/student/saved-materials/${id}`);

// GET /student/access-history -> { history: [...] }
export const getAccessHistory = () => api.get('/student/access-history');

// GET /student/materials/:id/files -> { material, files, subFolders }
export const getMaterialFiles = (materialId) =>
  api.get(`/student/materials/${materialId}/files`);

// GET /student/materials/:id/files/:fileId/download -> binary stream
// On mobile we don't stream through axios; we open this URL directly
// (see buildDownloadUrl) using expo-file-system / Linking / WebBrowser.
export const buildDownloadUrl = (apiBaseUrl, materialId, fileId) =>
  `${apiBaseUrl}/student/materials/${materialId}/files/${fileId}/download`;

// POST /student/recent-files  body: { fileId, fileName, mimeType, materialId, subjectName }
export const trackRecentFile = (payload) =>
  api.post('/student/recent-files', payload);

// POST /student/recent-files  body: { clear: true }  (clears all)
export const clearRecentFiles = () =>
  api.post('/student/recent-files', { clear: true });

// GET /student/recent-files -> { recentFiles: [...] }
export const getRecentFiles = () => api.get('/student/recent-files');

// POST /student/starred-files  body: { fileId, fileName, mimeType, materialId, subjectName }
export const starFile = (payload) => api.post('/student/starred-files', payload);

// DELETE /student/starred-files/:fileId
export const unstarFile = (fileId) =>
  api.delete(`/student/starred-files/${fileId}`);

// GET /student/starred-files -> { starredFiles: [...] }
export const getStarredFiles = () => api.get('/student/starred-files');
