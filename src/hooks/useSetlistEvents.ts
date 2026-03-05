import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { enqueue, flushQueue } from '@/lib/offline-sync-queue';

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
  event_date: string;
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

  const setEventsAndCache = useCallback((updater: SetlistEvent[] | ((prev: SetlistEvent[]) => SetlistEvent[])) => {
    setEvents(prev => {
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
          fetchEvents();
        }
      });
    };
    window.addEventListener('online', handleOnline);
    if (navigator.onLine) handleOnline();
    return () => window.removeEventListener('online', handleOnline);
  }, []);

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
      console.error('Failed to fetch setlist events (using cache):', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const createEvent = useCallback(async (name: string, event_date: string) => {
    if (!user) return null;
    const tempId = crypto.randomUUID();
    const now = new Date().toISOString();
    const ev: SetlistEvent = {
      id: tempId, user_id: user.id, name, event_date,
      setlist_id: null, share_token: tempId, is_public: false,
      songs_data: [], created_at: now, updated_at: now,
    };

    setEventsAndCache(prev => [...prev, ev].sort((a, b) => a.event_date.localeCompare(b.event_date)));
    toast.success('Evento criado!');

    try {
      const { data, error } = await supabase
        .from('setlist_events' as any)
        .insert({ user_id: user.id, name, event_date, songs_data: [] })
        .select()
        .single();
      if (error) throw error;
      const raw = data as any;
      const real: SetlistEvent = { ...raw, songs_data: raw.songs_data || [] };
      setEventsAndCache(prev => prev.map(e => e.id === tempId ? real : e));
      return real;
    } catch (e: any) {
      console.error('Failed to create event (queued):', e);
      enqueue({
        table: 'setlist_events',
        action: 'insert',
        payload: { user_id: user.id, name, event_date, songs_data: [] },
      });
      return ev;
    }
  }, [user]);

  const updateEvent = useCallback(async (id: string, updates: Partial<Pick<SetlistEvent, 'name' | 'event_date' | 'setlist_id'>>) => {
    if (!user) return;
    setEventsAndCache(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    toast.success('Evento atualizado!');

    try {
      const { error } = await supabase
        .from('setlist_events' as any)
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
    } catch (e: any) {
      console.error('Failed to update event (queued):', e);
      enqueue({ table: 'setlist_events', action: 'update', payload: updates, filters: { id, user_id: user.id } });
    }
  }, [user]);

  const deleteEvent = useCallback(async (id: string) => {
    if (!user) return;
    setEventsAndCache(prev => prev.filter(e => e.id !== id));
    toast.success('Evento removido');

    try {
      const { error } = await supabase
        .from('setlist_events' as any)
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
    } catch (e: any) {
      console.error('Failed to delete event (queued):', e);
      enqueue({ table: 'setlist_events', action: 'delete', payload: {}, filters: { id, user_id: user.id } });
    }
  }, [user]);

  const togglePublic = useCallback(async (id: string, is_public: boolean) => {
    if (!user) return;
    setEventsAndCache(prev => prev.map(e => e.id === id ? { ...e, is_public } : e));

    try {
      const { error } = await supabase
        .from('setlist_events' as any)
        .update({ is_public })
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
    } catch (e: any) {
      console.error('Failed to toggle public (queued):', e);
      enqueue({ table: 'setlist_events', action: 'update', payload: { is_public }, filters: { id, user_id: user.id } });
    }
  }, [user]);

  const addSongToEvent = useCallback(async (eventId: string, song: EventSong) => {
    if (!user) return;
    let newSongs: EventSong[] = [];
    setEventsAndCache(prev => prev.map(e => {
      if (e.id === eventId) {
        newSongs = [...e.songs_data, song];
        return { ...e, songs_data: newSongs };
      }
      return e;
    }));

    try {
      const { error } = await supabase
        .from('setlist_events' as any)
        .update({ songs_data: newSongs as any })
        .eq('id', eventId)
        .eq('user_id', user.id);
      if (error) throw error;
    } catch (e: any) {
      console.error('Failed to add song (queued):', e);
      enqueue({ table: 'setlist_events', action: 'update', payload: { songs_data: newSongs }, filters: { id: eventId, user_id: user.id } });
    }
  }, [user]);

  const removeSongFromEvent = useCallback(async (eventId: string, songId: string) => {
    if (!user) return;
    let newSongs: EventSong[] = [];
    setEventsAndCache(prev => prev.map(e => {
      if (e.id === eventId) {
        newSongs = e.songs_data.filter(s => s.id !== songId);
        return { ...e, songs_data: newSongs };
      }
      return e;
    }));

    try {
      const { error } = await supabase
        .from('setlist_events' as any)
        .update({ songs_data: newSongs as any })
        .eq('id', eventId)
        .eq('user_id', user.id);
      if (error) throw error;
    } catch (e: any) {
      console.error('Failed to remove song (queued):', e);
      enqueue({ table: 'setlist_events', action: 'update', payload: { songs_data: newSongs }, filters: { id: eventId, user_id: user.id } });
    }
  }, [user]);

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
      console.error('Failed to reorder songs (queued):', e);
      enqueue({ table: 'setlist_events', action: 'update', payload: { songs_data: newSongs }, filters: { id: eventId, user_id: user.id } });
    }
  }, [user]);

  return { events, loading, fetchEvents, createEvent, updateEvent, deleteEvent, togglePublic, addSongToEvent, removeSongFromEvent, reorderEventSongs };
}
