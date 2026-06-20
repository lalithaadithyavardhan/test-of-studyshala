import api from './axios';

export const getFolders = () => api.get('/faculty/folders');
export const createFolder = (payload) => api.post('/faculty/folders', payload);
export const getFolderDetails = (id) => api.get(`/faculty/folders/${id}`);
export const deleteFolder = (id) => api.delete(`/faculty/folders/${id}`);

export const deleteFile = (folderId, fileId) => api.delete(`/faculty/folders/${folderId}/files/${fileId}`);

export const createSubFolder = (folderId, payload) => api.post(`/faculty/folders/${folderId}/subfolders`, payload);
export const deleteSubFolder = (folderId, sfId) => api.delete(`/faculty/folders/${folderId}/subfolders/${sfId}`);
export const deleteSubFolderFile = (folderId, sfId, fileId) =>
  api.delete(`/faculty/folders/${folderId}/subfolders/${sfId}/files/${fileId}`);

export const updateMessage = (folderId, message) => api.patch(`/faculty/folders/${folderId}/message`, { message });

// File upload from expo-document-picker result. `pickedFiles` is an array of
// { uri, name, mimeType } from DocumentPicker.getDocumentsAsync({ multiple: true }).
// subFolderId is optional — pass it to upload into a subfolder instead of root.
export const uploadFiles = (folderId, pickedFiles, subFolderId) => {
  const formData = new FormData();
  pickedFiles.forEach((file) => {
    formData.append('files', {
      uri: file.uri,
      name: file.name,
      type: file.mimeType || 'application/octet-stream',
    });
  });

  const url = subFolderId
    ? `/faculty/folders/${folderId}/subfolders/${subFolderId}/files`
    : `/faculty/folders/${folderId}/files`;

  return api.post(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
