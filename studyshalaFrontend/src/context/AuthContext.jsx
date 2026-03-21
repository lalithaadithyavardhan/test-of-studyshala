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
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from localStorage on app load.
  // FIX: We read the token + user from localStorage immediately so the user
  // is treated as logged in right away — before any backend call completes.
  // This prevents the Render cold-start problem where the sleeping backend
  // takes 30-60s to wake up, causing the app to kick the user to /login.
  useEffect(() => {
    const token      = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        // Set user from localStorage immediately — no backend call needed
        setUser(parsed);
        // Then silently verify with backend in the background.
        // If token is truly invalid the backend returns 401 with a clear message
        // and the axios interceptor will clear it. If backend is just sleeping,
        // the request will fail silently and the user stays logged in.
        api.get('/auth/user').then(res => {
          if (res.data?.user) {
            // Refresh user data with latest from DB (role may have changed)
            setUser({
              id:             res.data.user._id,
              name:           res.data.user.name,
              email:          res.data.user.email,
              role:           res.data.user.role,
              department:     res.data.user.department,
              profilePicture: res.data.user.profilePicture,
            });
          }
        }).catch(() => {
          // Backend sleeping or network error — keep user logged in from localStorage
          // The axios interceptor handles real 401s (invalid/expired token)
        });
      } catch (error) {
        console.error('Failed to parse stored user:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }

    setLoading(false);
  }, []);

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

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Keep lastUser + lastRole so quick-return banner shows on next visit
      setUser(null);
    }
  };

  const value = {
    user,
    login,
    logout,
    loading,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
