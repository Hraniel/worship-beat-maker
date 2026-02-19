import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function usePresenceTracker(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel('glory-pads-online', {
      config: { presence: { key: userId } },
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          user_id: userId,
          online_at: new Date().toISOString(),
        });
      }
    });

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [userId]);
}
