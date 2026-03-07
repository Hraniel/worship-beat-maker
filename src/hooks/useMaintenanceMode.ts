import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

let cachedMaintenance: boolean | null = null;

export function useMaintenanceMode() {
  const [enabled, setEnabled] = useState(cachedMaintenance ?? false);
  const [loading, setLoading] = useState(cachedMaintenance === null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('landing_config')
          .select('config_value')
          .eq('config_key', 'maintenance_enabled')
          .maybeSingle();

        if (error) throw error;
        if (!mounted) return;
        const val = data?.config_value === 'true';
        cachedMaintenance = val;
        setEnabled(val);
        setLoading(false);
      } catch {
        // Offline — use cached value or default to disabled
        if (!mounted) return;
        setEnabled(cachedMaintenance ?? false);
        setLoading(false);
      }
    };

    load();

    const channel = supabase
      .channel('maintenance_config')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'landing_config',
      }, (payload: any) => {
        const row = payload.new;
        if (row?.config_key === 'maintenance_enabled') {
          const val = row.config_value === 'true';
          cachedMaintenance = val;
          setEnabled(val);
          setLoading(false);
        }
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return { enabled, loading };
}
