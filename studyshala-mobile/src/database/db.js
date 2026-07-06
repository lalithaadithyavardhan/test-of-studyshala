/**
 * database/db.js
 * ==============
 * Lightweight local key-value store built on AsyncStorage.
 *
 * This is the `storage` object already imported by DashboardScreen.jsx,
 * HistoryScreen.jsx, App.js (via migrations), and now fileRepository.js /
 * the offline screens. It was referenced everywhere but never actually
 * existed in the project — this file fills that gap.
 *
 * Design notes:
 *  - Every value is stored as JSON internally. Callers pass/receive PLAIN
 *    OBJECTS, never pre-stringified JSON (see the NOTE comments already
 *    left in DashboardScreen.jsx / HistoryScreen.jsx about this).
 *  - getAllByPrefix() returns an array of the plain parsed values (NOT
 *    {key, value} pairs) — this matches how existing screens already
 *    consume it.
 *  - Keys are namespaced with a colon, e.g. `recent:<fileId>`,
 *    `history:<materialId>`, `file:<fileId>`, `saved:<materialId>`,
 *    `starred:<fileId>`.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const NS = '@studyshala:'; // global namespace so we never collide with other libs' AsyncStorage keys

const nsKey = (key) => `${NS}${key}`;
const stripNs = (key) => key.slice(NS.length);

export const storage = {
  async get(key) {
    try {
      const raw = await AsyncStorage.getItem(nsKey(key));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  async set(key, value) {
    try {
      await AsyncStorage.setItem(nsKey(key), JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },

  async delete(key) {
    try {
      await AsyncStorage.removeItem(nsKey(key));
      return true;
    } catch {
      return false;
    }
  },

  /** Returns an array of the plain parsed values whose key starts with `prefix`. */
  async getAllByPrefix(prefix) {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const matching = allKeys.filter((k) => k.startsWith(nsKey(prefix)));
      if (!matching.length) return [];
      const pairs = await AsyncStorage.multiGet(matching);
      return pairs
        .map(([, raw]) => {
          try {
            return raw ? JSON.parse(raw) : null;
          } catch {
            return null;
          }
        })
        .filter((v) => v !== null);
    } catch {
      return [];
    }
  },

  /** Same as getAllByPrefix but returns {key, value} pairs (key has the namespace/prefix stripped). */
  async getAllEntriesByPrefix(prefix) {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const matching = allKeys.filter((k) => k.startsWith(nsKey(prefix)));
      if (!matching.length) return [];
      const pairs = await AsyncStorage.multiGet(matching);
      return pairs
        .map(([k, raw]) => {
          try {
            return { key: stripNs(k), value: raw ? JSON.parse(raw) : null };
          } catch {
            return { key: stripNs(k), value: null };
          }
        })
        .filter((e) => e.value !== null);
    } catch {
      return [];
    }
  },

  async deleteAllByPrefix(prefix) {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const matching = allKeys.filter((k) => k.startsWith(nsKey(prefix)));
      if (matching.length) await AsyncStorage.multiRemove(matching);
      return true;
    } catch {
      return false;
    }
  },
};

export default storage;