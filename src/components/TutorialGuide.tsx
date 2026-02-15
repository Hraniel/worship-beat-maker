import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TutorialStep {
  targetSelector: string;
  title: string;
  description: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    targetSelector: '[data-tutorial="pad-grid"]',
    title: '🥁 Pads de Bateria',
    description: 'Toque nos pads para reproduzir sons. Segure um pad para acessar opções como volume, importar som e renomear.',
  },
  {
    targetSelector: '[data-tutorial="volume-master"]',
    title: '🔊 Volume Master',
    description: 'Controle o volume geral de todos os pads e sons do app.',
  },
  {
    targetSelector: '[data-tutorial="metronome"]',
    title: '🎵 Metrônomo',
    description: 'Ajuste o BPM e a fórmula de compasso. Clique para expandir ou minimizar. O áudio continua mesmo minimizado.',
  },
  {
    targetSelector: '[data-tutorial="setlist"]',
    title: '📋 Setlist',
    description: 'Salve e organize suas músicas com configurações de BPM e volumes individuais dos pads.',
  },
  {
    targetSelector: '[data-tutorial="pad-size"]',
    title: '📐 Tamanho dos Pads',
    description: 'Use os botões – e + para ajustar o tamanho dos pads na tela.',
  },
  {
    targetSelector: '[data-tutorial="focus-mode"]',
    title: '🎯 Modo Foco',
    description: 'Oculta o cabeçalho para ter mais espaço para os pads. Ideal para apresentações ao vivo!',
  },
];

interface TutorialGuideProps {
  externalTrigger?: boolean;
  onStartRef?: (startFn: () => void) => void;
}

const TutorialGuide: React.FC<TutorialGuideProps> = ({ externalTrigger, onStartRef }) => {
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

  useEffect(() => {
    if (onStartRef) onStartRef(start);
  }, [onStartRef, start]);

  const close = useCallback(() => {
    setActive(false);
  }, []);

  const next = useCallback(() => {
    if (step < TUTORIAL_STEPS.length - 1) setStep(s => s + 1);
    else close();
  }, [step, close]);

  const prev = useCallback(() => {
    if (step > 0) setStep(s => s - 1);
  }, [step]);

  const getBalloonStyle = (): React.CSSProperties => {
    if (!rect) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

    const balloonH = 160;
    const balloonW = 300;
    const margin = 12;
    const centerX = Math.max(16, Math.min(rect.left + rect.width / 2 - balloonW / 2, window.innerWidth - balloonW - 16));

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    if (spaceBelow >= balloonH + margin) {
      return { top: `${rect.bottom + margin}px`, left: `${centerX}px` };
    }
    if (spaceAbove >= balloonH + margin) {
      return { bottom: `${window.innerHeight - rect.top + margin}px`, left: `${centerX}px` };
    }
    return {
      top: `${Math.max(16, Math.min(rect.top + rect.height / 2 - balloonH / 2, window.innerHeight - balloonH - 16))}px`,
      left: `${centerX}px`,
    };
  };

  const overlay = active
    ? createPortal(
        <>
          {/* Dark backdrop */}
          <div className="fixed inset-0 z-[200] bg-black/60" onClick={close} />

          {/* Highlight */}
          {rect && (
            <div
              className="fixed rounded-lg border-2 border-primary z-[201] pointer-events-none"
              style={{
                top: rect.top - 4,
                left: rect.left - 4,
                width: rect.width + 8,
                height: rect.height + 8,
                boxShadow: '0 0 0 4px hsl(var(--primary) / 0.3)',
              }}
            />
          )}

          {/* Balloon */}
          <div
            className="fixed z-[202] w-[300px] bg-card border border-border rounded-xl shadow-2xl p-4 animate-in fade-in-0 zoom-in-95 duration-200"
            style={getBalloonStyle()}
          >
            <button
              onClick={close}
              className="absolute top-2 right-2 p-1 rounded-md hover:bg-muted transition-colors"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>

            <h3 className="text-sm font-bold text-foreground mb-1 pr-6">{currentStep?.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              {currentStep?.description}
            </p>

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
        </>,
        document.body
      )
    : null;

  return (
    <>
      {!externalTrigger && (
        <button
          onClick={start}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Tutorial"
        >
          <HelpCircle className="h-4 w-4" />
        </button>
      )}
      {overlay}
    </>
  );
};

export default TutorialGuide;
