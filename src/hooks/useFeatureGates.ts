import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/contexts/SubscriptionContext';

export interface FeatureGate {
  id: string;
  gate_key: string;
  gate_label: string;
  required_tier: string;
  description: string | null;
}

const TIER_ORDER = ['free', 'pro', 'master'] as const;

function tierIndex(tier: string): number {
  const idx = TIER_ORDER.indexOf(tier as typeof TIER_ORDER[number]);
  return idx === -1 ? 0 : idx;
}

let cachedGates: FeatureGate[] | null = null;
let cachePromise: Promise<FeatureGate[]> | null = null;

async function fetchGates(): Promise<FeatureGate[]> {
  if (cachedGates) return cachedGates;
  if (cachePromise) return cachePromise;
  cachePromise = supabase
    .from('feature_gates')
    .select('*')
    .order('gate_key')
    .then(({ data }) => {
      cachedGates = (data as FeatureGate[]) ?? [];
      cachePromise = null;
      return cachedGates;
    }) as Promise<FeatureGate[]>;
  return cachePromise;
}

// Invalidate cache (e.g. after admin changes)
export function invalidateGatesCache() {
  cachedGates = null;
  cachePromise = null;
}

export interface GateCheckResult {
  allowed: boolean;
  requiredTier: string | null;
  gate: FeatureGate | null;
}

export function useFeatureGates() {
  const { tier } = useSubscription();
  const [gates, setGates] = useState<FeatureGate[]>(cachedGates ?? []);
  const [loading, setLoading] = useState(!cachedGates);

  useEffect(() => {
    let cancelled = false;
    fetchGates().then(data => {
      if (!cancelled) {
        setGates(data);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const canAccess = useCallback((gateKey: string): GateCheckResult => {
    const gate = gates.find(g => g.gate_key === gateKey);
    if (!gate) return { allowed: true, requiredTier: null, gate: null }; // no gate = allow
    const allowed = tierIndex(tier) >= tierIndex(gate.required_tier);
    return { allowed, requiredTier: gate.required_tier, gate };
  }, [gates, tier]);

  return { gates, loading, canAccess, tier };
}
