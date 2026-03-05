import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PaymentModeConfig {
  payment_mode: 'subscription' | 'lifetime';
  lifetime_price_brl: number;
  lifetime_name: string;
  lifetime_cta_text: string;
  lifetime_stripe_price_id: string;
  lifetime_stripe_product_id: string;
}

const DEFAULTS: PaymentModeConfig = {
  payment_mode: 'subscription',
  lifetime_price_brl: 14.90,
  lifetime_name: 'Acesso Vitalício',
  lifetime_cta_text: 'Comprar agora',
  lifetime_stripe_price_id: '',
  lifetime_stripe_product_id: '',
};

const KEYS = [
  'payment_mode',
  'lifetime_price_brl',
  'lifetime_name',
  'lifetime_cta_text',
  'lifetime_stripe_price_id',
  'lifetime_stripe_product_id',
];

let cachedPaymentMode: PaymentModeConfig | null = null;

export function usePaymentMode() {
  const [config, setConfig] = useState<PaymentModeConfig>(cachedPaymentMode ?? DEFAULTS);
  const [loading, setLoading] = useState(!cachedPaymentMode);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('app_config')
      .select('config_key, config_value')
      .in('config_key', KEYS);

    const map: Record<string, string> = {};
    data?.forEach((r: any) => { map[r.config_key] = r.config_value; });

    const result: PaymentModeConfig = {
      payment_mode: (map.payment_mode as any) || DEFAULTS.payment_mode,
      lifetime_price_brl: parseFloat(map.lifetime_price_brl) || DEFAULTS.lifetime_price_brl,
      lifetime_name: map.lifetime_name || DEFAULTS.lifetime_name,
      lifetime_cta_text: map.lifetime_cta_text || DEFAULTS.lifetime_cta_text,
      lifetime_stripe_price_id: map.lifetime_stripe_price_id || '',
      lifetime_stripe_product_id: map.lifetime_stripe_product_id || '',
    };
    cachedPaymentMode = result;
    setConfig(result);
    setLoading(false);
    return result;
  }, []);

  useEffect(() => {
    let mounted = true;
    load().then(r => { if (mounted) setConfig(r); });

    const channel = supabase
      .channel('payment_mode_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_config' }, () => {
        cachedPaymentMode = null;
        load();
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [load]);

  const isLifetime = config.payment_mode === 'lifetime';

  return { ...config, isLifetime, loading, refresh: load };
}
