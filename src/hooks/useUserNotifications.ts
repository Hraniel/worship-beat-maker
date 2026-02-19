import { useEffect, useState, useCallback } from 'react';
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

  const fetchUnread = useCallback(async () => {
    if (!user) return;

    // Fetch notifications relevant to this user
    const { data: allNotifs } = await supabase
      .from('admin_notifications')
      .select('id, title, message, created_at')
      .or(`target.eq.all,target_user_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!allNotifs || allNotifs.length === 0) return;

    // Fetch already-read notification ids
    const { data: reads } = await supabase
      .from('user_notification_reads')
      .select('notification_id')
      .eq('user_id', user.id);

    const readIds = new Set((reads || []).map((r) => r.notification_id));
    const unread = allNotifs.filter((n) => !readIds.has(n.id));
    setNotifications(unread);
  }, [user]);

  useEffect(() => {
    fetchUnread();
  }, [fetchUnread]);

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
