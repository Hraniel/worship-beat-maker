import React, { useEffect, useState } from 'react';
import { Download, Share, MoreVertical, Check, Smartphone } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PwaInstallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PwaInstallDialog: React.FC<PwaInstallDialogProps> = ({ open, onOpenChange }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>('desktop');

  useEffect(() => {
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua)) {
      setPlatform('ios');
    } else if (/Android/.test(ua)) {
      setPlatform('android');
    } else {
      setPlatform('desktop');
    }

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstalled(true);
      localStorage.setItem('gp_pwa_install_dismissed', '1');
    }
    setDeferredPrompt(null);
  };

  if (installed) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <div className="flex flex-col items-center py-6 gap-3">
            <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
              <Check className="h-7 w-7 text-primary" />
            </div>
            <p className="text-foreground font-semibold text-center">App já instalado! ✅</p>
            <p className="text-sm text-muted-foreground text-center">Você já está usando o Glory Pads como app.</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Smartphone className="h-5 w-5 text-primary" />
            Instalar Glory Pads
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Instale o app no seu dispositivo para acesso rápido, tela cheia e uso offline.
        </p>

        {/* Native install prompt (Chrome/Edge on Android/Desktop) */}
        {deferredPrompt && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium text-foreground">Instalação rápida</p>
            <Button onClick={handleInstall} className="w-full gap-2">
              <Download className="h-4 w-4" />
              Instalar agora
            </Button>
          </div>
        )}

        {/* iOS Instructions */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">🍎</div>
            <p className="text-sm font-semibold text-foreground">iPhone / iPad (Safari)</p>
          </div>
          <ol className="text-sm text-muted-foreground space-y-1.5 pl-8 list-decimal">
            <li>Toque no botão <strong className="text-foreground">Compartilhar</strong> <Share className="inline h-3.5 w-3.5" /> na barra do Safari</li>
            <li>Role para baixo e toque em <strong className="text-foreground">"Adicionar à Tela de Início"</strong></li>
            <li>Toque em <strong className="text-foreground">"Adicionar"</strong></li>
          </ol>
        </div>

        {/* Android Instructions */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">🤖</div>
            <p className="text-sm font-semibold text-foreground">Android (Chrome)</p>
          </div>
          <ol className="text-sm text-muted-foreground space-y-1.5 pl-8 list-decimal">
            <li>Toque no menu <strong className="text-foreground">⋮</strong> (três pontos) no canto superior</li>
            <li>Toque em <strong className="text-foreground">"Instalar aplicativo"</strong> ou <strong className="text-foreground">"Adicionar à tela inicial"</strong></li>
            <li>Confirme tocando em <strong className="text-foreground">"Instalar"</strong></li>
          </ol>
        </div>

        {/* Desktop Instructions */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">💻</div>
            <p className="text-sm font-semibold text-foreground">Desktop (Chrome / Edge)</p>
          </div>
          <ol className="text-sm text-muted-foreground space-y-1.5 pl-8 list-decimal">
            <li>Clique no ícone de <strong className="text-foreground">instalar</strong> <Download className="inline h-3.5 w-3.5" /> na barra de endereço</li>
            <li>Ou abra o menu <MoreVertical className="inline h-3.5 w-3.5" /> e clique em <strong className="text-foreground">"Instalar Glory Pads"</strong></li>
          </ol>
        </div>

        {/* Samsung Browser */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">🌐</div>
            <p className="text-sm font-semibold text-foreground">Samsung Internet</p>
          </div>
          <ol className="text-sm text-muted-foreground space-y-1.5 pl-8 list-decimal">
            <li>Toque no menu <strong className="text-foreground">≡</strong> (três linhas)</li>
            <li>Toque em <strong className="text-foreground">"Adicionar à Tela inicial"</strong></li>
          </ol>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PwaInstallDialog;
