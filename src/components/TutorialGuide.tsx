import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, HelpCircle, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TutorialStep {
  targetSelector: string;
  title: string;
  description: string;
  /** Custom event name to dispatch before showing this step (e.g. to expand a collapsed section) */
  prepareEvent?: string;
}

export interface TutorialSection {
  id: string;
  label: string;
  steps: TutorialStep[];
}

export const TUTORIAL_SECTIONS: TutorialSection[] = [
  {
    id: 'pads',
    label: 'Pads de Bateria',
    steps: [
      {
        targetSelector: '[data-tutorial="pad-grid"]',
        title: 'Pads de Bateria',
        description: 'Toque nos pads para reproduzir sons. Cada pad toca um som diferente de bateria ou percussão.',
      },
      {
        targetSelector: '[data-tutorial="pad-grid"]',
        title: 'Opções do Pad',
        description: 'Segure um pad para acessar opções como volume individual, pan (panorâmica L/R), renomear, alterar cor e efeitos de áudio.',
      },
    ],
  },
  {
    id: 'repertorio',
    label: 'Repertório',
    steps: [
      {
        targetSelector: '[data-tutorial="setlist"]',
        title: 'Repertório',
        description: 'Salve configurações completas por música: BPM, volumes, pans, efeitos e sons customizados.',
      },
      {
        targetSelector: '[data-tutorial="setlist"]',
        title: 'Reordenar Músicas',
        description: 'Arraste as músicas para reordenar. Clique em uma música para carregar suas configurações.',
      },
    ],
  },
  {
    id: 'ambient',
    label: 'Ambient Pads',
    steps: [
      {
        targetSelector: '[data-tutorial="ambient-pads"]',
        title: 'Ambient Pads',
        description: 'Pads de notas sustentadas para criar atmosferas de louvor. Toque para ativar/desativar.',
        prepareEvent: 'tutorial:expand-ambient',
      },
      {
        targetSelector: '[data-tutorial="ambient-pads"]',
        title: 'Controles do Ambient',
        description: 'Use o slider vertical para ajustar o volume e o knob laranja para controlar o pan (panorâmica esquerda/direita).',
        prepareEvent: 'tutorial:expand-ambient',
      },
    ],
  },
  {
    id: 'volume',
    label: 'Volume e Pan Master',
    steps: [
      {
        targetSelector: '[data-tutorial="volume-master"]',
        title: 'Volume Master',
        description: 'Controle o volume geral de todos os pads e sons do app com o slider principal.',
      },
      {
        targetSelector: '[data-tutorial="volume-master"]',
        title: 'Pan Master',
        description: 'O knob laranja ao lado do volume master direciona todo o áudio para esquerda (L) ou direita (R). Gire para ajustar a panorâmica geral.',
      },
    ],
  },
  {
    id: 'metronomo',
    label: 'Metrônomo',
    steps: [
      {
        targetSelector: '[data-tutorial="metronome"]',
        title: 'Metrônomo',
        description: 'Ajuste o BPM com o slider ou botões +/–. Escolha a fórmula de compasso (4/4, 3/4, 6/8). Clique para expandir ou minimizar.',
        prepareEvent: 'tutorial:expand-metronome',
      },
      {
        targetSelector: '[data-tutorial="pan-metronome"]',
        title: 'Pan do Metrônomo',
        description: 'O knob laranja direciona o clique do metrônomo para esquerda (L) ou direita (R). Útil para ouvir o metrônomo separado da banda no retorno.',
        prepareEvent: 'tutorial:expand-metronome',
      },
    ],
  },
  {
    id: 'pan',
    label: 'Pan (Panorâmica)',
    steps: [
      {
        targetSelector: '[data-tutorial="volume-master"]',
        title: 'O que é Pan?',
        description: 'Pan (panorâmica) controla a direção do som entre os lados esquerdo (L) e direito (R) do áudio. Útil para separar instrumentos no retorno.',
      },
      {
        targetSelector: '[data-tutorial="volume-master"]',
        title: 'Pan Master',
        description: 'O knob laranja ao lado do volume master move TODO o áudio do app para L ou R. Dê um duplo clique ou segure para resetar ao centro.',
      },
      {
        targetSelector: '[data-tutorial="pan-metronome"]',
        title: 'Pan do Metrônomo',
        description: 'Mova o clique do metrônomo para um lado só. Ex: metrônomo no ouvido esquerdo, música no direito.',
        prepareEvent: 'tutorial:expand-metronome',
      },
      {
        targetSelector: '[data-tutorial="pad-grid"]',
        title: 'Pan Individual dos Pads',
        description: 'Segure um pad para abrir o menu. O controle de pan individual direciona apenas aquele pad para L ou R. Recurso PRO.',
      },
      {
        targetSelector: '[data-tutorial="ambient-pads"]',
        title: 'Pan do Ambient',
        description: 'O knob de pan nos Ambient Pads direciona as notas sustentadas para L ou R independentemente dos outros sons. Recurso MASTER.',
        prepareEvent: 'tutorial:expand-ambient',
      },
    ],
  },
  {
    id: 'edicao',
    label: 'Modo Edição',
    steps: [
      {
        targetSelector: '[data-tutorial="pad-grid"]',
        title: 'Modo Edição',
        description: 'Ative o Modo Edição no menu (ícone de engrenagem) para acessar as configurações de cada pad com um único toque, sem precisar segurar.',
      },
      {
        targetSelector: '[data-tutorial="pad-grid"]',
        title: 'Tamanho dos Pads',
        description: 'No modo edição, use os botões – e + no cabeçalho para ajustar o tamanho dos pads na tela.',
      },
    ],
  },
  {
    id: 'foco',
    label: 'Modo Foco',
    steps: [
      {
        targetSelector: '[data-tutorial="focus-mode"]',
        title: 'Modo Foco',
        description: 'Oculta o cabeçalho para maximizar o espaço dos pads. Ideal para apresentações ao vivo! Os Ambient Pads continuam acessíveis.',
      },
    ],
  },
];

// Flatten all steps for the "complete tour" mode
const ALL_STEPS = TUTORIAL_SECTIONS.flatMap(s => s.steps);

interface TutorialGuideProps {
  externalTrigger?: boolean;
  onStartRef?: (startFn: (sectionId?: string) => void) => void;
}

const TutorialGuide: React.FC<TutorialGuideProps> = ({ externalTrigger, onStartRef }) => {
  const [active, setActive] = useState(false);
  const [steps, setSteps] = useState<TutorialStep[]>(ALL_STEPS);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const currentStep = steps[step];

  // Dispatch prepare event and wait a tick for DOM to update
  const prepareStep = useCallback((s: TutorialStep) => {
    if (s.prepareEvent) {
      window.dispatchEvent(new CustomEvent(s.prepareEvent));
    }
  }, []);

  const updateRect = useCallback(() => {
    if (!active || !currentStep) return;
    const el = document.querySelector(currentStep.targetSelector);
    if (el) {
      setRect(el.getBoundingClientRect());
    } else {
      setRect(null);
    }
  }, [active, step, currentStep]);

  // When step changes, prepare and then update rect
  useEffect(() => {
    if (!active || !currentStep) return;
    prepareStep(currentStep);
    // Wait for DOM to update after prepare event
    const timer = setTimeout(updateRect, 150);
    return () => clearTimeout(timer);
  }, [active, step, currentStep, prepareStep, updateRect]);

  useEffect(() => {
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect);
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect);
    };
  }, [updateRect]);

  const start = useCallback((sectionId?: string) => {
    if (sectionId) {
      const section = TUTORIAL_SECTIONS.find(s => s.id === sectionId);
      if (section) {
        setSteps(section.steps);
      } else {
        setSteps(ALL_STEPS);
      }
    } else {
      setSteps(ALL_STEPS);
    }
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
    if (step < steps.length - 1) setStep(s => s + 1);
    else close();
  }, [step, steps.length, close]);

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
          <div className="fixed inset-0 z-[200] bg-black/60" onClick={close} />
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
                {step + 1} / {steps.length}
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
                  {step === steps.length - 1 ? 'Concluir' : 'Próximo'}
                  {step < steps.length - 1 && <ChevronRight className="h-3 w-3 ml-0.5" />}
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
          onClick={() => start()}
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
