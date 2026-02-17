import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PackSound {
  id: string;
  name: string;
  short_name: string;
  preview_path: string | null;
  duration_ms: number;
}

export interface StorePackData {
  id: string;
  name: string;
  description: string;
  category: string;
  icon_name: string;
  color: string;
  tag: string | null;
  is_available: boolean;
  price_cents: number;
  sounds: PackSound[];
  purchased: boolean;
}

export function useStorePacks() {
  const { user } = useAuth();
  const [packs, setPacks] = useState<StorePackData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPacks = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch packs
      const { data: packsData, error: packsErr } = await supabase
        .from('store_packs')
        .select('*')
        .order('created_at');

      if (packsErr) throw packsErr;

      // Fetch sounds for all packs
      const { data: soundsData, error: soundsErr } = await supabase
        .from('pack_sounds')
        .select('*')
        .order('sort_order');

      if (soundsErr) throw soundsErr;

      // Fetch user purchases
      let purchasedIds: Set<string> = new Set();
      if (user) {
        const { data: purchases } = await supabase
          .from('user_purchases')
          .select('pack_id')
          .eq('user_id', user.id);

        if (purchases) {
          purchasedIds = new Set(purchases.map(p => p.pack_id));
        }
      }

      // Group sounds by pack
      const soundsByPack = new Map<string, PackSound[]>();
      soundsData?.forEach(s => {
        const list = soundsByPack.get(s.pack_id) || [];
        list.push({
          id: s.id,
          name: s.name,
          short_name: s.short_name,
          preview_path: s.preview_path,
          duration_ms: s.duration_ms,
        });
        soundsByPack.set(s.pack_id, list);
      });

      const result: StorePackData[] = (packsData || []).map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        category: p.category,
        icon_name: p.icon_name,
        color: p.color,
        tag: p.tag,
        is_available: p.is_available,
        price_cents: p.price_cents,
        sounds: soundsByPack.get(p.id) || [],
        purchased: purchasedIds.has(p.id),
      }));

      setPacks(result);
    } catch (err) {
      console.error('Error fetching store packs:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPacks();
  }, [fetchPacks]);

  return { packs, loading, refetch: fetchPacks };
}
