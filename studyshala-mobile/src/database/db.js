// db.js — AsyncStorage based storage (Expo Go compatible)
//
// STORAGE CONTRACT — read this before touching any caller of `storage`:
//   - get(key)                  -> returns the parsed value (object/array/etc) or null.
//   - set(key, value)           -> stores `value` as-is. NEVER JSON.stringify it
//                                   yourself before calling set() — set() already
//                                   does that internally. Double-stringifying was
//                                   the cause of "Recently viewed / Starred /
//                                   History show empty offline" bugs.
//   - getAllByPrefix(prefix)    -> returns an array of PLAIN PARSED VALUES,
//                                   e.g. [{fileId, name, ...}, ...]. It does NOT
//                                   return {key, value} pairs. Do not access
//                                   `.value` or `.key` on the returned entries —
//                                   the entry itself IS the stored object.
//   - deleteAllByPrefix(prefix) -> use this to clear a whole namespace instead of
//                                   looping over getAllByPrefix() results and
//                                   trying to delete by a non-existent `.key`.
import AsyncStorage from '@react-native-async-storage/async-storage';

export const storage = {
  async get(key) {
    try {
      const val = await AsyncStorage.getItem(key);
      return val ? JSON.parse(val) : null;
    } catch { return null; }
  },

  async set(key, value) {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (e) { console.warn('storage.set error:', e); }
  },

  async delete(key) {
    try { await AsyncStorage.removeItem(key); } catch {}
  },

  async getAllByPrefix(prefix) {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const matching = keys.filter(k => k.startsWith(prefix));
      if (!matching.length) return [];
      const pairs = await AsyncStorage.multiGet(matching);
      return pairs.map(([, val]) => val ? JSON.parse(val) : null).filter(Boolean);
    } catch { return []; }
  },

  async deleteAllByPrefix(prefix) {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const matching = keys.filter(k => k.startsWith(prefix));
      if (matching.length) await AsyncStorage.multiRemove(matching);
    } catch {}
  },

  // ── purgeCorruptedEntries ──────────────────────────────────────────────────
  // One-time cleanup for devices that had data written under the OLD buggy
  // format (where callers JSON.stringify()'d a value themselves before
  // passing it to storage.set(), which double-encodes it). After a single
  // JSON.parse, a double-encoded entry comes back as a STRING that still
  // contains JSON text, not the actual object — which silently breaks any
  // screen reading it (undefined fields, undefined React keys, blank rows).
  //
  // Run this once at app startup for any prefixes that were affected
  // ('recent:', 'starred:', 'history:'). Safe to call repeatedly — once
  // entries are clean it's a no-op.
  async purgeCorruptedEntries(prefixes = []) {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const targets = keys.filter(k => prefixes.some(p => k.startsWith(p)));
      if (!targets.length) return 0;

      const pairs = await AsyncStorage.multiGet(targets);
      const badKeys = [];
      for (const [key, raw] of pairs) {
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw);
          // A correctly-stored entry parses to an object/array. If it parses
          // to a string (or any non-object), that string is still JSON text
          // from a double-encode — it's corrupted leftover data.
          if (typeof parsed !== 'object' || parsed === null) {
            badKeys.push(key);
          }
        } catch {
          // Doesn't even parse once — definitely junk.
          badKeys.push(key);
        }
      }

      if (badKeys.length) await AsyncStorage.multiRemove(badKeys);
      return badKeys.length;
    } catch {
      return 0;
    }
  },
};

export default storage;