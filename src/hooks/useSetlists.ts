import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { SetlistSong } from '@/lib/sounds';
import type { Json } from '@/integrations/supabase/types';
import { enqueue, flushQueue } from '@/lib/offline-sync-queue';

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

  const setSetlistsAndCache = useCallback((updater: DbSetlist[] | ((prev: DbSetlist[]) => DbSetlist[])) => {
    setSetlists(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (cacheKey) {
        try { localStorage.setItem(cacheKey, JSON.stringify(next)); } catch {}
      }
      return next;
    });
  }, [cacheKey]);

  // Sync queued operations when back online
  useEffect(() => {
    const handleOnline = () => {
      flushQueue(supabase).then(count => {
        if (count > 0) {
          fetchSetlists(); // refresh from server after sync
          toast.success('Dados sincronizados com a nuvem');
        }
      });
    };
    window.addEventListener('online', handleOnline);
    // Also try on mount
    if (navigator.onLine) handleOnline();
    return () => window.removeEventListener('online', handleOnline);
  }, []);

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
      setSetlistsAndCache(parsed);
    } catch (e) {
      console.error('Failed to fetch setlists:', e);
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
      const maxOrder = setlists.reduce((max, s) => Math.max(max, s.sort_order), 0);
      const tempId = crypto.randomUUID();
      const now = new Date().toISOString();
      const newSetlist: DbSetlist = {
        id: tempId,
        name,
        songs,
        created_at: now,
        updated_at: now,
        sort_order: maxOrder + 1,
      };

      // Optimistic local update
      setSetlistsAndCache((prev) => [...prev, newSetlist]);
      toast.success('Setlist salva!');

      try {
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
        // Replace temp ID with real ID
        const realSetlist: DbSetlist = {
          id: data.id,
          name: data.name,
          songs: (data.songs as unknown as SetlistSong[]) || [],
          created_at: data.created_at,
          updated_at: data.updated_at,
          sort_order: data.sort_order ?? maxOrder + 1,
        };
        setSetlistsAndCache((prev) => prev.map(s => s.id === tempId ? realSetlist : s));
        return realSetlist;
      } catch (e) {
        console.error('Failed to create setlist (queued for sync):', e);
        enqueue({
          table: 'setlists',
          action: 'insert',
          payload: { user_id: user.id, name, songs: songs as unknown as Json, sort_order: maxOrder + 1 },
        });
        return newSetlist;
      }
    },
    [user, setlists]
  );

  const updateSetlist = useCallback(
    async (id: string, songs: SetlistSong[]) => {
      if (!user) return;

      // Optimistic local update
      setSetlists((prev) => {
        const next = prev.map((s) => (s.id === id ? { ...s, songs, updated_at: new Date().toISOString() } : s));
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
        console.error('Failed to update setlist (queued for sync):', e);
        enqueue({
          table: 'setlists',
          action: 'update',
          payload: { songs: songs as unknown as Json },
          filters: { id, user_id: user.id },
        });
      }
    },
    [user, cacheKey]
  );

  const deleteSetlist = useCallback(
    async (id: string) => {
      if (!user) return;

      // Optimistic local update
      setSetlistsAndCache((prev) => prev.filter((s) => s.id !== id));
      toast.success('Setlist removida');

      try {
        const { error } = await supabase
          .from('setlists')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);

        if (error) throw error;
      } catch (e) {
        console.error('Failed to delete setlist (queued for sync):', e);
        enqueue({
          table: 'setlists',
          action: 'delete',
          payload: {},
          filters: { id, user_id: user.id },
        });
      }
    },
    [user]
  );

  const reorderSetlists = useCallback(
    async (reorderedIds: string[]) => {
      if (!user) return;
      setSetlistsAndCache((prev) => {
        const map = new Map(prev.map((s) => [s.id, s]));
        return reorderedIds
          .map((id, i) => {
            const s = map.get(id);
            return s ? { ...s, sort_order: i } : null;
          })
          .filter(Boolean) as DbSetlist[];
      });
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
        // Queue individual reorder ops
        reorderedIds.forEach((id, i) => {
          enqueue({
            table: 'setlists',
            action: 'update',
            payload: { sort_order: i },
            filters: { id, user_id: user.id },
          });
        });
      }
    },
    [user]
  );

  return { setlists, loading, createSetlist, updateSetlist, deleteSetlist, reorderSetlists, refetch: fetchSetlists };
}
