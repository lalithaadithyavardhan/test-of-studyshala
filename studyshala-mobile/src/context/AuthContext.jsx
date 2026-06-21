/**
 * context/AuthContext.jsx
 * ========================
 * Mirrors studyshalaFrontend's src/context/AuthContext.jsx, adapted for
 * React Native (SecureStore instead of localStorage).
 *
 * Matches the exact shape returned by your real backend's
 * authController.js googleCallback():
 *   {
 *     id, name, email, role, department, profilePicture,
 *     tourCompleted, phase2TourCompleted
 *   }
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../config/config';
import { setForceLogoutHandler } from '../api/client';
import { logoutRequest } from '../api/authApi';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on app start
  useEffect(() => {
    (async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          SecureStore.getItemAsync(STORAGE_KEYS.TOKEN),
          SecureStore.getItemAsync(STORAGE_KEYS.USER),
        ]);
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (e) {
        console.warn('Failed to restore session', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Force-logout hook wired to the axios response interceptor —
  // fires only on confirmed bad/expired tokens (see api/client.js)
  useEffect(() => {
    setForceLogoutHandler(() => {
      setUser(null);
      setToken(null);
    });
  }, []);

  // login(userData, jwtToken) — same signature/order as the website's
  // AuthContext so logic transfers directly if you ever share code.
  const login = useCallback(async (userData, jwtToken) => {
    await SecureStore.setItemAsync(STORAGE_KEYS.TOKEN, jwtToken);
    await SecureStore.setItemAsync(STORAGE_KEYS.USER, JSON.stringify(userData));
    setToken(jwtToken);
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    try {
      // Best-effort — backend destroys the passport session server-side.
      // Don't block local logout if this fails (e.g. offline).
      await logoutRequest();
    } catch (e) {
      // Swallow — local cleanup proceeds regardless.
    }
    await SecureStore.deleteItemAsync(STORAGE_KEYS.TOKEN);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.USER);
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback(async (partialUser) => {
    setUser((prev) => {
      const next = { ...prev, ...partialUser };
      SecureStore.setItemAsync(STORAGE_KEYS.USER, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
