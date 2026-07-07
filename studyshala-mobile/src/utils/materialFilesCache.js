/**
 * utils/materialFilesCache.js
 * ==============================
 * Single source of truth for caching a material's file/folder listing
 * locally (key: `materialFiles:<materialId>`). Used by MaterialAccessScreen
 * (so a material stays browsable offline) and by materialSync.js (so
 * auto-download knows which files exist without needing a fresh network
 * call every time).
 */
import { storage } from '../database/db';

const key = (materialId) => `materialFiles:${materialId}`;

export const getCachedMaterialFiles = (materialId) => storage.get(key(materialId));

export const setCachedMaterialFiles = (materialId, listing) => storage.set(key(materialId), listing);

/** Flattens { files, subFolders } into a single array of file objects. */
export const flattenMaterialFiles = (listing) => {
  if (!listing) return [];
  const nested = (listing.subFolders || []).flatMap((f) => f.files || []);
  return [...(listing.files || []), ...nested];
};