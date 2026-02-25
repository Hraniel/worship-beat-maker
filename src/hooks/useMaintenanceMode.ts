import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

let cachedMaintenance: boolean | null = null;

export function useMaintenanceMode() {
  const [enabled, setEnabled] = useState(cachedMaintenance ?? false);
  const [loading, setLoading] = useState(cachedMaintenance === null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data } = await supabase
        .from('landing_config')
        .select('config_value')
        .eq('config_key', 'maintenance_enabled')
        .maybeSingle();

      if (!mounted) return;
      const val = data?.config_value === 'true';
      cachedMaintenance = val;
      setEnabled(val);
      setLoading(false);
    };

    load();

    const channel = supabase
      .channel('maintenance_config')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'landing_config',
        filter: 'config_key=eq.maintenance_enabled',
      }, () => {
        cachedMaintenance = null;
        load();
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return { enabled, loading };
}
