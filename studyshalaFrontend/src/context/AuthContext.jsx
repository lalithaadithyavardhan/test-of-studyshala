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
    const token      = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);

        // Silently refresh from DB to get latest tourCompleted and role.
        // If backend is sleeping (Render cold start), this fails quietly
        // and the user stays logged in from localStorage.
        api.get('/auth/user').then(res => {
          if (res.data?.user) {
            const fresh = {
              id:                  res.data.user._id,
              name:                res.data.user.name,
              email:               res.data.user.email,
              role:                res.data.user.role,
              department:          res.data.user.department,
              profilePicture:      res.data.user.profilePicture,
              tourCompleted:       res.data.user.tourCompleted       || false,
              phase2TourCompleted: res.data.user.phase2TourCompleted || false,
            };
            setUser(fresh);
            // Save fresh data back to localStorage so next load is accurate
            try { localStorage.setItem('user', JSON.stringify(fresh)); } catch {}
          }
        }).catch(() => {
          // Backend sleeping or network error — keep user from localStorage
        });

      } catch (error) {
        console.error('Failed to parse stored user:', error);
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
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, tourCompleted: true };
      // Persist to localStorage so it survives page refresh
      try { localStorage.setItem('user', JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  // Phase 2 tour (after first material created)
  const completePhase2Tour = async () => {
    try { await api.post('/auth/phase2-tour-complete'); } catch (_) {}
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, phase2TourCompleted: true };
      try { localStorage.setItem('user', JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  const resetPhase2Tour = async () => {
    try { await api.post('/auth/phase2-tour-reset'); } catch (_) {}
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, phase2TourCompleted: false };
      try { localStorage.setItem('user', JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  // Called when user clicks "Replay tour" — resets on DB
  const resetTour = async () => {
    try {
      await api.post('/auth/tour-reset');
    } catch (_) {}
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, tourCompleted: false };
      // Persist to localStorage
      try { localStorage.setItem('user', JSON.stringify(updated)); } catch {}
      return updated;
    });
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
    isAuthenticated:  !!user,
    completeTour,
    resetTour,
    completePhase2Tour,
    resetPhase2Tour,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
