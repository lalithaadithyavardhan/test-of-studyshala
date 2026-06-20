import api from './axios';

// NOTE: the web app's BrowseMaterials page is reachable by all roles
// (student/faculty/admin), but the only browse controller found in the
// backend folder structure lives under adminRoutes.js (`/admin/browse`,
// `/admin/browse/:id`). If your web frontend actually calls a different
// endpoint for non-admin roles, update these two calls to match —
// check studyshalaFrontend/src/pages/BrowseMaterials.jsx for the exact
// endpoint it calls.
export const browseFolders = () => api.get('/admin/browse');
export const browseFolderDetails = (id) => api.get(`/admin/browse/${id}`);
