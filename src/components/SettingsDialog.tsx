import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Headphones, Crown, HelpCircle, Info, Bell, BellOff, BellRing, Loader2, ChevronRight, ArrowLeft, Timer, Pencil, FileAudio, ChevronDown, ChevronUp, Piano, AudioLines, Lock, Music, Activity, Globe, Sun, Moon, Palette, Radio, Volume2, Vibrate } from 'lucide-react';
import LanguageSelector from '@/components/LanguageSelector';
import { useFeatureGates } from '@/hooks/useFeatureGates';
import {
  isOutputSelectionSupported,
  getAudioOutputDevices,
  getSavedOutputDeviceId,
  setAudioOutputDevice,
} from '@/lib/audio-engine';
import {
  setForceLoopBeat1, isForceLoopBeat1,
  setMetronomeAccent, isMetronomeAccent,
} from '@/lib/loop-engine';
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
import { useTranslation } from 'react-i18next';

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
  onOpenPerformance?: () => void;
  initialTab?: string;
  pads?: PadSound[];
  padNames?: Record<string, string>;
  customSounds?: Record<string, string>;
  padsStereoMode?: 'stereo' | 'mono';
  padsSide?: 'left' | 'right' | null;
  onRenamePad?: (padId: string, name: string) => void;
  midiSupported?: boolean;
  midiDevices?: MidiDevice[];
  midiChannel?: MidiChannel;
  midiCCChannel?: MidiChannel;
  midiMappings?: Record<number, string>;
  midiIsLearning?: boolean;
  midiLearnPadId?: string | null;
  onMidiSetChannel?: (ch: MidiChannel) => void;
  onMidiSetCCChannel?: (ch: MidiChannel) => void;
  onMidiStartLearn?: (padId: string) => void;
  onMidiStopLearn?: () => void;
  onMidiResetMappings?: () => void;
  midiCCMappings?: Record<number, CCFunctionId>;
  midiIsCCLearning?: boolean;
  midiCCLearnFunctionId?: CCFunctionId | null;
  onMidiStartCCLearn?: (functionId: CCFunctionId) => void;
  onMidiStopCCLearn?: () => void;
  onMidiResetCCMappings?: () => void;
  onMidiRemoveNoteMapping?: (note: number) => void;
  onMidiRemoveCCMapping?: (cc: number) => void;
}

interface StereoOptionProps {
  id: string;
  label: string;
  mode: 'stereo' | 'mono';
  side: 'left' | 'right' | null;
  onModeChange: (v: 'stereo' | 'mono') => void;
  onSideChange: (v: 'left' | 'right') => void;
}

const StereoOption: React.FC<StereoOptionProps> = ({ id, label, mode, side, onModeChange, onSideChange }) => {
  const { t } = useTranslation();
  return (
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
            {t('settings.stereo')}
          </button>
          <button
            onClick={() => onModeChange('mono')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-l border-border ${
              mode === 'mono'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            {t('settings.mono')}
          </button>
        </div>
      </div>

      {mode === 'stereo' && (
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground shrink-0">{t('settings.directTo')}</span>
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
        <p className="text-xs text-muted-foreground/70 italic">{t('settings.panLockedCenter')}</p>
      )}
    </div>
  );
};

// ── Audio Output Device Selector ──────────────────────────────────────────

function AudioOutputSelector() {
  const { t } = useTranslation();
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
          <span className="text-sm font-semibold text-foreground">{t('settings.audioOutput')}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {t('settings.audioOutputNotSupported')}
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
        <span className="text-sm font-semibold text-foreground">{t('settings.audioOutput')}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        {t('settings.audioOutputDescription')}
      </p>
      <div className="space-y-1">
        {devices.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-2">{t('settings.noDevicesFound')}</p>
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
                  {dev.label || `${t('settings.device')} ${dev.deviceId.slice(0, 8)}`}
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
        {t('settings.refreshList')}
      </button>
    </div>
  );
}

// ── Push Notification Settings ──────────────────────────────────────────────

function NotificationSettings() {
  const { t } = useTranslation();
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
          {t('notifications.notSupported')}
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
              {subscribed ? t('notifications.active') : t('notifications.inactive')}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {subscribed
                ? t('notifications.activeDescription')
                : t('notifications.inactiveDescription')}
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
            ⚠️ {t('notifications.blocked')}
          </p>
        </div>
      )}

      <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1.5">
        <p className="text-xs font-medium text-foreground">{t('notifications.howItWorks')}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {t('notifications.howItWorksDescription')}
        </p>
      </div>

      {subscribed && (
        <button
          onClick={async () => {
            try {
              const reg = await navigator.serviceWorker.ready;
              await reg.showNotification(t('notifications.testTitle'), {
                body: t('notifications.testBody'),
                icon: '/pwa-icon-192.png',
                badge: '/pwa-icon-192.png',
                tag: 'glory-pads-test',
              } as NotificationOptions);
            } catch {
              // Fallback for browsers that don't support SW showNotification
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(t('notifications.testTitle'), {
                  body: t('notifications.testBody'),
                  icon: '/pwa-icon-192.png',
                });
              }
            }
          }}
          className="w-full py-2 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border rounded-lg transition-colors hover:bg-muted/30"
        >
          {t('notifications.sendTest')}
        </button>
      )}
    </div>
  );
}

// ── Tap Tempo Settings ──────────────────────────────────────────────────────

function TapTempoSettings() {
  const { t } = useTranslation();
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

  const targetLabel = (target: TapRedirectTarget) => {
    switch (target) {
      case 'mix': return t('tapTempo.mix');
      case 'metronome': return t('tapTempo.metronomeDest');
      case 'pads': return t('tapTempo.padsDest');
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex justify-center items-center gap-2">
        <Timer className="h-5 w-5 text-primary" />
        <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t('tapTempo.title')}</span>
      </div>

      {/* Toggle auto-apply */}
      <div className="rounded-lg border border-border bg-card p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-foreground">{t('tapTempo.autoApply')}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('tapTempo.autoApplyDescription')}
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
            <p className="text-sm font-semibold text-foreground">{t('tapTempo.timeout')}</p>
            <span className="text-sm font-bold text-primary tabular-nums">{timeout}s</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('tapTempo.timeoutDetailDesc')}
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
          <p className="text-sm font-semibold text-foreground">{t('tapTempo.redirectAfterApply')}</p>
          <p className="text-xs text-muted-foreground">
            {t('tapTempo.redirectAfterApplyDesc')}
          </p>
          <div className="flex rounded-md overflow-hidden border border-border">
            {([
              { value: 'mix' as TapRedirectTarget, label: t('tapTempo.mix') },
              { value: 'metronome' as TapRedirectTarget, label: t('tapTempo.metronomeDest') },
              { value: 'pads' as TapRedirectTarget, label: t('tapTempo.padsDest') },
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
        <p className="text-xs font-medium text-foreground">{t('common.howItWorks')}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {t('tapTempo.howItWorksDesc', { timeout, target: targetLabel(redirectTarget) })}
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
  const { t } = useTranslation();
  const [expandedPad, setExpandedPad] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [nameValue, setNameValue] = useState('');

  const gridPads = pads.slice(0, 8);

  const stereoLabel = stereoMode === 'mono' ? t('settings.mono') : t('settings.stereo');
  const sideLabel = stereoMode === 'stereo' && side ? (side === 'left' ? t('common.left') : t('common.right')) : stereoMode === 'stereo' ? t('common.center') : '—';

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 pt-2">
        <FileAudio className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">{t('settings.padConfig')}</span>
      </div>
      <p className="text-xs text-muted-foreground">{t('settings.padConfigDesc')}</p>

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
                    <span className="text-xs text-muted-foreground w-16 shrink-0">{t('common.name')}:</span>
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
                        >{t('common.ok')}</button>
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
                    <span className="text-xs text-muted-foreground w-16 shrink-0">{t('common.original')}:</span>
                    <span className="text-xs text-muted-foreground">{pad.name}</span>
                  </div>

                  {/* Imported file */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-16 shrink-0">{t('common.file')}:</span>
                    <span className="text-xs text-foreground truncate">
                      {customFile || <span className="text-muted-foreground italic">{t('common.default')}</span>}
                    </span>
                  </div>

                  {/* Stereo/Mono */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-16 shrink-0">{t('common.mode')}:</span>
                    <span className="text-xs text-foreground">{stereoLabel}</span>
                  </div>

                  {/* Side */}
                  {stereoMode === 'stereo' && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-16 shrink-0">{t('common.side')}:</span>
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

// ── Metronome Settings ──────────────────────────────────────────────────────

function MetronomeSettingsPanel() {
  const { t } = useTranslation();
  const [forceB1, setForceB1] = useState(isForceLoopBeat1);
  const [accent, setAccent] = useState(isMetronomeAccent);

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex justify-center items-center gap-2">
        <Activity className="h-5 w-5 text-primary" />
        <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t('metronomeSettings.title')}</span>
      </div>

      {/* Force loop start on beat 1 */}
      <div className="rounded-lg border border-border bg-card p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-foreground">{t('metronomeSettings.forceLoopBeat1')}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('metronomeSettings.forceLoopBeat1Desc')}
          </p>
        </div>
        <button
          onClick={() => { const next = !forceB1; setForceB1(next); setForceLoopBeat1(next); }}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none ${
            forceB1 ? 'bg-primary' : 'bg-muted'
          }`}
        >
          <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-background shadow-sm ring-0 transition-transform ${forceB1 ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>

      {/* Metronome accent */}
      <div className="rounded-lg border border-border bg-card p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-foreground">{t('metronomeSettings.accent')}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('metronomeSettings.accentDesc')}
          </p>
        </div>
        <button
          onClick={() => { const next = !accent; setAccent(next); setMetronomeAccent(next); }}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none ${
            accent ? 'bg-primary' : 'bg-muted'
          }`}
        >
          <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-background shadow-sm ring-0 transition-transform ${accent ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>

      <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1.5">
        <p className="text-xs font-medium text-foreground">{t('common.tip')}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {t('metronomeSettings.tip')}
        </p>
      </div>
    </div>
  );
}

// ── Theme Settings ──────────────────────────────────────────────────────────

const THEME_KEY = 'glory-pads-theme';

type AppTheme = 'dark' | 'light';

export function getStoredTheme(): AppTheme {
  return (localStorage.getItem(THEME_KEY) as AppTheme) || 'dark';
}

export function applyTheme(theme: AppTheme) {
  localStorage.setItem(THEME_KEY, theme);
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

function ThemeSettings() {
  const { t } = useTranslation();
  const [theme, setTheme] = useState<AppTheme>(getStoredTheme);

  const handleSelect = (t: AppTheme) => {
    setTheme(t);
    applyTheme(t);
  };

  const options: { value: AppTheme; label: string; icon: typeof Sun; desc: string }[] = [
    { value: 'dark', label: t('settings.themeDark'), icon: Moon, desc: t('settings.themeDarkDesc') },
    { value: 'light', label: t('settings.themeLight'), icon: Sun, desc: t('settings.themeLightDesc') },
  ];

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex justify-center items-center gap-2">
        <Palette className="h-5 w-5 text-primary" />
        <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t('settings.theme')}</span>
      </div>

      <div className="space-y-2">
        {options.map(opt => {
          const Icon = opt.icon;
          const isActive = theme === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              className={`flex items-center gap-4 w-full px-4 py-4 rounded-lg border transition-colors text-left ${
                isActive
                  ? 'border-primary/50 bg-primary/10'
                  : 'border-border bg-card hover:bg-muted/50'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                isActive ? 'bg-primary/20' : 'bg-muted'
              }`}>
                <Icon className={`h-5 w-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${isActive ? 'text-foreground' : 'text-foreground'}`}>{opt.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                isActive ? 'border-primary' : 'border-muted-foreground/30'
              }`}>
                {isActive && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Performance / Live Cue Settings ─────────────────────────────────────────

import { loadPerformanceSettings, savePerformanceSettings, type PerformanceSettings, type CueKey, type HolyricsConfig, DEFAULT_HOLYRICS_CONFIG } from '@/lib/performance-settings';
import { supabase } from '@/integrations/supabase/client';

function PerformanceSettingsPanel() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<PerformanceSettings>(loadPerformanceSettings);

  const update = (partial: Partial<PerformanceSettings>) => {
    const next = { ...settings, ...partial };
    setSettings(next);
    savePerformanceSettings(next);
  };

  const cueKeys: CueKey[] = ['chorus', 'verse', 'bridge', 'down', 'up', 'cut', 'worship'];

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex justify-center items-center gap-2">
        <Radio className="h-5 w-5 text-primary" />
        <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t('settings.performance')}</span>
      </div>

      {/* Cue display duration */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">{t('performance.cueDuration')}</p>
          <span className="text-sm font-bold text-primary tabular-nums">{settings.cueDisplaySeconds}s</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {t('performance.cueDurationDesc')}
        </p>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={1}
            max={15}
            step={1}
            value={settings.cueDisplaySeconds}
            onChange={(e) => update({ cueDisplaySeconds: Number(e.target.value) })}
            className="flex-1 accent-primary h-1.5"
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>1s</span>
          <span>15s</span>
        </div>
      </div>

      {/* Vibrate on cue */}
      <div className="rounded-lg border border-border bg-card p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Vibrate className="h-4 w-4 text-muted-foreground shrink-0" />
          <div>
            <p className="text-sm font-semibold text-foreground">{t('performance.vibrateOnCue')}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t('performance.vibrateOnCueDesc')}</p>
          </div>
        </div>
        <button
          onClick={() => update({ vibrateOnCue: !settings.vibrateOnCue })}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none ${
            settings.vibrateOnCue ? 'bg-primary' : 'bg-muted'
          }`}
        >
          <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-background shadow-sm ring-0 transition-transform ${settings.vibrateOnCue ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>

      {/* Sound on cue */}
      <div className="rounded-lg border border-border bg-card p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Volume2 className="h-4 w-4 text-muted-foreground shrink-0" />
          <div>
            <p className="text-sm font-semibold text-foreground">{t('performance.soundOnCue')}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t('performance.soundOnCueDesc')}</p>
          </div>
        </div>
        <button
          onClick={() => update({ soundOnCue: !settings.soundOnCue })}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none ${
            settings.soundOnCue ? 'bg-primary' : 'bg-muted'
          }`}
        >
          <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-background shadow-sm ring-0 transition-transform ${settings.soundOnCue ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>

      {/* Quick cue buttons visible */}
      <div className="rounded-lg border border-border bg-card p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-foreground">{t('performance.quickButtons')}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{t('performance.quickButtonsDesc')}</p>
        </div>
        <button
          onClick={() => update({ quickCueButtonsVisible: !settings.quickCueButtonsVisible })}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none ${
            settings.quickCueButtonsVisible ? 'bg-primary' : 'bg-muted'
          }`}
        >
          <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-background shadow-sm ring-0 transition-transform ${settings.quickCueButtonsVisible ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>

      {/* Keep panel open after send */}
      <div className="rounded-lg border border-border bg-card p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-foreground">{t('performance.keepPanelOpen')}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{t('performance.keepPanelOpenDesc')}</p>
        </div>
        <button
          onClick={() => update({ keepPanelOpenAfterSend: !settings.keepPanelOpenAfterSend })}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none ${
            settings.keepPanelOpenAfterSend ? 'bg-primary' : 'bg-muted'
          }`}
        >
          <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-background shadow-sm ring-0 transition-transform ${settings.keepPanelOpenAfterSend ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>

      {/* Custom labels */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <p className="text-sm font-semibold text-foreground">{t('performance.customLabels')}</p>
        <p className="text-xs text-muted-foreground">{t('performance.customLabelsDesc')}</p>
        <div className="space-y-2">
          {cueKeys.map(key => {
            const defaultLabel = t(`performance.cue_${key}`);
            const currentValue = settings.cueLabels[key] || '';
            return (
              <div key={key} className="flex items-center gap-2">
                <input
                  type="text"
                  maxLength={24}
                  placeholder={defaultLabel}
                  value={currentValue}
                  onChange={(e) => update({ cueLabels: { ...settings.cueLabels, [key]: e.target.value } })}
                  className="flex-1 h-8 px-2 text-xs rounded border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1.5">
        <p className="text-xs font-medium text-foreground">{t('common.tip')}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {t('performance.settingsTip', 'Os sinais ao vivo são enviados em tempo real para todos que acessam o link público do evento. Selecione um evento público no Performance e compartilhe o link com sua equipe. A música ativa é destacada automaticamente no link.')}
        </p>
      </div>
    </div>
  );
}

// ── Tab definitions ─────────────────────────────────────────────────────────

const TAB_KEYS = [
  { value: 'theme', labelKey: 'settings.theme', icon: Palette },
  { value: 'audio', labelKey: 'settings.audio', icon: Headphones },
  { value: 'metronome', labelKey: 'settings.metronome', icon: Activity },
  { value: 'performance', labelKey: 'settings.performance', icon: Radio },
  { value: 'midi', labelKey: 'settings.midi', icon: Piano },
  { value: 'tap', labelKey: 'settings.tapTempo', icon: Timer },
  { value: 'notifications', labelKey: 'settings.notifications', icon: Bell },
  { value: 'language', labelKey: 'settings.language', icon: Globe },
  { value: 'plans', labelKey: 'settings.plans', icon: Crown },
  { value: 'guide', labelKey: 'settings.guide', icon: HelpCircle },
  { value: 'about', labelKey: 'settings.about', icon: Info },
] as const;

// ─────────────────────────────────────────────────────────────────────────────

const SettingsDialog: React.FC<SettingsDialogProps> = ({ open, onOpenChange, onAudioSettingsChange, onStartTutorial, initialTab, pads, padNames, customSounds, padsStereoMode, padsSide, onRenamePad, midiSupported, midiDevices, midiChannel, midiCCChannel, midiMappings, midiIsLearning, midiLearnPadId, onMidiSetChannel, onMidiSetCCChannel, onMidiStartLearn, onMidiStopLearn, onMidiResetMappings, midiCCMappings, midiIsCCLearning, midiCCLearnFunctionId, onMidiStartCCLearn, onMidiStopCCLearn, onMidiResetCCMappings, onMidiRemoveNoteMapping, onMidiRemoveCCMapping, onOpenPerformance }) => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<AudioSettings>(loadAudioSettings);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const navigate = useNavigate();
  const { canAccess } = useFeatureGates();
  const isMobile = useIsMobile();
  const isLandscape = useIsLandscape();
  const isMobilePortrait = isMobile && !isLandscape;
  const useSideLayout = isLandscape || !isMobile;

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

  const activeTabItem = effectiveTab ? TAB_KEYS.find(t => t.value === effectiveTab) : null;

  // ── Render tab content ──────────────────────────────────────────────────

  const renderContent = () => {
    switch (effectiveTab) {
      case 'theme':
        return <ThemeSettings />;
      case 'audio':
        return (
          <div className="flex flex-col gap-3 w-full" data-tutorial="audio-settings">
            <div data-tutorial="audio-output"><AudioOutputSelector /></div>
            {(() => {
              const panAccess = canAccess('pan_control');
              return (
                <div className="relative" data-tutorial="audio-stereo-pan">
                  {!panAccess.allowed && (
                    <div
                      className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[2px] rounded-lg cursor-pointer"
                      onClick={() => navigate('/pricing')}
                    >
                      <Lock className="h-4 w-4 text-primary" />
                      <span className="text-[10px] font-medium text-primary">
                        {t('upgradeGate.plan')} {panAccess.requiredTier === 'master' ? 'Master' : 'Pro'}
                      </span>
                    </div>
                  )}
                  <div className={!panAccess.allowed ? 'opacity-40 pointer-events-none' : ''}>
                    <div className="flex flex-col gap-3">
                      <StereoOption
                        id="pads" label={t('settings.pads')}
                        mode={settings.padsStereo} side={settings.padsSide}
                        onModeChange={(v) => update({ padsStereo: v, padsSide: v === 'mono' ? null : settings.padsSide })}
                        onSideChange={(v) => update({ padsSide: v })}
                      />
                      <StereoOption
                        id="ambient" label={t('index.continuousPads')}
                        mode={settings.ambientStereo} side={settings.ambientSide}
                        onModeChange={(v) => update({ ambientStereo: v, ambientSide: v === 'mono' ? null : settings.ambientSide })}
                        onSideChange={(v) => update({ ambientSide: v })}
                      />
                      <StereoOption
                        id="metronome" label={t('settings.metronome')}
                        mode={settings.metronomeStereo} side={settings.metronomeSide}
                        onModeChange={(v) => update({ metronomeStereo: v, metronomeSide: v === 'mono' ? null : settings.metronomeSide })}
                        onSideChange={(v) => update({ metronomeSide: v })}
                      />
                    </div>
                  </div>
                </div>
              );
            })()}

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

      case 'midi': {
        const midiAccess = canAccess('midi');
        if (!midiAccess.allowed) {
          return (
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Lock className="h-7 w-7 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-semibold text-foreground">
                  {midiAccess.gate?.gate_label ?? t('settings.midiController')}
                </p>
                <p className="text-sm text-muted-foreground max-w-xs">
                  {t('settings.featureAvailableFrom', { tier: midiAccess.requiredTier ?? 'Pro' })}
                </p>
              </div>
              <button
                className="mt-2 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                onClick={() => navigate('/pricing')}
              >
                {t('settings.viewPlans')}
              </button>
            </div>
          );
        }
        return (
          <MidiSettings
            isMidiSupported={midiSupported ?? false}
            connectedDevices={midiDevices ?? []}
            channel={midiChannel ?? 'all'}
            ccChannel={midiCCChannel ?? 'all'}
            mappings={midiMappings ?? {}}
            isLearning={midiIsLearning ?? false}
            learnPadId={midiLearnPadId ?? null}
            onSetChannel={onMidiSetChannel ?? (() => {})}
            onSetCCChannel={onMidiSetCCChannel ?? (() => {})}
            onStartLearn={onMidiStartLearn ?? (() => {})}
            onStopLearn={onMidiStopLearn ?? (() => {})}
            onResetMappings={onMidiResetMappings ?? (() => {})}
            onRemoveNoteMapping={onMidiRemoveNoteMapping}
            onRemoveCCMapping={onMidiRemoveCCMapping}
            ccMappings={midiCCMappings ?? {}}
            isCCLearning={midiIsCCLearning ?? false}
            ccLearnFunctionId={midiCCLearnFunctionId ?? null}
            onStartCCLearn={onMidiStartCCLearn ?? (() => {})}
            onStopCCLearn={onMidiStopCCLearn ?? (() => {})}
            onResetCCMappings={onMidiResetCCMappings ?? (() => {})}
          />
        );
      }

      case 'metronome':
        return <MetronomeSettingsPanel />;

      case 'performance':
        if (onOpenPerformance) {
          onOpenChange(false);
          onOpenPerformance();
          return null;
        }
        return <PerformanceSettingsPanel />;

      case 'tap':
        return <TapTempoSettings />;

      case 'notifications':
        return (
          <div className="flex flex-col gap-3 w-full">
            <div className="flex justify-center items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t('settings.pushNotifications')}</span>
            </div>
            <NotificationSettings />
          </div>
        );

      case 'language':
        return (
          <div className="flex flex-col gap-3 w-full">
            <div className="flex justify-center items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t('settings.language')}</span>
            </div>
            <LanguageSelector />
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
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t('settings.practicalGuide')}</span>
            </div>
            <button
              onClick={() => { onOpenChange(false); onStartTutorial?.(); }}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 text-sm font-semibold text-primary hover:bg-muted rounded-lg transition-colors border border-primary/30"
            >
              {t('settings.fullTour')}
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
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t('settings.about')}</span>
            </div>
            <div className="rounded-lg border border-border bg-card p-5 space-y-2 w-full text-left">
              <h3 className="text-base font-bold text-foreground">Glory Pads</h3>
              <p className="text-sm text-muted-foreground">v1.0.0</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t('settings.aboutDescription')}
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
      {TAB_KEYS.map(item => {
        const Icon = item.icon;
        return (
          <button
            key={item.value}
            onClick={() => setActiveTab(item.value)}
            className="flex items-center gap-3 w-full px-4 py-3.5 text-sm font-medium text-foreground hover:bg-muted transition-colors border-b border-border/50 last:border-0"
          >
            <Icon className="h-5 w-5 text-primary shrink-0" />
            <span className="flex-1 text-left">{t(item.labelKey)}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
          </button>
        );
      })}
    </div>
  );

  // ── Desktop/landscape sidebar ─────────────────────────────────────────

  const desktopSidebar = (
    <div className="w-44 shrink-0 border-r border-border flex flex-col py-2 gap-0.5 overflow-y-auto">
      {TAB_KEYS.map(item => {
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
            <span>{t(item.labelKey)}</span>
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
              {isMobilePortrait && activeTabItem ? t(activeTabItem.labelKey) : t('settings.title')}
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
