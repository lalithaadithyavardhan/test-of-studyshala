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
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Failed to parse stored user:", error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  /**
   * Updated login function
   * Matches the parameter order used in AuthCallback: login(userData, token)
   */
  const login = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    // Remember who last logged in so Login page can show quick-return banner
    localStorage.setItem('lastRole', userData.role);
    localStorage.setItem('lastUser', JSON.stringify({
      name: userData.name,
      role: userData.role,
    }));
    setUser(userData);
  };

  /**
   * Logout function
   * Clears session and notifies the backend if necessary
   */
  // Called when user finishes or skips the tour — saves to DB
  const completeTour = async () => {
    try {
      await api.post('/auth/tour-complete');
    } catch (_) {}
    setUser(prev => prev ? { ...prev, tourCompleted: true } : prev);
  };

  // Called when user clicks "Replay tour" — resets on DB
  const resetTour = async () => {
    try {
      await api.post('/auth/tour-reset');
    } catch (_) {}
    setUser(prev => prev ? { ...prev, tourCompleted: false } : prev);
  };

  const logout = async () => {
    try {
      // Optional: Notify backend of logout
      await api.post('/auth/logout');
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Keep lastUser + lastRole so quick-return banner shows on next visit
      // User can clear it manually with "Switch account" button
      setUser(null);
    }
  };

  const value = {
    user,
    login,
    logout,
    loading,
    isAuthenticated: !!user,
    completeTour,
    resetTour,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
