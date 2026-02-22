import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AppConfig {
  [key: string]: string;
}

let cachedConfig: AppConfig | null = null;
let cachePromise: Promise<AppConfig> | null = null;

async function loadConfig(): Promise<AppConfig> {
  const { data } = await supabase
    .from('landing_config')
    .select('config_key, config_value')
    .like('config_key', 'app_%');
  const map: AppConfig = {};
  data?.forEach((row: any) => { map[row.config_key] = row.config_value; });
  cachedConfig = map;
  cachePromise = null;
  return map;
}

async function fetchConfig(): Promise<AppConfig> {
  if (cachedConfig) return cachedConfig;
  if (cachePromise) return cachePromise;
  cachePromise = loadConfig();
  return cachePromise;
}

export function useAppConfig() {
  const [config, setConfig] = useState<AppConfig>(cachedConfig ?? {});
  const [loading, setLoading] = useState(!cachedConfig);

  useEffect(() => {
    let mounted = true;

    fetchConfig().then(data => {
      if (mounted) {
        setConfig(data);
        setLoading(false);
      }
    });

    // Realtime updates
    const channel = supabase
      .channel('app_config_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'landing_config' }, () => {
        cachedConfig = null;
        cachePromise = null;
        loadConfig().then(data => {
          if (mounted) setConfig(data);
        });
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const get = useCallback((key: string, defaultVal = ''): string => {
    return config[key] ?? defaultVal;
  }, [config]);

  const isEnabled = useCallback((key: string): boolean => {
    return config[key] !== 'false';
  }, [config]);

  return { config, loading, get, isEnabled };
}
