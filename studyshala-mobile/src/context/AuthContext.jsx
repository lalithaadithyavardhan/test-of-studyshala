import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import api, { setAuthErrorHandler, TOKEN_KEY } from '../api/axios';
import { getCurrentUser as fetchCurrentUser, googleMobileLogin, logout as logoutApi } from '../api/auth';
import { GOOGLE_WEB_CLIENT_ID } from '../constants/config';

const USER_KEY = 'studyshala_user';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID, // server (web) client ID — required so the backend can verify the idToken
  offlineAccess: false,
  scopes: ['profile', 'email'],
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  // Unlike the web app, we start `loading: true` here — SecureStore reads are
  // async (unlike localStorage), so we can't read synchronously before first render.
  const [loading, setLoading] = useState(true);

  // Force-logout used by the axios interceptor when a token is confirmed bad.
  const hardLogout = useCallback(async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    setUser(null);
  }, []);

  useEffect(() => {
    setAuthErrorHandler(hardLogout);
  }, [hardLogout]);

  // On app launch: read stored token/user, show the app immediately if present,
  // then silently refresh from the backend in the background — same pattern
  // as the web app's AuthContext.
  useEffect(() => {
    (async () => {
      try {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        const storedUser = await SecureStore.getItemAsync(USER_KEY);

        if (token && storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (e) {
        // Corrupt storage — treat as logged out
      } finally {
        setLoading(false);
      }

      // Background refresh — get latest role/department/tour data from DB.
      // If backend is cold-starting on Render free tier this may take 30-60s —
      // that's fine, the user is already on their dashboard from stored data.
      try {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        if (!token) return;

        const res = await fetchCurrentUser();
        if (res.data?.user) {
          const fresh = mapUser(res.data.user);
          setUser(fresh);
          await SecureStore.setItemAsync(USER_KEY, JSON.stringify(fresh));
        }
      } catch (e) {
        // Backend sleeping or network error — keep the stored version.
        // Real bad-token 401s are handled by the axios interceptor.
      }
    })();
  }, []);

  // Native Google Sign-In -> exchange ID token with backend -> store JWT
  const login = async (role) => {
    await GoogleSignin.hasPlayServices();
    const signInResult = await GoogleSignin.signIn();
    const idToken = signInResult?.data?.idToken || signInResult?.idToken;

    if (!idToken) {
      throw new Error('Google sign-in did not return an ID token');
    }

    const res = await googleMobileLogin(idToken, role);
    const { token, user: userData } = res.data;

    const mapped = mapUser(userData);

    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(mapped));
    setUser(mapped);

    return mapped;
  };

  const logout = async () => {
    try {
      await logoutApi();
    } catch (error) {
      // Backend logout is best-effort — token is invalidated client-side regardless
    } finally {
      try {
        await GoogleSignin.signOut();
      } catch (_) {}
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
      setUser(null);
    }
  };

  const updateStoredUser = async (patch) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...patch };
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  };

  const value = {
    user,
    login,
    logout,
    loading,
    isAuthenticated: !!user,
    updateStoredUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

function mapUser(u) {
  return {
    id: u._id || u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    department: u.department,
    profilePicture: u.profilePicture,
    tourCompleted: u.tourCompleted || false,
    phase2TourCompleted: u.phase2TourCompleted || false,
  };
}
