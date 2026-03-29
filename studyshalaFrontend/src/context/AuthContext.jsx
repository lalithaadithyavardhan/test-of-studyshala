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

        // Silently refresh from DB to get latest data.
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
            // Save fresh data back so next load is accurate
            try { localStorage.setItem('user', JSON.stringify(fresh)); } catch {}
          }
        }).catch(() => {
          // Backend sleeping or network error — keep user from localStorage.
          // Do NOT log out the user here. They will stay logged in.
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
   * login(userData, token)
   * Called by AuthCallback after a successful Google OAuth redirect.
   * Saves token + user to localStorage and updates React state.
   * Also saves lastUser so the Login page can show a quick-return banner
   * and pass login_hint to Google — so returning users skip the account picker.
   */
  const login = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));

    // ✅ lastUser is kept FOREVER (even after logout) so the quick-return
    // banner always shows and Google login_hint always pre-selects the account.
    // The user can clear it manually by clicking "Switch account".
    localStorage.setItem('lastRole', userData.role);
    localStorage.setItem('lastUser', JSON.stringify({
      name:  userData.name,
      role:  userData.role,
      email: userData.email,
    }));
    setUser(userData);
  };

  // Called when user finishes or skips the tour — saves to DB
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
      try { localStorage.setItem('user', JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  /**
   * logout()
   * Clears the active session token but intentionally KEEPS lastUser in
   * localStorage. This means:
   *   - The quick-return banner still shows on the Login page after logout
   *   - Google login_hint still pre-selects the correct account
   *   - The user never has to pick an account from a list again
   * To fully switch accounts, the user clicks "Switch account" on Login page.
   */
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // ✅ DO NOT remove lastUser or lastRole here — keep them so the
      // returning-user experience works perfectly on next visit.
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
