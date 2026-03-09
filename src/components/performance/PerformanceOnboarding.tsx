import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, Radio, List, Share2, Music, Vibrate, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

const STORAGE_KEY = 'glory-performance-onboarding-done';

interface PerformanceOnboardingProps {
  onClose: () => void;
}

const steps = [
  {
    icon: Play,
    titleKey: 'performance.onboarding.welcomeTitle',
    descKey: 'performance.onboarding.welcomeDesc',
    fallbackTitle: 'Modo Performance',
    fallbackDesc: 'Tela de palco otimizada para apresentações ao vivo. Visualize BPM, tom e navegue entre músicas com swipe ou teclado.',
  },
  {
    icon: Radio,
    titleKey: 'performance.onboarding.cuesTitle',
    descKey: 'performance.onboarding.cuesDesc',
    fallbackTitle: 'Sinais ao Vivo (Live Cues)',
    fallbackDesc: 'Envie sinais visuais em tempo real para sua equipe: Refrão, Verso, Ponte, Sobe, Desce, Corta e Adoração. Personalize os nomes nas configurações.',
  },
  {
    icon: List,
    titleKey: 'performance.onboarding.songListTitle',
    descKey: 'performance.onboarding.songListDesc',
    fallbackTitle: 'Lista de Músicas',
    fallbackDesc: 'Toque no ícone de lista para ver e reordenar todas as músicas. A música ativa é destacada e a ordem é sincronizada em tempo real.',
  },
  {
    icon: Share2,
    titleKey: 'performance.onboarding.shareTitle',
    descKey: 'performance.onboarding.shareDesc',
    fallbackTitle: 'Compartilhar com a Equipe',
    fallbackDesc: 'Selecione um evento público e compartilhe o link. Sua equipe verá o repertório, sinais e música em destaque ao vivo, sem precisar atualizar.',
  },
  {
    icon: Vibrate,
    titleKey: 'performance.onboarding.tipsTitle',
    descKey: 'performance.onboarding.tipsDesc',
    fallbackTitle: 'Dicas',
    fallbackDesc: 'Use setas do teclado ou swipe para navegar. Espaço inicia/para o metrônomo. Ative vibração e som nos sinais via Configurações > Performance.',
  },
];

const PerformanceOnboarding: React.FC<PerformanceOnboardingProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const current = steps[step];

  const handleClose = () => {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch {}
    onClose();
  };

  const next = () => {
    if (step < steps.length - 1) setStep(s => s + 1);
    else handleClose();
  };

  const prev = () => {
    if (step > 0) setStep(s => s - 1);
  };

  const Icon = current.icon;

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center" style={{ background: 'hsl(240 10% 4% / 0.95)' }}>
      <div className="relative w-[340px] max-w-[90vw] bg-card border border-border rounded-2xl shadow-2xl p-6 animate-in fade-in-0 zoom-in-95 duration-300">
        <button onClick={handleClose} className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-muted transition-colors">
          <X className="h-4 w-4 text-muted-foreground" />
        </button>

        <div className="flex flex-col items-center text-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-primary/20 flex items-center justify-center">
            <Icon className="h-7 w-7 text-primary" />
          </div>

          <div>
            <h3 className="text-base font-bold text-foreground mb-1.5">
              {t(current.titleKey, current.fallbackTitle)}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t(current.descKey, current.fallbackDesc)}
            </p>
          </div>

          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? 'w-5 bg-primary' : 'w-1.5 bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2 w-full">
            {step > 0 && (
              <Button variant="outline" size="sm" onClick={prev} className="flex-1 h-9 text-xs">
                <ChevronLeft className="h-3 w-3 mr-1" />
                {t('common.previous', 'Anterior')}
              </Button>
            )}
            <Button size="sm" onClick={next} className="flex-1 h-9 text-xs">
              {step === steps.length - 1
                ? t('common.start', 'Começar')
                : t('common.next', 'Próximo')}
              {step < steps.length - 1 && <ChevronRight className="h-3 w-3 ml-1" />}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export function shouldShowPerformanceOnboarding(): boolean {
  try { return !localStorage.getItem(STORAGE_KEY); } catch { return false; }
}

export default PerformanceOnboarding;
