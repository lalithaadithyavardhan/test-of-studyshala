/**
 * context/AuthContext.jsx
 * ========================
 * Adds two things on top of the original:
 *   1. lastRole persistence (SecureStore) — mirrors the website's
 *      localStorage 'lastRole' pattern so returning users skip role
 *      selection on LoginScreen.
 *   2. switchRole() — re-runs Google Sign-In silently against the SAME
 *      Google account already cached by @react-native-google-signin,
 *      then calls POST /api/auth/google/mobile with the new role. This
 *      is the agreed "Option A" approach: the backend only stores one
 *      role per account, so switching re-authenticates with that role
 *      instead of requiring a separate identity.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { STORAGE_KEYS, API_BASE_URL } from '../config/config';
import { setForceLogoutHandler } from '../api/client';
import { logoutRequest } from '../api/authApi';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRole, setLastRole] = useState(null);
  const [switchingRole, setSwitchingRole] = useState(false);

  // Restore session on app start
  useEffect(() => {
    (async () => {
      try {
        const [storedToken, storedUser, storedRole] = await Promise.all([
          SecureStore.getItemAsync(STORAGE_KEYS.TOKEN),
          SecureStore.getItemAsync(STORAGE_KEYS.USER),
          SecureStore.getItemAsync(STORAGE_KEYS.LAST_ROLE),
        ]);
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
        if (storedRole) setLastRole(storedRole);
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

  // login(userData, jwtToken) — called after either native Google Sign-In
  // (LoginScreen) or a role switch (switchRole below).
  const login = useCallback(async (userData, jwtToken) => {
    await SecureStore.setItemAsync(STORAGE_KEYS.TOKEN, jwtToken);
    await SecureStore.setItemAsync(STORAGE_KEYS.USER, JSON.stringify(userData));
    await SecureStore.setItemAsync(STORAGE_KEYS.LAST_ROLE, userData.role);
    setToken(jwtToken);
    setUser(userData);
    setLastRole(userData.role);
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } catch (e) {
      // Swallow — local cleanup proceeds regardless.
    }
    try {
      await GoogleSignin.signOut();
    } catch (e) {
      // Not signed in via native Google Sign-In, or already signed out — fine.
    }
    await SecureStore.deleteItemAsync(STORAGE_KEYS.TOKEN);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.USER);
    // Deliberately KEEP last_role — so the login screen still pre-selects it
    // next time, matching the website's "remember last role" behavior.
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
  
  const completeProfile = useCallback(async (department, semester) => {
    updateUser({
     department,
     semester,
     profileCompleted: true,
    });
  }, [updateUser]);





  // switchRole('faculty' | 'student') — Option A: re-authenticate the SAME
  // Google account against the mobile login endpoint with a different role.
  // No visible login screen — GoogleSignin.signInSilently() reuses the
  // already-granted Google session, so from the user's perspective it just
  // looks like the app switched views.
  const switchRole = useCallback(async (newRole) => {
    setSwitchingRole(true);
    try {
      let idToken;
      try {
        const silent = await GoogleSignin.signInSilently();
        idToken = silent?.data?.idToken ?? silent?.idToken;
      } catch (silentErr) {
        // No cached Google session (e.g. app was reinstalled) — fall back
        // to an interactive sign-in so the switch still works.
        await GoogleSignin.hasPlayServices();
        const interactive = await GoogleSignin.signIn();
        idToken = interactive?.data?.idToken ?? interactive?.idToken;
      }

      if (!idToken) {
        throw new Error('Could not get a Google session for role switch.');
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/google/mobile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, role: newRole }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || `Server error (${response.status})`);
      }
      await login(data.user, data.token);
      return { success: true, user: data.user };
    } catch (error) {
      return { success: false, error: error.message || 'Failed to switch role' };
    } finally {
      setSwitchingRole(false);
    }
  }, [login]);

  const value = {
   user,
   token,
   loading,
   lastRole,
   switchingRole,
   isAuthenticated: !!token && !!user,
   login,
   logout,
   updateUser,
   completeProfile,
   switchRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
