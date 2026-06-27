import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

// Read user synchronously from localStorage before first render.
// This means `loading` starts as false and `user` is already set
// if there is a valid session — no flicker, no redirect to /login.
const getStoredUser = () => {
  try {
    const token = localStorage.getItem('token');
    const stored = localStorage.getItem('user');
    if (token && stored) return JSON.parse(stored);
  } catch {}
  return null;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(getStoredUser);   // sync read — no loading flash
  const [loading, setLoading] = useState(false);           // starts false — already have answer

  useEffect(() => {
    const storedUser = getStoredUser();
    if (!storedUser) return; // not logged in, nothing to refresh

    // Background refresh — get latest role/department/tour data from DB.
    // UI is already unblocked. If backend is cold-starting on Render free tier
    // this may take 30-60s — that's fine, user is already on their dashboard.
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
        try { localStorage.setItem('user', JSON.stringify(fresh)); } catch {}
      }
    }).catch(() => {
      // Backend sleeping or network error — keep the localStorage version.
      // Real bad-token 401s are handled by the axios interceptor.
    });
  }, []);

  const login = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('lastRole', userData.role);
    localStorage.setItem('lastUser', JSON.stringify({
      name:  userData.name,
      role:  userData.role,
      email: userData.email,
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
      setUser(null);
    }
  };

  const completeTour = async () => {
    try { await api.post('/auth/tour-complete'); } catch (_) {}
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, tourCompleted: true };
      try { localStorage.setItem('user', JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  const resetTour = async () => {
    try { await api.post('/auth/tour-reset'); } catch (_) {}
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, tourCompleted: false };
      try { localStorage.setItem('user', JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

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
