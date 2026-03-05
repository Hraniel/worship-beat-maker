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
        description: 'Toque nos pads para reproduzir sons. Cada pad toca um som diferente de bateria, percussão ou loop.',
      },
      {
        targetSelector: '[data-tutorial="pad-grid"]',
        title: 'Opções do Pad',
        description: 'Segure um pad para acessar opções: volume individual, pan (L/R), renomear, alterar cor, efeitos de áudio (EQ, Reverb, Delay) e importar sons da Glory Store.',
      },
      {
        targetSelector: '[data-tutorial="pad-grid"]',
        title: 'Loops',
        description: 'Os pads WSP e WFL são loops rítmicos. Toque para ativar/desativar. Eles sincronizam automaticamente com o BPM do metrônomo. Também funcionam via MIDI.',
      },
    ],
  },
  {
    id: 'repertorio',
    label: 'Repertório',
    steps: [
      {
        targetSelector: '[data-tutorial="setlist"]',
        title: 'Eventos Programados',
        description: 'Crie eventos (ex: Culto Domingo) com data e adicione músicas ao repertório. Cada evento organiza suas músicas para a programação.',
      },
      {
        targetSelector: '[data-tutorial="setlist"]',
        title: 'Músicas por Evento',
        description: 'Cada música salva BPM, tom, volumes, pans, efeitos, sons customizados e mapeamentos MIDI. Tudo é restaurado ao carregar a música.',
      },
      {
        targetSelector: '[data-tutorial="setlist"]',
        title: 'Navegação entre Músicas',
        description: 'Use os botões ◀ ▶ no cabeçalho para navegar entre músicas do evento ativo. Também funciona via MIDI CC.',
      },
      {
        targetSelector: '[data-tutorial="setlist"]',
        title: 'Evento Persistente',
        description: 'O último evento selecionado permanece ativo mesmo ao sair e voltar ao app. Ao abrir o repertório, ele aparece expandido com suas músicas.',
      },
    ],
  },
  {
    id: 'ambient',
    label: 'Continuous Pads',
    steps: [
      {
        targetSelector: '[data-tutorial="ambient-pads"]',
        title: 'Continuous Pads',
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
    id: 'audio-settings',
    label: 'Configurações de Áudio',
    steps: [
      {
        targetSelector: '[data-tutorial="audio-output"]',
        title: 'Saída de Áudio',
        description: 'Escolha o dispositivo de saída (placa de áudio, interface USB, fone). Disponível para todos os planos.',
        prepareEvent: 'tutorial:open-settings-audio',
      },
      {
        targetSelector: '[data-tutorial="audio-stereo-pan"]',
        title: 'Stereo / Mono e Pan',
        description: 'Defina se Pads, Continuous Pads e Metrônomo tocam em Stereo ou Mono, e direcione para L ou R. Recurso exclusivo do plano Pro.',
        prepareEvent: 'tutorial:open-settings-audio',
      },
    ],
  },
  {
    id: 'volume',
    label: 'Volume e Pan Master',
    steps: [
      {
        targetSelector: '[data-tutorial="volume-master"]',
        title: 'Mixer de Faders',
        description: 'Controle volumes individuais de cada pad, metrônomo, continuous pads e master. Navegue entre as páginas 1, 2 e 3 do mixer.',
      },
      {
        targetSelector: '[data-tutorial="volume-master"]',
        title: 'Pan Master',
        description: 'O knob laranja direciona todo o áudio para esquerda (L) ou direita (R). Útil para separar instrumentos no retorno.',
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
        description: 'Ajuste o BPM com slider, botões +/– ou clicando diretamente no número. Escolha compasso (4/4, 3/4, 6/8). O tom da música aparece ao lado.',
        prepareEvent: 'tutorial:expand-metronome',
      },
      {
        targetSelector: '[data-tutorial="metronome"]',
        title: 'Sync & Tom',
        description: 'O botão Sync sincroniza os pads com o grid rítmico. O campo Tom permite editar a tonalidade da música que é salva automaticamente.',
        prepareEvent: 'tutorial:expand-metronome',
      },
      {
        targetSelector: '[data-tutorial="pan-metronome"]',
        title: 'Pan do Metrônomo',
        description: 'O knob laranja direciona o clique do metrônomo para L ou R. Útil para ouvir separado da banda no retorno.',
        prepareEvent: 'tutorial:expand-metronome',
      },
    ],
  },
  {
    id: 'midi',
    label: 'MIDI',
    steps: [
      {
        targetSelector: '[data-tutorial="pad-grid"]',
        title: 'Controlador MIDI',
        description: 'Conecte um controlador MIDI USB ou Bluetooth. Mapeie notas para pads e CCs para funções como volume, BPM e navegação de músicas.',
      },
      {
        targetSelector: '[data-tutorial="pad-grid"]',
        title: 'Mapeamento por Música',
        description: 'Os mapeamentos MIDI (notas, CCs, canais) são salvos individualmente por música. Ao trocar de música, os mapeamentos são restaurados automaticamente.',
      },
    ],
  },
  {
    id: 'effects',
    label: 'Efeitos de Áudio',
    steps: [
      {
        targetSelector: '[data-tutorial="pad-grid"]',
        title: 'EQ, Reverb e Delay',
        description: 'Segure um pad para abrir os efeitos: EQ de 3 bandas, Reverb e Delay com sync ao BPM. Recurso exclusivo do plano Master.',
      },
      {
        targetSelector: '[data-tutorial="pad-grid"]',
        title: 'Delay Sincronizado',
        description: 'Ative "Sync BPM" no delay para sincronizar automaticamente o tempo do delay com o metrônomo. Escolha subdivisões musicais (1/4, 1/8, etc).',
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
        description: 'Ative no menu para acessar configurações de cada pad com um toque, sem precisar segurar. Ajuste tamanho dos pads com – e +.',
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
        description: 'Oculta o cabeçalho para maximizar os pads. Ideal para apresentações ao vivo! Metrônomo e Continuous Pads continuam acessíveis.',
      },
    ],
  },
  {
    id: 'store',
    label: 'Glory Store',
    steps: [
      {
        targetSelector: '[data-tutorial="pad-grid"]',
        title: 'Glory Store',
        description: 'Acesse a loja pelo menu ou pela aba Loja. Adquira packs de sons profissionais e importe diretamente para seus pads. É necessário estar logado para comprar.',
      },
    ],
  },
];

// Flatten all steps for the "complete tour" mode
const ALL_STEPS = TUTORIAL_SECTIONS.flatMap(s => s.steps);

interface TutorialGuideProps {
  externalTrigger?: boolean;
  onStartRef?: (startFn: (sectionId?: string) => void) => void;
  onClose?: () => void;
}

const TutorialGuide: React.FC<TutorialGuideProps> = ({ externalTrigger, onStartRef, onClose }) => {
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
    onClose?.();
  }, [onClose]);

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
