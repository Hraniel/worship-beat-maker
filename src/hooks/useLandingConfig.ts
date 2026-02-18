import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface LandingConfig {
  [key: string]: string;
}

export interface PlanPricing {
  id: string;
  tier: string;
  name: string;
  price_brl: number;
  period: string;
  cta_text: string;
  highlight: boolean;
  badge_text: string | null;
  max_pads: number;
  max_imports: number;
}

export interface PlanFeature {
  id: string;
  tier: string;
  feature_key: string;
  feature_label: string;
  enabled: boolean;
  sort_order: number;
}

export interface FeatureGate {
  id: string;
  gate_key: string;
  gate_label: string;
  required_tier: string;
  description: string | null;
}

export function useLandingConfig() {
  const [config, setConfig] = useState<LandingConfig>({});
  const [pricing, setPricing] = useState<PlanPricing[]>([]);
  const [features, setFeatures] = useState<PlanFeature[]>([]);
  const [gates, setGates] = useState<FeatureGate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    try {
      const [configRes, pricingRes, featuresRes, gatesRes] = await Promise.all([
        supabase.from('landing_config').select('*').order('config_key'),
        supabase.from('plan_pricing').select('*').order('price_brl'),
        supabase.from('plan_features').select('*').order('sort_order'),
        supabase.from('feature_gates').select('*').order('gate_label'),
      ]);

      if (configRes.data) {
        const map: LandingConfig = {};
        configRes.data.forEach((row: any) => { map[row.config_key] = row.config_value; });
        setConfig(map);
      }
      if (pricingRes.data) setPricing(pricingRes.data as PlanPricing[]);
      if (featuresRes.data) setFeatures(featuresRes.data as PlanFeature[]);
      if (gatesRes.data) setGates(gatesRes.data as FeatureGate[]);
    } catch (e) {
      console.error('Failed to load landing config', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  return { config, pricing, features, gates, loading, refetch: fetchAll };
}
