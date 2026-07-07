/**
 * utils/materialSync.js
 * ========================
 * Auto-downloads every file in a material for offline access, the moment
 * it's saved (or re-checked). Runs on ANY connection — Wi-Fi or mobile
 * data — per product decision (no data-usage gate for now).
 *
 * Safe to call repeatedly: files already saved are skipped, so this can
 * be re-run every time Saved Materials is opened to pick up anything that
 * was interrupted (app closed mid-download, connection dropped, etc.)
 * without re-downloading what's already there.
 */
import { getMaterialFiles } from '../api/studentApi';
import { saveFileOffline, isAvailableOffline } from './fileRepository';
import { getCachedMaterialFiles, setCachedMaterialFiles, flattenMaterialFiles } from './materialFilesCache';

/**
 * onProgress(done, total) is optional and called after each file finishes
 * (whether it succeeded or failed) — use it to drive a progress indicator.
 */
export const syncMaterialOffline = async (material, onProgress) => {
  if (!material?._id) return { success: false };

  try {
    const { data } = await getMaterialFiles(material._id);
    const files = data.files || [];
    const subFolders = data.subFolders || [];
    await setCachedMaterialFiles(material._id, { files, subFolders });

    const allFiles = flattenMaterialFiles({ files, subFolders });
    let done = 0;
    for (const file of allFiles) {
      const already = await isAvailableOffline(file._id);
      if (!already) {
        try {
          await saveFileOffline(file, material);
        } catch {
          // Keep going — one bad file shouldn't block the rest of the material.
        }
      }
      done += 1;
      onProgress?.(done, allFiles.length);
    }

    return { success: true, total: allFiles.length };
  } catch (e) {
    // No internet, or the server call failed — nothing to do right now.
    // The material will simply be retried next time syncMaterialOffline runs.
    return { success: false, error: e };
  }
};

/** Cheap check (no network call) — is every file we know about already saved? */
export const isMaterialFullyOffline = async (materialId) => {
  const cached = await getCachedMaterialFiles(materialId);
  const files = flattenMaterialFiles(cached);
  if (!files.length) return false;
  for (const f of files) {
    if (!(await isAvailableOffline(f._id))) return false;
  }
  return true;
};

export default { syncMaterialOffline, isMaterialFullyOffline };