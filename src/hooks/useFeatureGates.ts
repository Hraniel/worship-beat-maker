import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/contexts/SubscriptionContext';

export interface FeatureGate {
  id: string;
  gate_key: string;
  gate_label: string;
  required_tier: string;
  description: string | null;
}

const TIER_ORDER = ['free', 'pro', 'master', 'lifetime'] as const;

function tierIndex(tier: string): number {
  // lifetime has same access level as master
  if (tier === 'lifetime') return TIER_ORDER.indexOf('master');
  const idx = TIER_ORDER.indexOf(tier as typeof TIER_ORDER[number]);
  return idx === -1 ? 0 : idx;
}

// Cache compartilhado — invalidado via Realtime ou chamada explícita
let cachedGates: FeatureGate[] | null = null;
let cachePromise: Promise<FeatureGate[]> | null = null;

async function loadGates(): Promise<FeatureGate[]> {
  const { data } = await supabase
    .from('feature_gates')
    .select('*')
    .order('gate_key');
  cachedGates = (data as FeatureGate[]) ?? [];
  cachePromise = null;
  return cachedGates;
}

async function fetchGates(): Promise<FeatureGate[]> {
  if (cachedGates) return cachedGates;
  if (cachePromise) return cachePromise;
  cachePromise = loadGates();
  return cachePromise;
}

// Invalida o cache e notifica listeners registrados
const refreshListeners = new Set<() => void>();

export function invalidateGatesCache() {
  cachedGates = null;
  cachePromise = null;
  refreshListeners.forEach(fn => fn());
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
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    cachedGates = null;
    cachePromise = null;
    const data = await loadGates();
    if (mountedRef.current) {
      setGates(data);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    // Carga inicial
    fetchGates().then(data => {
      if (mountedRef.current) {
        setGates(data);
        setLoading(false);
      }
    });

    // Listener para invalidações feitas pelo próprio admin (mesma aba)
    refreshListeners.add(refresh);

    // Canal Realtime — dispara para todos os clientes conectados
    const channel = supabase
      .channel('feature_gates_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'feature_gates' },
        () => { refresh(); }
      )
      .subscribe();

    return () => {
      mountedRef.current = false;
      refreshListeners.delete(refresh);
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  const canAccess = useCallback((gateKey: string): GateCheckResult => {
    const gate = gates.find(g => g.gate_key === gateKey);
    if (!gate) return { allowed: true, requiredTier: null, gate: null };
    const allowed = tierIndex(tier) >= tierIndex(gate.required_tier);
    return { allowed, requiredTier: gate.required_tier, gate };
  }, [gates, tier]);

  return { gates, loading, canAccess, tier };
}
