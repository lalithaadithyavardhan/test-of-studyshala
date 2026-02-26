import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize authentication state from localStorage on app load
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      try {
        // Guard: JSON.parse("undefined") throws a SyntaxError and crashes the
        // context. Explicitly reject the literal string "undefined" / "null"
        // before attempting to parse.
        if (storedUser === 'undefined' || storedUser === 'null') {
          throw new Error('Stored user value is not valid JSON');
        }
        const parsed = JSON.parse(storedUser);
        // Additional guard: parsed value must be a non-null object
        if (parsed && typeof parsed === 'object') {
          setUser(parsed);
        } else {
          throw new Error('Parsed user is not a valid object');
        }
      } catch (error) {
        console.error('Failed to restore session from localStorage:', error);
        // Clean up corrupt storage so the user gets a fresh login screen
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  /**
   * Login — called from AuthCallback with (userData, token).
   * Guards against undefined/null userData so we never persist bad values
   * that would later crash JSON.parse on page reload.
   */
  const login = (userData, token) => {
    if (!userData || typeof userData !== 'object') {
      console.error('login() received invalid userData:', userData);
      return;
    }
    if (!token || typeof token !== 'string') {
      console.error('login() received invalid token:', token);
      return;
    }
    localStorage.setItem('token', token);
    // Safe to stringify now — userData is a validated, non-null object
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  /**
   * Logout — clears session locally and optionally notifies the backend.
   *
   * Race-condition fix: The backend /auth/logout endpoint no longer requires
   * a strictly valid token (it just returns 200), AND the Axios interceptor
   * is configured to skip the 401-redirect logic for the logout URL.
   * This means even if the token is already expired, the finally block below
   * will always execute and cleanly clear local state.
   */
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Log but do not re-throw — we always want to clear local state
      // regardless of whether the backend call succeeds.
      console.error('Logout backend notification failed:', error?.response?.data || error.message);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    }
  };

  /**
   * Update the in-memory (and persisted) user object — useful after profile
   * edits or role changes without requiring a full re-login.
   */
  const updateUser = (updatedData) => {
    if (!updatedData || typeof updatedData !== 'object') return;
    const merged = { ...user, ...updatedData };
    localStorage.setItem('user', JSON.stringify(merged));
    setUser(merged);
  };

  const value = {
    user,
    login,
    logout,
    updateUser,
    loading,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
