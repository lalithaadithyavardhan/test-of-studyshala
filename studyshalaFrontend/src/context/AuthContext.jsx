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

  useEffect(() => {
    const token      = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      try {
        const parsed = JSON.parse(storedUser);

        // Trust localStorage immediately — user sees dashboard right away
        // without waiting for the backend (which may be sleeping on Render free tier).
        setUser(parsed);
        setLoading(false);

        // Silently refresh from DB in background to get fresh role/department/tour data.
        // If backend is cold-starting this will take time — that's fine, UI is already unblocked.
        // Real bad-token 401s are caught by the axios interceptor which clears localStorage.
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
          // Backend sleeping or network error — keep user from localStorage.
        });

      } catch (error) {
        // Corrupted localStorage — clear and show login
        console.error('Failed to parse stored user:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
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

  const completeTour = async () => {
    try {
      await api.post('/auth/tour-complete');
    } catch (_) {}
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, tourCompleted: true };
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

  const resetTour = async () => {
    try {
      await api.post('/auth/tour-reset');
    } catch (_) {}
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, tourCompleted: false };
      try { localStorage.setItem('user', JSON.stringify(updated)); } catch {}
      return updated;
    });
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
