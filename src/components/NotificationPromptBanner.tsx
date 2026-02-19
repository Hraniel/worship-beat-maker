import React, { useState } from 'react';
import { Bell, BellRing, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  requestPushPermission,
  subscribeToPush,
} from '@/lib/push-notifications';

interface NotificationPromptBannerProps {
  onDismiss: () => void;
}

const NotificationPromptBanner: React.FC<NotificationPromptBannerProps> = ({ onDismiss }) => {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleActivate = async () => {
    setLoading(true);
    try {
      const granted = await requestPushPermission();
      if (granted) {
        await subscribeToPush();
        setDone(true);
        setTimeout(onDismiss, 1800);
      } else {
        onDismiss();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-card border border-border rounded-2xl shadow-2xl p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {done
              ? <BellRing className="h-5 w-5 text-primary shrink-0" />
              : <Bell className="h-5 w-5 text-primary shrink-0" />
            }
            <p className="text-sm font-semibold text-foreground">
              {done ? '🎉 Notificações ativas!' : 'Receba avisos do Glory Pads'}
            </p>
          </div>
          {!done && (
            <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {!done && (
          <>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Ative as notificações para receber novidades, atualizações de packs e comunicados da equipe — mesmo com o app fechado.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 h-8 text-xs gap-1.5"
                onClick={handleActivate}
                disabled={loading}
              >
                {loading
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Bell className="h-3.5 w-3.5" />
                }
                Ativar agora
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="flex-1 h-8 text-xs text-muted-foreground"
                onClick={onDismiss}
              >
                Agora não
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default NotificationPromptBanner;
