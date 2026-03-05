import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface EventSong {
  id: string;
  name: string;
  bpm: number;
  timeSignature: string;
  key?: string;
}

export interface SetlistEvent {
  id: string;
  user_id: string;
  name: string;
  event_date: string; // 'YYYY-MM-DD'
  setlist_id: string | null;
  share_token: string | null;
  is_public: boolean;
  songs_data: EventSong[];
  created_at: string;
  updated_at: string;
}

export function useSetlistEvents() {
  const { user } = useAuth();
  const cacheKey = user ? `setlist_events_cache_${user.id}` : null;

  const [events, setEvents] = useState<SetlistEvent[]>(() => {
    if (!cacheKey) return [];
    try {
      const cached = localStorage.getItem(cacheKey);
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [loading, setLoading] = useState(true);

  // Wrapper that syncs to localStorage immediately (critical for pagehide saves)
  const setEventsAndCache = useCallback((updater: SetlistEvent[] | ((prev: SetlistEvent[]) => SetlistEvent[])) => {
    setEvents(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (cacheKey && next.length > 0) {
        try { localStorage.setItem(cacheKey, JSON.stringify(next)); } catch {}
      }
      return next;
    });
  }, [cacheKey]);

  const fetchEvents = useCallback(async () => {
    if (!user) { setEvents([]); setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from('setlist_events' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('event_date', { ascending: true });
      if (error) throw error;
      const parsed = ((data || []) as any[]).map(d => ({ ...d, songs_data: d.songs_data || [] }));
      setEventsAndCache(parsed);
    } catch (e) {
      console.error('Failed to fetch setlist events:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const createEvent = useCallback(async (name: string, event_date: string) => {
    if (!user) return null;
    try {
      const { data, error } = await supabase
        .from('setlist_events' as any)
        .insert({ user_id: user.id, name, event_date, songs_data: [] })
        .select()
        .single();
      if (error) throw error;
      const raw = data as any;
      const ev: SetlistEvent = { ...raw, songs_data: raw.songs_data || [] };
      setEventsAndCache(prev => [...prev, ev].sort((a, b) => a.event_date.localeCompare(b.event_date)));
      toast.success('Evento criado!');
      return ev;
    } catch (e: any) {
      toast.error(e.message || 'Erro ao criar evento');
      return null;
    }
  }, [user]);

  const updateEvent = useCallback(async (id: string, updates: Partial<Pick<SetlistEvent, 'name' | 'event_date' | 'setlist_id'>>) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('setlist_events' as any)
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
      setEventsAndCache(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
      toast.success('Evento atualizado!');
    } catch (e: any) {
      toast.error(e.message || 'Erro ao atualizar evento');
    }
  }, [user]);

  const deleteEvent = useCallback(async (id: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('setlist_events' as any)
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
      setEventsAndCache(prev => prev.filter(e => e.id !== id));
      toast.success('Evento removido');
    } catch (e: any) {
      toast.error(e.message || 'Erro ao remover evento');
    }
  }, [user]);

  const togglePublic = useCallback(async (id: string, is_public: boolean) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('setlist_events' as any)
        .update({ is_public })
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
      setEventsAndCache(prev => prev.map(e => e.id === id ? { ...e, is_public } : e));
    } catch (e: any) {
      toast.error(e.message || 'Erro ao atualizar compartilhamento');
    }
  }, [user]);

  const addSongToEvent = useCallback(async (eventId: string, song: EventSong) => {
    if (!user) return;
    const event = events.find(e => e.id === eventId);
    if (!event) return;
    const newSongs = [...event.songs_data, song];
    try {
      const { error } = await supabase
        .from('setlist_events' as any)
        .update({ songs_data: newSongs as any })
        .eq('id', eventId)
        .eq('user_id', user.id);
      if (error) throw error;
      setEventsAndCache(prev => prev.map(e => e.id === eventId ? { ...e, songs_data: newSongs } : e));
    } catch (e: any) {
      toast.error(e.message || 'Erro ao adicionar música');
    }
  }, [user, events]);

  const removeSongFromEvent = useCallback(async (eventId: string, songId: string) => {
    if (!user) return;
    const event = events.find(e => e.id === eventId);
    if (!event) return;
    const newSongs = event.songs_data.filter(s => s.id !== songId);
    try {
      const { error } = await supabase
        .from('setlist_events' as any)
        .update({ songs_data: newSongs as any })
        .eq('id', eventId)
        .eq('user_id', user.id);
      if (error) throw error;
      setEventsAndCache(prev => prev.map(e => e.id === eventId ? { ...e, songs_data: newSongs } : e));
    } catch (e: any) {
      toast.error(e.message || 'Erro ao remover música');
    }
  }, [user, events]);

  const reorderEventSongs = useCallback(async (eventId: string, newSongs: EventSong[]) => {
    if (!user) return;
    setEventsAndCache(prev => prev.map(e => e.id === eventId ? { ...e, songs_data: newSongs } : e));
    try {
      const { error } = await supabase
        .from('setlist_events' as any)
        .update({ songs_data: newSongs as any })
        .eq('id', eventId)
        .eq('user_id', user.id);
      if (error) throw error;
    } catch (e: any) {
      toast.error(e.message || 'Erro ao reordenar músicas');
      fetchEvents();
    }
  }, [user, fetchEvents]);

  return { events, loading, fetchEvents, createEvent, updateEvent, deleteEvent, togglePublic, addSongToEvent, removeSongFromEvent, reorderEventSongs };
}
