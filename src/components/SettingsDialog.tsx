import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Headphones, Crown, HelpCircle, Store, Info, Bell, BellOff, BellRing, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TUTORIAL_SECTIONS } from '@/components/TutorialGuide';
import { useIsLandscape } from '@/hooks/use-mobile';
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

// ── Push Notification Settings Tab ───────────────────────────────────────────

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
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const SettingsDialog: React.FC<SettingsDialogProps> = ({ open, onOpenChange, onAudioSettingsChange, onStartTutorial, initialTab }) => {
  const [settings, setSettings] = useState<AudioSettings>(loadAudioSettings);
  const [activeTab, setActiveTab] = useState('audio');
  const navigate = useNavigate();
  const isLandscape = useIsLandscape();

  useEffect(() => {
    if (open) {
      setSettings(loadAudioSettings());
      if (initialTab) setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  const update = (partial: Partial<AudioSettings>) => {
    const next = { ...settings, ...partial };
    setSettings(next);
    saveAudioSettings(next);
    onAudioSettingsChange?.(next);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={
        isLandscape
          ? "w-full h-full max-w-full max-h-full rounded-none mx-0 overflow-y-auto"
          : "w-[calc(100vw-2rem)] max-w-lg sm:max-w-xl lg:max-w-2xl mx-auto"
      }>
        <DialogHeader>
          <DialogTitle className="text-lg text-center">Configurações</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Tab bar — 6 equal columns, icon + label stacked */}
          <TabsList className="w-full grid grid-cols-6 h-auto p-1 gap-0.5">
            <TabsTrigger value="audio" className="flex flex-col items-center gap-1 py-2.5 px-1 text-xs">
              <Headphones className="h-4 w-4 shrink-0" />
              <span>Áudio</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex flex-col items-center gap-1 py-2.5 px-1 text-xs">
              <Bell className="h-4 w-4 shrink-0" />
              <span className="leading-tight text-center">Notif.</span>
            </TabsTrigger>
            <TabsTrigger value="store" className="flex flex-col items-center gap-1 py-2.5 px-1 text-xs">
              <Store className="h-4 w-4 shrink-0" />
              <span>Loja</span>
            </TabsTrigger>
            <TabsTrigger value="plans" className="flex flex-col items-center gap-1 py-2.5 px-1 text-xs">
              <Crown className="h-4 w-4 shrink-0" />
              <span>Planos</span>
            </TabsTrigger>
            <TabsTrigger value="guide" className="flex flex-col items-center gap-1 py-2.5 px-1 text-xs">
              <HelpCircle className="h-4 w-4 shrink-0" />
              <span>Guia</span>
            </TabsTrigger>
            <TabsTrigger value="about" className="flex flex-col items-center gap-1 py-2.5 px-1 text-xs">
              <Info className="h-4 w-4 shrink-0" />
              <span>Sobre</span>
            </TabsTrigger>
          </TabsList>

          {/* Audio tab */}
          <TabsContent value="audio" className="mt-4">
            <div className="flex flex-col gap-3 w-full">
              <StereoOption
                id="pads"
                label="Pads"
                mode={settings.padsStereo}
                side={settings.padsSide}
                onModeChange={(v) => update({ padsStereo: v, padsSide: v === 'mono' ? null : settings.padsSide })}
                onSideChange={(v) => update({ padsSide: v })}
              />
              <StereoOption
                id="ambient"
                label="Continuous Pads"
                mode={settings.ambientStereo}
                side={settings.ambientSide}
                onModeChange={(v) => update({ ambientStereo: v, ambientSide: v === 'mono' ? null : settings.ambientSide })}
                onSideChange={(v) => update({ ambientSide: v })}
              />
              <StereoOption
                id="metronome"
                label="Metrônomo"
                mode={settings.metronomeStereo}
                side={settings.metronomeSide}
                onModeChange={(v) => update({ metronomeStereo: v, metronomeSide: v === 'mono' ? null : settings.metronomeSide })}
                onSideChange={(v) => update({ metronomeSide: v })}
              />
            </div>
          </TabsContent>


          {/* Notifications tab */}
          <TabsContent value="notifications" className="mt-4">
            <div className="flex flex-col gap-3 w-full">
              <div className="flex justify-center items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Notificações Push</span>
              </div>
              <NotificationSettings />
            </div>
          </TabsContent>

          {/* Store tab */}
          <TabsContent value="store" className="mt-4">
            <div className="flex flex-col items-center gap-4 text-center w-full py-4">
              <div className="flex items-center gap-2">
                <Store className="h-5 w-5 text-primary" />
                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Glory Store</span>
              </div>
              <p className="text-sm text-muted-foreground max-w-xs">
                Descubra novos sons, packs e texturas para elevar seu louvor.
              </p>
              <button
                onClick={() => { onOpenChange(false); navigate('/dashboard'); }}
                className="flex items-center justify-center gap-2 w-full max-w-xs px-6 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                Acessar a Loja
              </button>
            </div>
          </TabsContent>

          {/* Plans tab */}
          <TabsContent value="plans" className="mt-4">
            <div className="flex flex-col items-center gap-4 text-center w-full py-4">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Planos e Assinatura</span>
              </div>
              <p className="text-sm text-muted-foreground max-w-xs">
                Gerencie sua assinatura e desbloqueie recursos avançados.
              </p>
              <button
                onClick={() => { sessionStorage.setItem('settings-return-tab', 'plans'); onOpenChange(false); navigate('/pricing'); }}
                className="flex items-center justify-center gap-2 w-full max-w-xs px-6 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                Gerenciar plano
              </button>
            </div>
          </TabsContent>

          {/* Guide tab */}
          <TabsContent value="guide" className="mt-4">
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
          </TabsContent>

          {/* About tab */}
          <TabsContent value="about" className="mt-4">
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
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
