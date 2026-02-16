import React, { useEffect, useState } from 'react';
import logoDark from '@/assets/logo-dark.png';
import logoLight from '@/assets/logo-light.png';
import { Button } from '@/components/ui/button';
import { Download, Check, Share } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const Install: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if iOS
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
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
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <span className="text-5xl mb-4">🥁</span>
      <h1 className="text-2xl font-bold text-foreground mb-2">Drum Pads Worship</h1>
      <p className="text-muted-foreground mb-8 max-w-sm">
        Instale o app no seu celular para acesso rápido, tela cheia e uso offline.
      </p>

      {isInstalled ? (
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
            <Check className="h-7 w-7 text-primary" />
          </div>
          <p className="text-foreground font-medium">App já instalado!</p>
          <Button onClick={() => navigate('/')} className="mt-2">
            Abrir App
          </Button>
        </div>
      ) : isIOS ? (
        <div className="flex flex-col items-center gap-4 bg-card p-6 rounded-xl border border-border max-w-sm">
          <Share className="h-8 w-8 text-primary" />
          <div className="space-y-2">
            <p className="text-foreground font-medium">Para instalar no iPhone:</p>
            <ol className="text-sm text-muted-foreground text-left space-y-2">
              <li>1. Toque no botão <strong>Compartilhar</strong> (ícone de quadrado com seta) no Safari</li>
              <li>2. Role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong></li>
              <li>3. Toque em <strong>"Adicionar"</strong></li>
            </ol>
          </div>
          <Button variant="outline" onClick={() => navigate('/')} className="mt-2">
            Voltar ao App
          </Button>
        </div>
      ) : deferredPrompt ? (
        <div className="flex flex-col items-center gap-3">
          <Button onClick={handleInstall} size="lg" className="gap-2">
            <Download className="h-5 w-5" />
            Instalar App
          </Button>
          <Button variant="ghost" onClick={() => navigate('/')} className="text-sm">
            Voltar ao App
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 bg-card p-6 rounded-xl border border-border max-w-sm">
          <p className="text-foreground font-medium">Para instalar:</p>
          <ol className="text-sm text-muted-foreground text-left space-y-2">
            <li>1. Abra o menu do navegador (⋮)</li>
            <li>2. Toque em <strong>"Instalar app"</strong> ou <strong>"Adicionar à tela inicial"</strong></li>
          </ol>
          <p className="text-xs text-muted-foreground mt-2">
            No <strong>Google Chrome</strong>, você também pode tocar em <strong>"Compartilhar"</strong> e depois em <strong>"Adicionar à tela inicial"</strong>.
          </p>
          <Button variant="outline" onClick={() => navigate('/')} className="mt-2">
            Voltar ao App
          </Button>
        </div>
      )}
    </div>
  );
};

export default Install;
