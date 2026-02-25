import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PrelaunchState {
  enabled: boolean;
  launchDate: string;
  loading: boolean;
}

let cachedState: PrelaunchState | null = null;

export function usePrelaunchMode() {
  const [state, setState] = useState<PrelaunchState>(
    cachedState ?? { enabled: false, launchDate: '', loading: true }
  );

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data } = await supabase
        .from('landing_config')
        .select('config_key, config_value')
        .in('config_key', ['prelaunch_enabled', 'prelaunch_date']);

      if (!mounted) return;

      const map: Record<string, string> = {};
      data?.forEach((r: any) => { map[r.config_key] = r.config_value; });

      const newState: PrelaunchState = {
        enabled: map.prelaunch_enabled === 'true',
        launchDate: map.prelaunch_date || '',
        loading: false,
      };

      // Check if launch date has passed
      if (newState.launchDate && new Date(newState.launchDate).getTime() <= Date.now()) {
        newState.enabled = false;
      }

      cachedState = newState;
      setState(newState);
    };

    load();

    const channel = supabase
      .channel('prelaunch_config')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'landing_config',
      }, () => {
        cachedState = null;
        load();
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return state;
}
