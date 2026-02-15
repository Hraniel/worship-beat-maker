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
}

export function useSetlists() {
  const { user } = useAuth();
  const [setlists, setSetlists] = useState<DbSetlist[]>([]);
  const [loading, setLoading] = useState(true);

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
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setSetlists(
        (data || []).map((d) => ({
          id: d.id,
          name: d.name,
          songs: (d.songs as unknown as SetlistSong[]) || [],
          created_at: d.created_at,
          updated_at: d.updated_at,
        }))
      );
    } catch (e) {
      console.error('Failed to fetch setlists:', e);
      toast.error('Erro ao carregar setlists');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSetlists();
  }, [fetchSetlists]);

  const createSetlist = useCallback(
    async (name: string, songs: SetlistSong[]) => {
      if (!user) return null;
      try {
        const { data, error } = await supabase
          .from('setlists')
          .insert({
            user_id: user.id,
            name,
            songs: songs as unknown as Json,
          })
          .select()
          .single();

        if (error) throw error;
        const newSetlist: DbSetlist = {
          id: data.id,
          name: data.name,
          songs: (data.songs as unknown as SetlistSong[]) || [],
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
        setSetlists((prev) => [newSetlist, ...prev]);
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
      try {
        const { error } = await supabase
          .from('setlists')
          .update({ songs: songs as unknown as Json })
          .eq('id', id)
          .eq('user_id', user.id);

        if (error) throw error;
        setSetlists((prev) =>
          prev.map((s) => (s.id === id ? { ...s, songs, updated_at: new Date().toISOString() } : s))
        );
      } catch (e) {
        console.error('Failed to update setlist:', e);
        toast.error('Erro ao atualizar setlist');
      }
    },
    [user]
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
        setSetlists((prev) => prev.filter((s) => s.id !== id));
        toast.success('Setlist removida');
      } catch (e) {
        console.error('Failed to delete setlist:', e);
        toast.error('Erro ao remover setlist');
      }
    },
    [user]
  );

  return { setlists, loading, createSetlist, updateSetlist, deleteSetlist, refetch: fetchSetlists };
}
