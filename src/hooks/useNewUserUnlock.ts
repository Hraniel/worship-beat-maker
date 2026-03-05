import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAppConfig } from '@/hooks/useAppConfig';

export function useNewUserUnlock() {
  const { user } = useAuth();
  const { isEnabled } = useAppConfig();

  const [remainingMs, setRemainingMs] = useState<number>(0);

  const calcRemaining = useCallback(() => {
    if (!user?.created_at) return 0;
    if (!isEnabled('app_new_user_unlock_all')) return 0;
    const createdAt = new Date(user.created_at).getTime();
    const expiresAt = createdAt + 24 * 60 * 60 * 1000;
    return Math.max(0, expiresAt - Date.now());
  }, [user, isEnabled]);

  useEffect(() => {
    const ms = calcRemaining();
    setRemainingMs(ms);
    if (ms <= 0) return;

    const interval = setInterval(() => {
      const r = calcRemaining();
      setRemainingMs(r);
      if (r <= 0) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [calcRemaining]);

  const isUnlocked = remainingMs > 0;

  return { isUnlocked, remainingMs };
}

export function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
