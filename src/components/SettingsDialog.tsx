import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Headphones, Crown, HelpCircle, Info, Bell, BellOff, BellRing, Loader2, ChevronRight, ArrowLeft, Timer, Pencil, FileAudio, ChevronDown, ChevronUp, Piano, AudioLines } from 'lucide-react';
import {
  isOutputSelectionSupported,
  getAudioOutputDevices,
  getSavedOutputDeviceId,
  setAudioOutputDevice,
} from '@/lib/audio-engine';
import MidiSettings from '@/components/MidiSettings';
import type { MidiChannel, MidiDevice, CCFunctionId } from '@/lib/midi-engine';
import { useNavigate } from 'react-router-dom';
import { TUTORIAL_SECTIONS } from '@/components/TutorialGuide';
import type { PadSound } from '@/lib/sounds';
import { isTapAutoApplyEnabled, setTapAutoApply, getTapAutoApplyTimeout, setTapAutoApplyTimeout, getTapRedirectTarget, setTapRedirectTarget, type TapRedirectTarget } from '@/components/ToolsPanel';
import { useIsMobile, useIsLandscape } from '@/hooks/use-mobile';
import {
  isPushSupported,
  getPushPermission,
  requestPushPermission,
  subscribeToPush,
  unsubscribeFromPush,
  isSubscribed,
} from '@/lib/push-notifications';

const SETTINGS_KEY = 'drum-pads-audio-settings';

export interface AudioSettings {
  padsStereo: 'stereo' | 'mono';
  padsSide: 'left' | 'right' | null;
  ambientStereo: 'stereo' | 'mono';
  ambientSide: 'left' | 'right' | null;
  metronomeStereo: 'stereo' | 'mono';
  metronomeSide: 'left' | 'right' | null;
}

const defaultSettings: AudioSettings = {
  padsStereo: 'stereo',
  padsSide: null,
  ambientStereo: 'stereo',
  ambientSide: null,
  metronomeStereo: 'stereo',
  metronomeSide: null,
};

export function loadAudioSettings(): AudioSettings {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    if (data) return { ...defaultSettings, ...JSON.parse(data) };
  } catch {}
  return defaultSettings;
}

function saveAudioSettings(settings: AudioSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAudioSettingsChange?: (settings: AudioSettings) => void;
  onStartTutorial?: (sectionId?: string) => void;
  initialTab?: string;
  // Pad config data
  pads?: PadSound[];
  padNames?: Record<string, string>;
  customSounds?: Record<string, string>;
  padsStereoMode?: 'stereo' | 'mono';
  padsSide?: 'left' | 'right' | null;
  onRenamePad?: (padId: string, name: string) => void;
  // MIDI props
  midiSupported?: boolean;
  midiDevices?: MidiDevice[];
  midiChannel?: MidiChannel;
  midiMappings?: Record<number, string>;
  midiIsLearning?: boolean;
  midiLearnPadId?: string | null;
  onMidiSetChannel?: (ch: MidiChannel) => void;
  onMidiStartLearn?: (padId: string) => void;
  onMidiStopLearn?: () => void;
  onMidiResetMappings?: () => void;
  midiCCMappings?: Record<number, CCFunctionId>;
  midiIsCCLearning?: boolean;
  midiCCLearnFunctionId?: CCFunctionId | null;
  onMidiStartCCLearn?: (functionId: CCFunctionId) => void;
  onMidiStopCCLearn?: () => void;
  onMidiResetCCMappings?: () => void;
}

interface StereoOptionProps {
  id: string;
  label: string;
  mode: 'stereo' | 'mono';
  side: 'left' | 'right' | null;
  onModeChange: (v: 'stereo' | 'mono') => void;
  onSideChange: (v: 'left' | 'right') => void;
}

const StereoOption: React.FC<StereoOptionProps> = ({ id, label, mode, side, onModeChange, onSideChange }) => (
  <div className="rounded-lg border border-border bg-card p-4 space-y-3 w-full">
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <div className="flex rounded-md overflow-hidden border border-border shrink-0">
        <button
          onClick={() => onModeChange('stereo')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            mode === 'stereo'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted'
          }`}
        >
          Stereo
        </button>
        <button
          onClick={() => onModeChange('mono')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-l border-border ${
            mode === 'mono'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted'
          }`}
        >
          Mono
        </button>
      </div>
    </div>

    {mode === 'stereo' && (
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground shrink-0">Direcionar para:</span>
        <div className="flex rounded-md overflow-hidden border border-border">
          <button
            onClick={() => onSideChange('left')}
            className={`px-4 py-1.5 text-xs font-bold transition-colors ${
              side === 'left'
                ? 'bg-accent text-accent-foreground'
                : 'bg-muted/30 text-muted-foreground hover:bg-muted'
            }`}
          >
            L
          </button>
          <button
            onClick={() => onSideChange('right')}
            className={`px-4 py-1.5 text-xs font-bold transition-colors border-l border-border ${
              side === 'right'
                ? 'bg-accent text-accent-foreground'
                : 'bg-muted/30 text-muted-foreground hover:bg-muted'
            }`}
          >
            R
          </button>
        </div>
      </div>
    )}

    {mode === 'mono' && (
      <p className="text-xs text-muted-foreground/70 italic">Pan bloqueado no centro</p>
    )}
  </div>
);

// ── Audio Output Device Selector ──────────────────────────────────────────

function AudioOutputSelector() {
  const [supported, setSupported] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedId, setSelectedId] = useState<string>('default');
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    const sup = isOutputSelectionSupported();
    setSupported(sup);
    if (!sup) {
      setLoading(false);
      return;
    }

    const saved = getSavedOutputDeviceId();
    if (saved) setSelectedId(saved);

    getAudioOutputDevices().then((devs) => {
      setDevices(devs);
      setLoading(false);
    });

    // Listen for device changes
    const handleChange = () => {
      getAudioOutputDevices().then(setDevices);
    };
    navigator.mediaDevices?.addEventListener('devicechange', handleChange);
    return () => navigator.mediaDevices?.removeEventListener('devicechange', handleChange);
  }, []);

  const handleSelect = async (deviceId: string) => {
    setSwitching(true);
    const ok = await setAudioOutputDevice(deviceId);
    if (ok) {
      setSelectedId(deviceId);
    }
    setSwitching(false);
  };

  if (!supported) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 space-y-2 w-full">
        <div className="flex items-center gap-2">
          <AudioLines className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Saída de Áudio</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Seleção de dispositivo de saída não é suportada neste navegador.
          Use o Chrome 110+ para esta funcionalidade.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 flex items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3 w-full">
      <div className="flex items-center gap-2">
        <AudioLines className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Saída de Áudio</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Escolha o dispositivo de saída (placa de áudio, interface USB, fone etc.)
      </p>
      <div className="space-y-1">
        {devices.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-2">Nenhum dispositivo encontrado</p>
        ) : (
          devices.map((dev) => {
            const isActive = selectedId === dev.deviceId || (selectedId === 'default' && dev.deviceId === '');
            return (
              <button
                key={dev.deviceId || 'default'}
                onClick={() => handleSelect(dev.deviceId || 'default')}
                disabled={switching}
                className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-left transition-colors ${
                  isActive
                    ? 'bg-primary/10 border border-primary/30 text-foreground'
                    : 'hover:bg-muted/50 border border-transparent text-muted-foreground'
                } ${switching ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-primary' : 'bg-muted'}`} />
                <span className="text-xs font-medium truncate flex-1">
                  {dev.label || `Dispositivo ${dev.deviceId.slice(0, 8)}`}
                </span>
                {isActive && switching && <Loader2 className="h-3 w-3 animate-spin text-primary shrink-0" />}
              </button>
            );
          })
        )}
      </div>
      <button
        onClick={() => getAudioOutputDevices().then(setDevices)}
        className="text-xs text-primary hover:underline"
      >
        Atualizar lista
      </button>
    </div>
  );
}

// ── Push Notification Settings ──────────────────────────────────────────────

function NotificationSettings() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    async function init() {
      const sup = await isPushSupported();
      setSupported(sup);
      if (sup) {
        const perm = await getPushPermission();
        setPermission(perm);
        if (perm === 'granted') {
          setSubscribed(await isSubscribed());
        }
      }
      setLoading(false);
    }
    init();
  }, []);

  const handleToggle = async () => {
    setToggling(true);
    try {
      if (subscribed) {
        await unsubscribeFromPush();
        setSubscribed(false);
      } else {
        if (permission !== 'granted') {
          const granted = await requestPushPermission();
          if (!granted) {
            setPermission('denied');
            setToggling(false);
            return;
          }
          setPermission('granted');
        }
        const ok = await subscribeToPush();
        setSubscribed(ok);
      }
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!supported) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <BellOff className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Notificações push não são suportadas neste navegador.
          {' '}Para receber notificações, instale o app como PWA no seu celular.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="rounded-lg border border-border bg-card p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {subscribed
            ? <BellRing className="h-5 w-5 text-primary shrink-0" />
            : <Bell className="h-5 w-5 text-muted-foreground shrink-0" />
          }
          <div>
            <p className="text-sm font-semibold text-foreground">
              {subscribed ? 'Notificações ativas' : 'Notificações desativadas'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {subscribed
                ? 'Você receberá avisos mesmo com o app fechado.'
                : 'Ative para receber comunicados do Glory Pads.'}
            </p>
          </div>
        </div>
        <button
          onClick={handleToggle}
          disabled={toggling || permission === 'denied'}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
            subscribed ? 'bg-primary' : 'bg-muted'
          }`}
        >
          {toggling && (
            <Loader2 className="absolute left-1/2 -translate-x-1/2 h-3.5 w-3.5 animate-spin text-white" />
          )}
          {!toggling && (
            <span
              className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform ${
                subscribed ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          )}
        </button>
      </div>

      {permission === 'denied' && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
          <p className="text-xs text-destructive leading-relaxed">
            ⚠️ Permissão bloqueada pelo sistema. Para ativar, acesse as configurações do seu navegador e permita notificações para este site.
          </p>
        </div>
      )}

      <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1.5">
        <p className="text-xs font-medium text-foreground">Como funciona?</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Ao ativar, você receberá avisos importantes da equipe Glory Pads diretamente no seu celular ou computador, mesmo com o app fechado. Sem spam.
        </p>
      </div>

      {subscribed && (
        <button
          onClick={() => {
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('🎵 Glory Pads', {
                body: 'Notificações funcionando! Você receberá avisos mesmo com o app fechado.',
                icon: '/pwa-icon-192.png',
              });
            }
          }}
          className="w-full py-2 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border rounded-lg transition-colors hover:bg-muted/30"
        >
          🔔 Enviar notificação de teste
        </button>
      )}
    </div>
  );
}

// ── Tap Tempo Settings ──────────────────────────────────────────────────────

function TapTempoSettings() {
  const [enabled, setEnabled] = useState(isTapAutoApplyEnabled);
  const [timeout, setTimeoutVal] = useState(getTapAutoApplyTimeout);
  const [redirectTarget, setRedirectTargetState] = useState<TapRedirectTarget>(getTapRedirectTarget);

  const toggleEnabled = () => {
    const next = !enabled;
    setEnabled(next);
    setTapAutoApply(next);
  };

  const handleTimeoutChange = (val: number) => {
    const clamped = Math.max(5, Math.min(30, val));
    setTimeoutVal(clamped);
    setTapAutoApplyTimeout(clamped);
  };

  const handleRedirectChange = (target: TapRedirectTarget) => {
    setRedirectTargetState(target);
    setTapRedirectTarget(target);
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex justify-center items-center gap-2">
        <Timer className="h-5 w-5 text-primary" />
        <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Tap Tempo</span>
      </div>

      {/* Toggle auto-apply */}
      <div className="rounded-lg border border-border bg-card p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-foreground">Aplicação automática</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Após parar de tocar, o BPM detectado é aplicado automaticamente e volta para o Mix.
          </p>
        </div>
        <button
          onClick={toggleEnabled}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none ${
            enabled ? 'bg-primary' : 'bg-muted'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-background shadow-sm ring-0 transition-transform ${
              enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Timeout selector */}
      {enabled && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Tempo de espera</p>
            <span className="text-sm font-bold text-primary tabular-nums">{timeout}s</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Segundos de inatividade antes de aplicar o BPM. Uma barra vermelha aparece nos últimos segundos.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={5}
              max={30}
              step={1}
              value={timeout}
              onChange={(e) => handleTimeoutChange(Number(e.target.value))}
              className="flex-1 accent-primary h-1.5"
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>5s</span>
            <span>30s</span>
          </div>
        </div>
      )}

      {/* Redirect target */}
      {enabled && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">Redirecionar após aplicar</p>
          <p className="text-xs text-muted-foreground">
            Escolha para qual tela ir automaticamente após o BPM ser aplicado.
          </p>
          <div className="flex rounded-md overflow-hidden border border-border">
            {([
              { value: 'mix' as TapRedirectTarget, label: 'Mix' },
              { value: 'metronome' as TapRedirectTarget, label: 'Metrônomo' },
              { value: 'pads' as TapRedirectTarget, label: 'Pads' },
            ]).map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleRedirectChange(opt.value)}
                className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                  redirectTarget === opt.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                } ${opt.value !== 'mix' ? 'border-l border-border' : ''}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1.5">
        <p className="text-xs font-medium text-foreground">Como funciona?</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Toque no botão de Tap Tempo no ritmo da música. O app detecta o BPM automaticamente. Se a aplicação automática estiver ativa, após {timeout} segundos sem tocar, o BPM é aplicado e você é redirecionado para {redirectTarget === 'mix' ? 'o Mix' : redirectTarget === 'metronome' ? 'o Metrônomo' : 'os Pads'}.
        </p>
      </div>
    </div>
  );
}

// ── Pad Config List ─────────────────────────────────────────────────────────

interface PadConfigListProps {
  pads: PadSound[];
  padNames: Record<string, string>;
  customSounds: Record<string, string>;
  stereoMode: 'stereo' | 'mono';
  side: 'left' | 'right' | null;
  onRenamePad?: (padId: string, name: string) => void;
}

function PadConfigList({ pads, padNames, customSounds, stereoMode, side, onRenamePad }: PadConfigListProps) {
  const [expandedPad, setExpandedPad] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [nameValue, setNameValue] = useState('');

  // Only show the first 8 main pads (exclude extras beyond grid)
  const gridPads = pads.slice(0, 8);

  const stereoLabel = stereoMode === 'mono' ? 'Mono' : 'Stereo';
  const sideLabel = stereoMode === 'stereo' && side ? (side === 'left' ? 'Esquerdo' : 'Direito') : stereoMode === 'stereo' ? 'Centro' : '—';

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 pt-2">
        <FileAudio className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Configuração dos Pads</span>
      </div>
      <p className="text-xs text-muted-foreground">Gerencie nomes e veja configurações de cada pad individualmente.</p>

      <div className="rounded-lg border border-border overflow-hidden">
        {gridPads.map((pad, i) => {
          const isExpanded = expandedPad === pad.id;
          const customName = padNames[pad.id];
          const customFile = customSounds[pad.id];
          const displayName = customName || pad.shortName;
          const isEditingThis = editingName === pad.id;

          return (
            <div key={pad.id} className={`${i > 0 ? 'border-t border-border' : ''}`}>
              <button
                onClick={() => setExpandedPad(isExpanded ? null : pad.id)}
                className="flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-muted/50 transition-colors"
              >
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: `hsl(var(${pad.colorVar}))` }}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-foreground">{displayName}</span>
                  {customFile && (
                    <span className="ml-2 text-[10px] text-primary">●</span>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">{stereoLabel}</span>
                {isExpanded
                  ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                }
              </button>

              {isExpanded && (
                <div className="px-3 pb-3 pt-1 space-y-2 bg-muted/20">
                  {/* Name editing */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-16 shrink-0">Nome:</span>
                    {isEditingThis ? (
                      <div className="flex items-center gap-1 flex-1">
                        <input
                          autoFocus
                          value={nameValue}
                          onChange={(e) => setNameValue(e.target.value.slice(0, 6))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              onRenamePad?.(pad.id, nameValue.trim());
                              setEditingName(null);
                            }
                            if (e.key === 'Escape') setEditingName(null);
                          }}
                          maxLength={6}
                          className="flex-1 h-7 px-2 text-xs rounded border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <button
                          className="px-2 py-1 text-xs text-primary hover:bg-muted rounded"
                          onClick={() => {
                            onRenamePad?.(pad.id, nameValue.trim());
                            setEditingName(null);
                          }}
                        >OK</button>
                      </div>
                    ) : (
                      <button
                        className="flex items-center gap-1.5 text-xs text-foreground hover:text-primary transition-colors"
                        onClick={() => { setNameValue(customName || pad.shortName); setEditingName(pad.id); }}
                      >
                        <span>{displayName}</span>
                        <Pencil className="h-3 w-3 text-muted-foreground" />
                      </button>
                    )}
                  </div>

                  {/* Original name */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-16 shrink-0">Original:</span>
                    <span className="text-xs text-muted-foreground">{pad.name}</span>
                  </div>

                  {/* Imported file */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-16 shrink-0">Arquivo:</span>
                    <span className="text-xs text-foreground truncate">
                      {customFile || <span className="text-muted-foreground italic">Padrão</span>}
                    </span>
                  </div>

                  {/* Stereo/Mono */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-16 shrink-0">Modo:</span>
                    <span className="text-xs text-foreground">{stereoLabel}</span>
                  </div>

                  {/* Side */}
                  {stereoMode === 'stereo' && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-16 shrink-0">Lado:</span>
                      <span className="text-xs text-foreground">{sideLabel}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Tab definitions ─────────────────────────────────────────────────────────

const TAB_ITEMS = [
  { value: 'audio', label: 'Áudio', icon: Headphones },
  { value: 'midi', label: 'MIDI', icon: Piano },
  { value: 'tap', label: 'Tap Tempo', icon: Timer },
  { value: 'notifications', label: 'Notificações', icon: Bell },
  { value: 'plans', label: 'Planos', icon: Crown },
  { value: 'guide', label: 'Guia', icon: HelpCircle },
  { value: 'about', label: 'Sobre', icon: Info },
] as const;

// ─────────────────────────────────────────────────────────────────────────────

const SettingsDialog: React.FC<SettingsDialogProps> = ({ open, onOpenChange, onAudioSettingsChange, onStartTutorial, initialTab, pads, padNames, customSounds, padsStereoMode, padsSide, onRenamePad, midiSupported, midiDevices, midiChannel, midiMappings, midiIsLearning, midiLearnPadId, onMidiSetChannel, onMidiStartLearn, onMidiStopLearn, onMidiResetMappings, midiCCMappings, midiIsCCLearning, midiCCLearnFunctionId, onMidiStartCCLearn, onMidiStopCCLearn, onMidiResetCCMappings }) => {
  const [settings, setSettings] = useState<AudioSettings>(loadAudioSettings);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const isLandscape = useIsLandscape();
  const isMobilePortrait = isMobile && !isLandscape;
  const useSideLayout = isLandscape || !isMobile;

  // Determine effective tab: on mobile portrait, null means show list
  // On desktop/landscape, never allow null
  const effectiveTab = useSideLayout && activeTab === null ? 'audio' : activeTab;

  useEffect(() => {
    if (open) {
      setSettings(loadAudioSettings());
      setActiveTab(initialTab || null);
    }
  }, [open, initialTab]);

  const update = (partial: Partial<AudioSettings>) => {
    const next = { ...settings, ...partial };
    setSettings(next);
    saveAudioSettings(next);
    onAudioSettingsChange?.(next);
  };

  const activeTabItem = effectiveTab ? TAB_ITEMS.find(t => t.value === effectiveTab) : null;

  // ── Render tab content ──────────────────────────────────────────────────

  const renderContent = () => {
    switch (effectiveTab) {
      case 'audio':
        return (
          <div className="flex flex-col gap-3 w-full">
            <AudioOutputSelector />
            <StereoOption
              id="pads" label="Pads"
              mode={settings.padsStereo} side={settings.padsSide}
              onModeChange={(v) => update({ padsStereo: v, padsSide: v === 'mono' ? null : settings.padsSide })}
              onSideChange={(v) => update({ padsSide: v })}
            />
            <StereoOption
              id="ambient" label="Continuous Pads"
              mode={settings.ambientStereo} side={settings.ambientSide}
              onModeChange={(v) => update({ ambientStereo: v, ambientSide: v === 'mono' ? null : settings.ambientSide })}
              onSideChange={(v) => update({ ambientSide: v })}
            />
            <StereoOption
              id="metronome" label="Metrônomo"
              mode={settings.metronomeStereo} side={settings.metronomeSide}
              onModeChange={(v) => update({ metronomeStereo: v, metronomeSide: v === 'mono' ? null : settings.metronomeSide })}
              onSideChange={(v) => update({ metronomeSide: v })}
            />

            {/* Pad config list */}
            {pads && pads.length > 0 && (
              <PadConfigList
                pads={pads}
                padNames={padNames || {}}
                customSounds={customSounds || {}}
                stereoMode={settings.padsStereo}
                side={settings.padsSide}
                onRenamePad={onRenamePad}
              />
            )}
          
          </div>
        );

      case 'midi':
        return (
          <MidiSettings
            isMidiSupported={midiSupported ?? false}
            connectedDevices={midiDevices ?? []}
            channel={midiChannel ?? 'all'}
            mappings={midiMappings ?? {}}
            isLearning={midiIsLearning ?? false}
            learnPadId={midiLearnPadId ?? null}
            onSetChannel={onMidiSetChannel ?? (() => {})}
            onStartLearn={onMidiStartLearn ?? (() => {})}
            onStopLearn={onMidiStopLearn ?? (() => {})}
            onResetMappings={onMidiResetMappings ?? (() => {})}
            ccMappings={midiCCMappings ?? {}}
            isCCLearning={midiIsCCLearning ?? false}
            ccLearnFunctionId={midiCCLearnFunctionId ?? null}
            onStartCCLearn={onMidiStartCCLearn ?? (() => {})}
            onStopCCLearn={onMidiStopCCLearn ?? (() => {})}
            onResetCCMappings={onMidiResetCCMappings ?? (() => {})}
          />
        );

      case 'tap':
        return <TapTempoSettings />;

      case 'notifications':
        return (
          <div className="flex flex-col gap-3 w-full">
            <div className="flex justify-center items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Notificações Push</span>
            </div>
            <NotificationSettings />
          </div>
        );

      case 'plans':
        onOpenChange(false);
        navigate('/pricing');
        return null;

      case 'guide':
        return (
          <div className="flex flex-col gap-3 w-full">
            <div className="flex justify-center items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Guia Prático</span>
            </div>
            <button
              onClick={() => { onOpenChange(false); onStartTutorial?.(); }}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 text-sm font-semibold text-primary hover:bg-muted rounded-lg transition-colors border border-primary/30"
            >
              Tour Completo
            </button>
            <div className="rounded-lg border border-border bg-muted/20 w-full overflow-hidden">
              {TUTORIAL_SECTIONS.map(section => (
                <button
                  key={section.id}
                  onClick={() => { onOpenChange(false); onStartTutorial?.(section.id); }}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm text-foreground hover:bg-muted transition-colors border-b border-border/50 last:border-0"
                >
                  {section.label}
                </button>
              ))}
            </div>
          </div>
        );

      case 'about':
        return (
          <div className="flex flex-col items-center gap-4 text-center w-full py-4">
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Sobre</span>
            </div>
            <div className="rounded-lg border border-border bg-card p-5 space-y-2 w-full text-left">
              <h3 className="text-base font-bold text-foreground">Glory Pads</h3>
              <p className="text-sm text-muted-foreground">v1.0.0</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Pads de louvor profissionais para sua igreja. Configure sons, efeitos e metrônomo para elevar a experiência do seu worship.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // ── Mobile list view ──────────────────────────────────────────────────────

  const mobileListView = (
    <div className="flex flex-col">
      {TAB_ITEMS.map(item => {
        const Icon = item.icon;
        return (
          <button
            key={item.value}
            onClick={() => setActiveTab(item.value)}
            className="flex items-center gap-3 w-full px-4 py-3.5 text-sm font-medium text-foreground hover:bg-muted transition-colors border-b border-border/50 last:border-0"
          >
            <Icon className="h-5 w-5 text-primary shrink-0" />
            <span className="flex-1 text-left">{item.label}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
          </button>
        );
      })}
    </div>
  );

  // ── Desktop/landscape sidebar ─────────────────────────────────────────

  const desktopSidebar = (
    <div className="w-44 shrink-0 border-r border-border flex flex-col py-2 gap-0.5 overflow-y-auto">
      {TAB_ITEMS.map(item => {
        const Icon = item.icon;
        const isActive = effectiveTab === item.value;
        return (
          <button
            key={item.value}
            onClick={() => setActiveTab(item.value)}
            className={`flex items-center gap-2.5 w-full px-3 py-2.5 text-xs font-medium transition-colors ${
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );

  // ── Dialog ─────────────────────────────────────────────────────────────

  const showMobileList = isMobilePortrait && activeTab === null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={
          isLandscape
            ? "w-full h-full max-w-full max-h-full rounded-none mx-0 p-0 overflow-hidden"
            : isMobile
              ? "w-full max-w-full h-[100dvh] max-h-[100dvh] rounded-none mx-0 p-0 overflow-hidden border-0"
              : "w-[calc(100vw-2rem)] max-w-2xl p-0 overflow-hidden max-h-[85vh]"
        }
        style={isMobile && !isLandscape ? { paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' } : undefined}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
          {isMobilePortrait && activeTab !== null && (
            <button
              onClick={() => setActiveTab(null)}
              className="p-1.5 -ml-1 rounded-md hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-muted-foreground" />
            </button>
          )}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {isMobilePortrait && activeTabItem && (
              <activeTabItem.icon className="h-4 w-4 text-primary shrink-0" />
            )}
            <h2 className="text-base font-bold text-foreground truncate">
              {isMobilePortrait && activeTabItem ? activeTabItem.label : 'Configurações'}
            </h2>
          </div>
        </div>

        {/* Body */}
        {showMobileList ? (
          <div className="overflow-y-auto">
            {mobileListView}
          </div>
        ) : (
          <div className={`flex flex-1 min-h-0 overflow-hidden ${useSideLayout ? 'flex-row' : 'flex-col'}`}>
            {useSideLayout && desktopSidebar}
            <div className="flex-1 overflow-y-auto p-4">
              {renderContent()}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
