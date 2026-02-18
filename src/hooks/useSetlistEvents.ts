import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface SetlistEvent {
  id: string;
  user_id: string;
  name: string;
  event_date: string; // 'YYYY-MM-DD'
  setlist_id: string | null;
  share_token: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export function useSetlistEvents() {
  const { user } = useAuth();
  const [events, setEvents] = useState<SetlistEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    if (!user) { setEvents([]); setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from('setlist_events' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('event_date', { ascending: true });
      if (error) throw error;
      setEvents((data || []) as unknown as SetlistEvent[]);
    } catch (e) {
      console.error('Failed to fetch setlist events:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const createEvent = useCallback(async (name: string, event_date: string, setlist_id: string | null) => {
    if (!user) return null;
    try {
      const { data, error } = await supabase
        .from('setlist_events' as any)
        .insert({ user_id: user.id, name, event_date, setlist_id })
        .select()
        .single();
      if (error) throw error;
      const ev = data as unknown as SetlistEvent;
      setEvents(prev => [...prev, ev].sort((a, b) => a.event_date.localeCompare(b.event_date)));
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
      setEvents(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
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
      setEvents(prev => prev.filter(e => e.id !== id));
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
      setEvents(prev => prev.map(e => e.id === id ? { ...e, is_public } : e));
    } catch (e: any) {
      toast.error(e.message || 'Erro ao atualizar compartilhamento');
    }
  }, [user]);

  return { events, loading, fetchEvents, createEvent, updateEvent, deleteEvent, togglePublic };
}
