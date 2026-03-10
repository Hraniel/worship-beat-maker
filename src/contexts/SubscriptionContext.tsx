import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { getTierByProductId, TIERS, type TierKey } from '@/lib/tiers';
import { useNewUserUnlock } from '@/hooks/useNewUserUnlock';

interface SubscriptionContextType {
  tier: TierKey;
  loading: boolean;
  error: boolean;
  subscriptionEnd: string | null;
  checkSubscription: () => Promise<void>;
  tierConfig: typeof TIERS[TierKey];
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session } = useAuth();
  const [tier, setTierState] = useState<TierKey>(() => {
    try { return (localStorage.getItem('app_cached_tier') as TierKey) || 'free'; } catch { return 'free'; }
  });
  const setTier = useCallback((t: TierKey) => {
    setTierState(t);
    try { localStorage.setItem('app_cached_tier', t); } catch {}
  }, []);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkSubscription = useCallback(async () => {
    if (!session) {
      setTier('free');
      setSubscriptionEnd(null);
      setLoading(false);
      setError(false);
      return;
    }

    // If offline, skip network call and use cached tier
    if (!navigator.onLine) {
      setLoading(false);
      return;
    }

    setError(false);
    const maxRetries = 2;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const { data, error: fnError } = await supabase.functions.invoke('check-subscription');
        if (fnError) throw fnError;
        const result = data as { subscribed: boolean; product_id: string | null; subscription_end: string | null };
        
        if (result && 'error' in result) {
          throw new Error(String((result as any).error));
        }
        
        setTier(getTierByProductId(result.product_id));
        setSubscriptionEnd(result.subscription_end);
        setLoading(false);
        setError(false);
        return;
      } catch (e) {
        console.warn(`Subscription check attempt ${attempt + 1} failed:`, e);
        if (attempt === maxRetries) {
          setError(true);
          if (tier === 'free') {
            setTier('free');
          }
        } else {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
    }
    setLoading(false);
  }, [session, tier]);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Auto-refresh every 60s
  useEffect(() => {
    if (!session) return;
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [session, checkSubscription]);

  const { isUnlocked: isNewUserUnlocked } = useNewUserUnlock();

  // When new user unlock is active, elevate tierConfig to master-level limits
  const effectiveTierConfig = useMemo(() => {
    if (isNewUserUnlocked) return TIERS.master;
    return TIERS[tier];
  }, [tier, isNewUserUnlocked]);

  return (
    <SubscriptionContext.Provider value={{
      tier,
      loading,
      error,
      subscriptionEnd,
      checkSubscription,
      tierConfig: effectiveTierConfig,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) throw new Error('useSubscription must be used within SubscriptionProvider');
  return context;
};
