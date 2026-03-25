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
        }).catch((err) => {
          // If backend wakes up and says "Unauthorized" (401), the token is dead. Kick them out.
          if (err.response && err.response.status === 401) {
             localStorage.removeItem('token');
             localStorage.removeItem('user');
             setUser(null);
          }
          // Otherwise (network timeout, 500 error), it's a cold start — keep the UI alive from localStorage.
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
    localStorage.setItem('lastRole', userData.role);
    localStorage.setItem('lastUser', JSON.stringify({
      name:  userData.name,
      role:  userData.role,
      email: userData.email,  
    }));
    setUser(userData);
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
    try { await api.post('/auth/tour-reset'); } catch (_) {}
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
      console.error("Logout error:", error);
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
