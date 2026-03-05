import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const NEW_USER_UNLOCK_KEY = 'app_new_user_unlock_all';
const UNLOCK_CACHE_KEY = 'app_new_user_unlock_cached';
const DAY_MS = 24 * 60 * 60 * 1000;

export function useNewUserUnlock() {
  const { user } = useAuth();

  const [unlockEnabled, setUnlockEnabled] = useState(() => {
    try { return localStorage.getItem(UNLOCK_CACHE_KEY) === 'true'; } catch { return false; }
  });
  const [remainingMs, setRemainingMs] = useState<number>(0);

  const shouldSyncConfig = useMemo(() => {
    if (!user?.created_at) return false;
    const createdAt = new Date(user.created_at).getTime();
    return Date.now() - createdAt < DAY_MS;
  }, [user?.created_at]);

  const refreshUnlockFlag = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('landing_config')
        .select('config_value')
        .eq('config_key', NEW_USER_UNLOCK_KEY)
        .maybeSingle();

      if (error) {
        console.warn('[NEW-USER-UNLOCK] failed to refresh config (using cached)', error);
        return; // keep cached value
      }

      const enabled = data?.config_value === 'true';
      setUnlockEnabled(enabled);
      try { localStorage.setItem(UNLOCK_CACHE_KEY, String(enabled)); } catch {}
    } catch {
      // Offline — keep cached value
      console.warn('[NEW-USER-UNLOCK] offline, using cached value');
    }
  }, []);

  const calcRemaining = useCallback(() => {
    if (!user?.created_at) return 0;
    if (!unlockEnabled) return 0;
    const createdAt = new Date(user.created_at).getTime();
    const expiresAt = createdAt + DAY_MS;
    return Math.max(0, expiresAt - Date.now());
  }, [user?.created_at, unlockEnabled]);

  useEffect(() => {
    const ms = calcRemaining();
    setRemainingMs(ms);
    if (ms <= 0) return;

    const interval = setInterval(() => {
      const nextRemaining = calcRemaining();
      setRemainingMs(nextRemaining);
      if (nextRemaining <= 0) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [calcRemaining]);

  useEffect(() => {
    if (!user) {
      setUnlockEnabled(false);
      return;
    }

    refreshUnlockFlag();

    if (!shouldSyncConfig) return;

    const channel = supabase
      .channel('new_user_unlock_config_realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'landing_config',
        filter: `config_key=eq.${NEW_USER_UNLOCK_KEY}`,
      }, () => {
        refreshUnlockFlag();
      })
      .subscribe();

    // Fallback: garante revogação mesmo se realtime falhar em algum cliente
    const pollInterval = setInterval(() => {
      refreshUnlockFlag();
    }, 5000);

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [user, shouldSyncConfig, refreshUnlockFlag]);

  const isUnlocked = unlockEnabled && remainingMs > 0;

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

