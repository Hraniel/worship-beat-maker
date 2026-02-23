import { useState, useEffect, useCallback } from 'react';

const LAST_ACTIVE_KEY = 'app_last_active_ts';
const AWAY_THRESHOLD_MS = 120 * 60 * 1000; // 120 minutes

/**
 * Returns `showLoading` = true whenever the user returns to the app
 * after being away for more than 2 minutes. Call `dismiss()` to hide it.
 */
export function useAppReloadGuard() {
  const [showLoading, setShowLoading] = useState(false);

  const dismiss = useCallback(() => {
    setShowLoading(false);
    // Record current time as last active
    localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
  }, []);

  useEffect(() => {
    // On first mount, check if user was away long enough
    const lastActive = parseInt(localStorage.getItem(LAST_ACTIVE_KEY) ?? '0', 10);
    const elapsed = Date.now() - lastActive;

    if (lastActive > 0 && elapsed >= AWAY_THRESHOLD_MS) {
      if (navigator.onLine) {
        setShowLoading(true);
      }
    } else {
      // Record first visit
      localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
    }

    // Track visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // User left → save timestamp
        localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
      } else if (document.visibilityState === 'visible') {
        // User returned → check elapsed time
        const stored = parseInt(localStorage.getItem(LAST_ACTIVE_KEY) ?? '0', 10);
        const away = Date.now() - stored;
        if (stored > 0 && away >= AWAY_THRESHOLD_MS) {
          if (navigator.onLine) {
            setShowLoading(true);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Keep last_active fresh while the user is active
  useEffect(() => {
    if (showLoading) return;
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
      }
    }, 30_000); // update every 30s
    return () => clearInterval(interval);
  }, [showLoading]);

  return { showLoading, dismiss };
}
