// db.js — AsyncStorage based storage (Expo Go compatible)
// Drop-in replacement for SQLite version
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
};

export default storage;
