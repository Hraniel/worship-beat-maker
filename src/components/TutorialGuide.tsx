import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TutorialStep {
  targetSelector: string;
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    targetSelector: '[data-tutorial="pad-grid"]',
    title: '🥁 Pads de Bateria',
    description: 'Toque nos pads para reproduzir sons. Segure um pad para acessar opções como volume, importar som e renomear.',
    position: 'bottom',
  },
  {
    targetSelector: '[data-tutorial="volume-master"]',
    title: '🔊 Volume Master',
    description: 'Controle o volume geral de todos os pads e sons do app.',
    position: 'top',
  },
  {
    targetSelector: '[data-tutorial="metronome"]',
    title: '🎵 Metrônomo',
    description: 'Ajuste o BPM e a fórmula de compasso. Clique para expandir ou minimizar. O áudio continua mesmo minimizado.',
    position: 'top',
  },
  {
    targetSelector: '[data-tutorial="setlist"]',
    title: '📋 Setlist',
    description: 'Salve e organize suas músicas com configurações de BPM e volumes individuais dos pads.',
    position: 'bottom',
  },
  {
    targetSelector: '[data-tutorial="pad-size"]',
    title: '📐 Tamanho dos Pads',
    description: 'Use os botões – e + para ajustar o tamanho dos pads na tela.',
    position: 'bottom',
  },
  {
    targetSelector: '[data-tutorial="focus-mode"]',
    title: '🎯 Modo Foco',
    description: 'Oculta o cabeçalho para ter mais espaço para os pads. Ideal para apresentações ao vivo!',
    position: 'bottom',
  },
];

const TUTORIAL_DONE_KEY = 'drum-pads-tutorial-done';

const TutorialGuide: React.FC = () => {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const currentStep = TUTORIAL_STEPS[step];

  const updateRect = useCallback(() => {
    if (!active || !currentStep) return;
    const el = document.querySelector(currentStep.targetSelector);
    if (el) {
      setRect(el.getBoundingClientRect());
    } else {
      setRect(null);
    }
  }, [active, step, currentStep]);

  useEffect(() => {
    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect);
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect);
    };
  }, [updateRect]);

  const start = useCallback(() => {
    setStep(0);
    setActive(true);
  }, []);

  const close = useCallback(() => {
    setActive(false);
    localStorage.setItem(TUTORIAL_DONE_KEY, 'true');
  }, []);

  const next = useCallback(() => {
    if (step < TUTORIAL_STEPS.length - 1) setStep(s => s + 1);
    else close();
  }, [step, close]);

  const prev = useCallback(() => {
    if (step > 0) setStep(s => s - 1);
  }, [step]);

  // Calculate balloon position
  const getBalloonStyle = (): React.CSSProperties => {
    if (!rect) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

    const pos = currentStep?.position || 'bottom';
    const margin = 12;

    switch (pos) {
      case 'top':
        return {
          bottom: `${window.innerHeight - rect.top + margin}px`,
          left: `${Math.max(16, Math.min(rect.left + rect.width / 2 - 150, window.innerWidth - 316))}px`,
        };
      case 'bottom':
        return {
          top: `${rect.bottom + margin}px`,
          left: `${Math.max(16, Math.min(rect.left + rect.width / 2 - 150, window.innerWidth - 316))}px`,
        };
      case 'left':
        return {
          top: `${rect.top + rect.height / 2 - 60}px`,
          right: `${window.innerWidth - rect.left + margin}px`,
        };
      case 'right':
        return {
          top: `${rect.top + rect.height / 2 - 60}px`,
          left: `${rect.right + margin}px`,
        };
      default:
        return {
          top: `${rect.bottom + margin}px`,
          left: `${Math.max(16, rect.left + rect.width / 2 - 150)}px`,
        };
    }
  };

  if (!active) {
    return (
      <button
        onClick={start}
        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        title="Tutorial"
        data-tutorial="tutorial-btn"
      >
        <HelpCircle className="h-4 w-4" />
      </button>
    );
  }

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-[200] pointer-events-none">
        {/* Dark backdrop with cutout */}
        <div className="absolute inset-0 bg-black/60 pointer-events-auto" onClick={close} />

        {/* Highlight cutout */}
        {rect && (
          <div
            className="absolute rounded-lg border-2 border-primary pointer-events-none"
            style={{
              top: rect.top - 4,
              left: rect.left - 4,
              width: rect.width + 8,
              height: rect.height + 8,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)',
              zIndex: 201,
            }}
          />
        )}

        {/* Balloon */}
        <div
          className="fixed z-[202] w-[300px] bg-card border border-border rounded-xl shadow-2xl p-4 pointer-events-auto animate-in fade-in-0 zoom-in-95 duration-200"
          style={getBalloonStyle()}
        >
          {/* Close */}
          <button
            onClick={close}
            className="absolute top-2 right-2 p-1 rounded-md hover:bg-muted transition-colors"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>

          {/* Content */}
          <h3 className="text-sm font-bold text-foreground mb-1 pr-6">{currentStep?.title}</h3>
          <p className="text-xs text-muted-foreground leading-relaxed mb-3">
            {currentStep?.description}
          </p>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {step + 1} / {TUTORIAL_STEPS.length}
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={prev}
                disabled={step === 0}
                className="h-7 px-2 text-xs"
              >
                <ChevronLeft className="h-3 w-3 mr-0.5" />
                Anterior
              </Button>
              <Button
                size="sm"
                onClick={next}
                className="h-7 px-2 text-xs"
              >
                {step === TUTORIAL_STEPS.length - 1 ? 'Concluir' : 'Próximo'}
                {step < TUTORIAL_STEPS.length - 1 && <ChevronRight className="h-3 w-3 ml-0.5" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TutorialGuide;
