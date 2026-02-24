import React, { useEffect, useState } from 'react';
import logoDark from '@/assets/logo-dark.png';
import logoLight from '@/assets/logo-light.png';
import { Button } from '@/components/ui/button';
import { Download, Check, Share } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const Install: React.FC = () => {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);
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
      <img src={document.documentElement.classList.contains('dark') ? logoLight : logoDark} alt="DPW" className="h-14 w-14 mb-4" />
      <h1 className="text-2xl font-bold text-foreground mb-2">{t('install.title')}</h1>
      <p className="text-muted-foreground mb-8 max-w-sm">{t('install.description')}</p>

      {isInstalled ? (
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
            <Check className="h-7 w-7 text-primary" />
          </div>
          <p className="text-foreground font-medium">{t('install.alreadyInstalled')}</p>
          <Button onClick={() => navigate('/app')} className="mt-2">{t('install.openApp')}</Button>
        </div>
      ) : isIOS ? (
        <div className="flex flex-col items-center gap-4 bg-card p-6 rounded-xl border border-border max-w-sm">
          <Share className="h-8 w-8 text-primary" />
          <div className="space-y-2">
            <p className="text-foreground font-medium">{t('install.iosTitle')}</p>
            <ol className="text-sm text-muted-foreground text-left space-y-2">
              <li dangerouslySetInnerHTML={{ __html: t('install.iosStep1') }} />
              <li dangerouslySetInnerHTML={{ __html: t('install.iosStep2') }} />
              <li dangerouslySetInnerHTML={{ __html: t('install.iosStep3') }} />
            </ol>
          </div>
          <Button variant="outline" onClick={() => navigate('/app')} className="mt-2">{t('install.backToApp')}</Button>
        </div>
      ) : deferredPrompt ? (
        <div className="flex flex-col items-center gap-3">
          <Button onClick={handleInstall} size="lg" className="gap-2">
            <Download className="h-5 w-5" />
            {t('install.installApp')}
          </Button>
          <Button variant="ghost" onClick={() => navigate('/app')} className="text-sm">{t('install.backToApp')}</Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 bg-card p-6 rounded-xl border border-border max-w-sm">
          <p className="text-foreground font-medium">{t('install.manualTitle')}</p>
          <ol className="text-sm text-muted-foreground text-left space-y-2">
            <li dangerouslySetInnerHTML={{ __html: t('install.manualStep1') }} />
            <li dangerouslySetInnerHTML={{ __html: t('install.manualStep2') }} />
          </ol>
          <p className="text-xs text-muted-foreground mt-2" dangerouslySetInnerHTML={{ __html: t('install.manualChrome') }} />
          <Button variant="outline" onClick={() => navigate('/app')} className="mt-2">{t('install.backToApp')}</Button>
        </div>
      )}
    </div>
  );
};

export default Install;
