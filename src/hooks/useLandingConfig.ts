import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { resolveLocalizedKey } from '@/lib/locale-config';

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

export interface LandingFeature {
  id: string;
  title: string;
  description: string;
  icon_name: string;
  image_url: string | null;
  sort_order: number;
  enabled: boolean;
}

export function useLandingConfig() {
  const [config, setConfig] = useState<LandingConfig>({});
  const [pricing, setPricing] = useState<PlanPricing[]>([]);
  const [features, setFeatures] = useState<PlanFeature[]>([]);
  const [gates, setGates] = useState<FeatureGate[]>([]);
  const [landingFeatures, setLandingFeatures] = useState<LandingFeature[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    try {
      const [configRes, pricingRes, featuresRes, gatesRes, landingFeaturesRes] = await Promise.all([
        supabase.from('landing_config').select('*').order('config_key'),
        supabase.from('public_plan_pricing' as any).select('*').order('price_brl'),
        supabase.from('plan_features').select('*').order('sort_order'),
        supabase.from('feature_gates').select('*').order('gate_label'),
        supabase.from('landing_features').select('*').order('sort_order'),
      ]);

      if (configRes.data) {
        const map: LandingConfig = {};
        configRes.data.forEach((row: any) => { map[row.config_key] = row.config_value; });
        setConfig(map);
      }
      if (pricingRes.data) setPricing(pricingRes.data as unknown as PlanPricing[]);
      if (featuresRes.data) setFeatures(featuresRes.data as PlanFeature[]);
      if (gatesRes.data) setGates(gatesRes.data as FeatureGate[]);
      if (landingFeaturesRes.data) setLandingFeatures(landingFeaturesRes.data as LandingFeature[]);
    } catch (e) {
      console.error('Failed to load landing config', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();

    // Realtime: atualiza cards de recursos em tempo real
    const channel = supabase
      .channel('landing_features_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'landing_features' }, () => {
        fetchAll();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getLocalized = useCallback((key: string, fallback = ''): string => {
    return resolveLocalizedKey(config, key, fallback);
  }, [config]);

  return { config, pricing, features, gates, landingFeatures, loading, refetch: fetchAll, getLocalized };
}
