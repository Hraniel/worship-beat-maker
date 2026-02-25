import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AdminNotification {
  id: string;
  title: string;
  message: string;
  created_at: string;
}

export function useUserNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchUnread = useCallback(async () => {
    if (!user) return;

    // Fetch notifications relevant to this user (only in-app channel)
    const { data: allNotifs } = await supabase
      .from('admin_notifications')
      .select('id, title, message, created_at, channels')
      .or(`target.eq.all,target_user_id.eq.${user.id}`)
      .contains('channels', ['in-app'])
      .order('created_at', { ascending: false })
      .limit(20);

    if (!allNotifs || allNotifs.length === 0) {
      setNotifications([]);
      return;
    }

    // Fetch already-read notification ids
    const { data: reads } = await supabase
      .from('user_notification_reads')
      .select('notification_id')
      .eq('user_id', user.id);

    const readIds = new Set((reads || []).map((r) => r.notification_id));
    const unread = allNotifs.filter((n) => !readIds.has(n.id));
    setNotifications(unread);
  }, [user]);

  // Initial fetch
  useEffect(() => {
    fetchUnread();
  }, [fetchUnread]);

  // Real-time: listen for new notifications inserted into admin_notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications-realtime-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'admin_notifications' },
        async (payload) => {
          const n = payload.new as { id: string; target: string; target_user_id: string | null; title: string; message: string; created_at: string; channels: string[] };

          // Only show in-app notifications (not push-only)
          if (!n.channels || !n.channels.includes('in-app')) return;

          // Only show if targeted at this user or all users
          if (n.target !== 'all' && n.target_user_id !== user.id) return;

          // Check if already read (shouldn't be for a brand-new notification, but defensive)
          const { data: read } = await supabase
            .from('user_notification_reads')
            .select('id')
            .eq('user_id', user.id)
            .eq('notification_id', n.id)
            .maybeSingle();

          if (read) return;

          setNotifications((prev) => {
            // Avoid duplicates
            if (prev.some((p) => p.id === n.id)) return prev;
            return [{ id: n.id, title: n.title, message: n.message, created_at: n.created_at }, ...prev];
          });
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (!user) return;
      await supabase.from('user_notification_reads').insert({
        user_id: user.id,
        notification_id: notificationId,
      });
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    },
    [user]
  );

  const markAllAsRead = useCallback(async () => {
    if (!user || notifications.length === 0) return;
    await Promise.all(
      notifications.map((n) =>
        supabase.from('user_notification_reads').insert({
          user_id: user.id,
          notification_id: n.id,
        })
      )
    );
    setNotifications([]);
  }, [user, notifications]);

  return { notifications, markAsRead, markAllAsRead };
}
