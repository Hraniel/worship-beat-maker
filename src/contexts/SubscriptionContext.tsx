import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { getTierByProductId, TIERS, type TierKey } from '@/lib/tiers';

interface SubscriptionContextType {
  tier: TierKey;
  loading: boolean;
  subscriptionEnd: string | null;
  checkSubscription: () => Promise<void>;
  tierConfig: typeof TIERS[TierKey];
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session } = useAuth();
  const [tier, setTier] = useState<TierKey>('free');
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const checkSubscription = useCallback(async () => {
    if (!session) {
      setTier('free');
      setSubscriptionEnd(null);
      setLoading(false);
      return;
    }

    const maxRetries = 2;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const { data, error } = await supabase.functions.invoke('check-subscription');
        if (error) throw error;
        const result = data as { subscribed: boolean; product_id: string | null; subscription_end: string | null };
        
        // If we got an error field in the response, retry
        if (result && 'error' in result) {
          throw new Error(String((result as any).error));
        }
        
        setTier(getTierByProductId(result.product_id));
        setSubscriptionEnd(result.subscription_end);
        setLoading(false);
        return; // Success, exit retry loop
      } catch (e) {
        console.warn(`Subscription check attempt ${attempt + 1} failed:`, e);
        if (attempt === maxRetries) {
          // Only fallback to free on final failure - keep current tier if already set
          if (tier === 'free') {
            setTier('free');
          }
          // Don't reset to free if user previously had a valid subscription
        } else {
          // Wait before retry
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

  return (
    <SubscriptionContext.Provider value={{
      tier,
      loading,
      subscriptionEnd,
      checkSubscription,
      tierConfig: TIERS[tier],
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
