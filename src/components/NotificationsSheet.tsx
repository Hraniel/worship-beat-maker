import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, X, Download, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { AdminNotification } from '@/hooks/useUserNotifications';
import PwaInstallDialog from '@/components/PwaInstallDialog';

interface NotificationsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notifications: AdminNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
}

const PWA_INSTALL_DISMISSED_KEY = 'gp_pwa_install_dismissed';

const NotificationsSheet: React.FC<NotificationsSheetProps> = ({
  open,
  onOpenChange,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
}) => {
  const { t } = useTranslation();
  const [showPwaNotif, setShowPwaNotif] = useState(false);
  const [pwaDialogOpen, setPwaDialogOpen] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const dismissed = localStorage.getItem(PWA_INSTALL_DISMISSED_KEY);
    setShowPwaNotif(!isStandalone && !dismissed);
  }, []);

  const dismissPwaNotif = () => {
    localStorage.setItem(PWA_INSTALL_DISMISSED_KEY, '1');
    setShowPwaNotif(false);
  };

  const handlePwaClick = () => {
    setPwaDialogOpen(true);
  };

  const allNotifications = notifications;
  const totalCount = allNotifications.length + (showPwaNotif ? 1 : 0);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-[320px] sm:w-[380px] p-0" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
          <SheetHeader className="px-4 py-3 border-b border-border">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-sm font-semibold flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notificações
              </SheetTitle>
              <div className="flex items-center gap-1">
                {totalCount > 1 && (
                  <button
                    onClick={() => {
                      onMarkAllAsRead();
                      dismissPwaNotif();
                    }}
                    className="flex items-center gap-1 text-[10px] font-medium text-primary hover:bg-primary/10 px-2 py-1 rounded-md transition-colors"
                  >
                    <CheckCheck className="h-3 w-3" />
                    Marcar todas
                  </button>
                )}
                {totalCount > 0 && (
                  <button
                    onClick={() => {
                      onMarkAllAsRead();
                      dismissPwaNotif();
                    }}
                    className="flex items-center gap-1 text-[10px] font-medium text-destructive hover:bg-destructive/10 px-2 py-1 rounded-md transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                    Apagar todas
                  </button>
                )}
              </div>
            </div>
          </SheetHeader>
          <div className="overflow-y-auto max-h-[calc(100vh-80px)]">
            {totalCount === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Bell className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">Nenhuma notificação</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {/* PWA Install Notification */}
                {showPwaNotif && (
                  <div
                    className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={handlePwaClick}
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                      <Download className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">Instale o Glory Pads 📲</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Adicione o app à sua tela inicial para acesso rápido, tela cheia e uso offline. Toque para ver como!
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        dismissPwaNotif();
                      }}
                      className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                      title="Dispensar"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {/* Admin Notifications */}
                {allNotifications.map((n) => (
                  <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
                    <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {new Date(n.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <button
                      onClick={() => onMarkAsRead(n.id)}
                      className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                      title="Marcar como lida"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <PwaInstallDialog open={pwaDialogOpen} onOpenChange={setPwaDialogOpen} />
    </>
  );
};

export default NotificationsSheet;
