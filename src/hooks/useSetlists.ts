import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { SetlistSong } from '@/lib/sounds';
import type { Json } from '@/integrations/supabase/types';

interface DbSetlist {
  id: string;
  name: string;
  songs: SetlistSong[];
  created_at: string;
  updated_at: string;
  sort_order: number;
}

export function useSetlists() {
  const { user } = useAuth();
  const cacheKey = user ? `setlists_cache_${user.id}` : null;

  const [setlists, setSetlists] = useState<DbSetlist[]>(() => {
    if (!cacheKey) return [];
    try {
      const cached = localStorage.getItem(cacheKey);
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [loading, setLoading] = useState(true);

  // Wrapper that syncs to localStorage immediately (critical for pagehide saves)
  const setSetlistsAndCache = useCallback((updater: DbSetlist[] | ((prev: DbSetlist[]) => DbSetlist[])) => {
    setSetlists(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (cacheKey && next.length > 0) {
        try { localStorage.setItem(cacheKey, JSON.stringify(next)); } catch {}
      }
      return next;
    });
  }, [cacheKey]);

  const fetchSetlists = useCallback(async () => {
    if (!user) {
      setSetlists([]);
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('setlists')
        .select('*')
        .eq('user_id', user.id)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      const parsed = (data || []).map((d) => ({
        id: d.id,
        name: d.name,
        songs: (d.songs as unknown as SetlistSong[]) || [],
        created_at: d.created_at,
        updated_at: d.updated_at,
        sort_order: d.sort_order ?? 0,
      }));
      setSetlists(parsed);
    } catch (e) {
      console.error('Failed to fetch setlists:', e);
      // Only show error if no cached data
      if (!cacheKey || !localStorage.getItem(cacheKey)) {
        toast.error('Erro ao carregar setlists');
      }
    } finally {
      setLoading(false);
    }
  }, [user, cacheKey]);

  useEffect(() => {
    fetchSetlists();
  }, [fetchSetlists]);

  const createSetlist = useCallback(
    async (name: string, songs: SetlistSong[]) => {
      if (!user) return null;
      try {
        const maxOrder = setlists.reduce((max, s) => Math.max(max, s.sort_order), 0);
        const { data, error } = await supabase
          .from('setlists')
          .insert({
            user_id: user.id,
            name,
            songs: songs as unknown as Json,
            sort_order: maxOrder + 1,
          })
          .select()
          .single();

        if (error) throw error;
        const newOrder = setlists.reduce((max, s) => Math.max(max, s.sort_order), 0) + 1;
        const newSetlist: DbSetlist = {
          id: data.id,
          name: data.name,
          songs: (data.songs as unknown as SetlistSong[]) || [],
          created_at: data.created_at,
          updated_at: data.updated_at,
          sort_order: newOrder,
        };
        setSetlistsAndCache((prev) => [...prev, newSetlist]);
        toast.success('Setlist salva!');
        return newSetlist;
      } catch (e) {
        console.error('Failed to create setlist:', e);
        toast.error('Erro ao salvar setlist');
        return null;
      }
    },
    [user]
  );

  const updateSetlist = useCallback(
    async (id: string, songs: SetlistSong[]) => {
      if (!user) return;

      // Synchronously update localStorage so pagehide/beforeunload saves persist
      const updatedList = (prev: DbSetlist[]) =>
        prev.map((s) => (s.id === id ? { ...s, songs, updated_at: new Date().toISOString() } : s));

      setSetlists((prev) => {
        const next = updatedList(prev);
        if (cacheKey) {
          try { localStorage.setItem(cacheKey, JSON.stringify(next)); } catch {}
        }
        return next;
      });

      try {
        const { error } = await supabase
          .from('setlists')
          .update({ songs: songs as unknown as Json })
          .eq('id', id)
          .eq('user_id', user.id);

        if (error) throw error;
      } catch (e) {
        console.error('Failed to update setlist:', e);
        // Don't show error toast during pagehide saves
      }
    },
    [user, cacheKey]
  );

  const deleteSetlist = useCallback(
    async (id: string) => {
      if (!user) return;
      try {
        const { error } = await supabase
          .from('setlists')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);

        if (error) throw error;
        setSetlistsAndCache((prev) => prev.filter((s) => s.id !== id));
        toast.success('Setlist removida');
      } catch (e) {
        console.error('Failed to delete setlist:', e);
        toast.error('Erro ao remover setlist');
      }
    },
    [user]
  );

  const reorderSetlists = useCallback(
    async (reorderedIds: string[]) => {
      if (!user) return;
      // Optimistic update
      setSetlistsAndCache((prev) => {
        const map = new Map(prev.map((s) => [s.id, s]));
        return reorderedIds
          .map((id, i) => {
            const s = map.get(id);
            return s ? { ...s, sort_order: i } : null;
          })
          .filter(Boolean) as DbSetlist[];
      });
      // Persist
      try {
        const updates = reorderedIds.map((id, i) =>
          supabase
            .from('setlists')
            .update({ sort_order: i })
            .eq('id', id)
            .eq('user_id', user.id)
        );
        await Promise.all(updates);
      } catch (e) {
        console.error('Failed to reorder setlists:', e);
        toast.error('Erro ao reordenar setlists');
        fetchSetlists(); // rollback
      }
    },
    [user, fetchSetlists]
  );

  return { setlists, loading, createSetlist, updateSetlist, deleteSetlist, reorderSetlists, refetch: fetchSetlists };
}
