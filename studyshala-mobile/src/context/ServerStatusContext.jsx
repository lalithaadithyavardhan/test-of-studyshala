/**
 * context/ServerStatusContext.jsx
 * =================================
 * Tracks whether the Render free-tier backend is awake, WITHOUT ever
 * blocking the UI. Nothing in this file disables navigation, screens,
 * or offline features — it only exposes a `status` string for
 * <ServerStatusBanner /> to render as a small, non-blocking indicator.
 *
 * States:
 *   'checking'  — first ping of this session still in flight (< ~4s)
 *   'waking'    — first ping(s) failed/timed out — backend is likely
 *                 cold-starting on Render's free tier — still retrying
 *   'online'    — a ping succeeded — banner hides itself
 *   'offline'   — every retry in the backoff schedule failed — most
 *                 likely no internet connection at all, not a cold
 *                 start. We stay quiet here on purpose: nagging the
 *                 user with "still connecting" forever when they're on
 *                 a plane is worse than just saying nothing, since all
 *                 downloaded/offline material already works regardless.
 *
 * Re-pings automatically when the app returns to the foreground, since
 * that's exactly when a Render instance is likely to have gone back to
 * sleep since the user last opened the app.
 */
import React, {
  createContext, useContext, useState, useRef, useCallback, useEffect,
} from 'react';
import { AppState } from 'react-native';
import { API_URL } from '../config/config';

const ServerStatusContext = createContext(null);

// Same shape as the retry schedule already used in DashboardScreen's
// stats loader, so cold-start behavior is consistent app-wide.
const RETRY_DELAYS_MS = [0, 3000, 5000, 8000, 13000, 20000, 30000];

// Cheap, already-existing endpoint — no new backend route needed.
const PING_PATH = '/stats';

export const ServerStatusProvider = ({ children }) => {
  const [status, setStatus] = useState('checking');
  const runIdRef = useRef(0);

  const ping = useCallback(async () => {
    const thisRun = ++runIdRef.current;
    setStatus('checking');

    for (let i = 0; i < RETRY_DELAYS_MS.length; i++) {
      if (thisRun !== runIdRef.current) return; // a newer ping superseded this one

      if (RETRY_DELAYS_MS[i] > 0) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[i]));
        if (thisRun !== runIdRef.current) return;
        setStatus('waking');
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(`${API_URL}${PING_PATH}`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          if (thisRun === runIdRef.current) setStatus('online');
          return;
        }
      } catch (e) {
        // Timed out or network error — keep retrying per the schedule above.
      }
    }

    if (thisRun === runIdRef.current) setStatus('offline');
  }, []);

  // Ping once on mount...
  useEffect(() => {
    ping();
  }, [ping]);

  // ...and again every time the app comes back to the foreground, since a
  // Render free-tier instance may have gone back to sleep in the meantime.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') ping();
    });
    return () => sub.remove();
  }, [ping]);

  return (
    <ServerStatusContext.Provider value={{ status, recheck: ping }}>
      {children}
    </ServerStatusContext.Provider>
  );
};

export const useServerStatus = () => {
  const ctx = useContext(ServerStatusContext);
  if (!ctx) throw new Error('useServerStatus must be used within a ServerStatusProvider');
  return ctx;
};