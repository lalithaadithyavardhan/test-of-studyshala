/**
 * api/facultyApi.js
 * ==================
 * 1:1 mapping to facultyRoutes.js / facultyController.js.
 *
 * Uploads use React Native's FormData with { uri, name, type } file objects
 * (the RN equivalent of a browser File), built from an expo-document-picker
 * result in UploadFilesScreen.jsx.
 */
import api from './client';

// ── Materials (folders) ────────────────────────────────────────────────────

export const getFolders = () => api.get('/faculty/folders');

export const getFacultyStats = () => api.get('/faculty/stats');

export const createFolder = ({ department, semester, subjectName, facultyName, messageToStudents }) =>
  api.post('/faculty/folders', { department, semester, subjectName, facultyName, messageToStudents });

export const getFolderDetails = (id) => api.get(`/faculty/folders/${id}`);

export const deleteFolder = (id) => api.delete(`/faculty/folders/${id}`);

export const updateMessage = (id, messageToStudents) =>
  api.patch(`/faculty/folders/${id}/message`, { messageToStudents });

// ── Files ───────────────────────────────────────────────────────────────────

// pickedFiles: array of { uri, name, mimeType, size } from expo-document-picker
// subFolderId: optional — if provided, files upload into that sub-folder
export const uploadFiles = (folderId, pickedFiles, subFolderId, onUploadProgress) => {
  const form = new FormData();
  pickedFiles.forEach((file) => {
    form.append('files', {
      uri: file.uri,
      name: file.name,
      type: file.mimeType || 'application/octet-stream',
    });
  });
  if (subFolderId) form.append('subFolderId', subFolderId);

  return api.post(`/faculty/folders/${folderId}/files`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
  });
};

export const deleteFile = (folderId, fileId) =>
  api.delete(`/faculty/folders/${folderId}/files/${fileId}`);

export const getFacultyDownloadUrl = (folderId, fileId) =>
  `${api.defaults.baseURL}/faculty/folders/${folderId}/files/${fileId}/download`;

// ── Sub-folders ───────────────────────────────────────────────────────────

export const createSubFolder = (folderId, name) =>
  api.post(`/faculty/folders/${folderId}/subfolders`, { name });

export const deleteSubFolder = (folderId, sfId) =>
  api.delete(`/faculty/folders/${folderId}/subfolders/${sfId}`);

export const uploadFilesToSubFolder = (folderId, sfId, pickedFiles, onUploadProgress) => {
  const form = new FormData();
  pickedFiles.forEach((file) => {
    form.append('files', {
      uri: file.uri,
      name: file.name,
      type: file.mimeType || 'application/octet-stream',
    });
  });

  return api.post(`/faculty/folders/${folderId}/subfolders/${sfId}/files`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
  });
};

export const deleteSubFolderFile = (folderId, sfId, fileId) =>
  api.delete(`/faculty/folders/${folderId}/subfolders/${sfId}/files/${fileId}`);