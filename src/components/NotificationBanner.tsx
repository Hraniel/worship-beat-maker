import { useState } from 'react';
import { Bell, X, ChevronDown, ChevronUp, CheckCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { AdminNotification } from '@/hooks/useUserNotifications';

interface NotificationBannerProps {
  notifications: AdminNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
}

const NotificationBanner = ({ notifications, onMarkAsRead, onMarkAllAsRead }: NotificationBannerProps) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  if (notifications.length === 0) return null;

  const first = notifications[0];
  const hasMore = notifications.length > 1;

  return (
    <div className="fixed top-0 left-0 right-0 z-[59] animate-in slide-in-from-top duration-300" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="bg-card border-b border-primary/30 shadow-lg">
        <div className="flex items-start gap-2 px-4 py-2.5">
          <Bell className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground leading-tight truncate">{first.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{first.message}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {hasMore && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="flex items-center gap-0.5 text-[10px] font-medium text-primary px-1.5 py-1 rounded-md hover:bg-primary/10 transition-colors"
              >
                +{notifications.length - 1}
                {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            )}
            {notifications.length > 1 && (
              <button
                onClick={onMarkAllAsRead}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title={t('notifications.markAllRead')}
              >
                <CheckCheck className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => onMarkAsRead(first.id)}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title={t('banners.dismiss')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {expanded && hasMore && (
          <div className="border-t border-border divide-y divide-border">
            {notifications.slice(1).map((n) => (
              <div key={n.id} className="flex items-start gap-2 px-4 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{n.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                </div>
                <button
                  onClick={() => onMarkAsRead(n.id)}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                  title={t('banners.dismiss')}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationBanner;
