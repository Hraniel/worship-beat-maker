import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Volume2, Headphones, Crown, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TUTORIAL_SECTIONS } from '@/components/TutorialGuide';

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
  <div className="rounded-lg border border-border bg-card p-3 space-y-3">
    <div className="flex items-center justify-between">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <div className="flex rounded-md overflow-hidden border border-border">
        <button
          onClick={() => onModeChange('stereo')}
          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === 'stereo'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted'
          }`}
        >
          Stereo
        </button>
        <button
          onClick={() => onModeChange('mono')}
          className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-border ${
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
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-muted-foreground shrink-0">Direcionar para:</span>
        <div className="flex rounded-md overflow-hidden border border-border flex-1">
          <button
            onClick={() => onSideChange('left')}
            className={`flex-1 px-2 py-1 text-[11px] font-medium transition-colors ${
              side === 'left'
                ? 'bg-accent text-accent-foreground'
                : 'bg-muted/30 text-muted-foreground hover:bg-muted'
            }`}
          >
            ◀ Esquerdo
          </button>
          <button
            onClick={() => onSideChange('right')}
            className={`flex-1 px-2 py-1 text-[11px] font-medium transition-colors border-l border-border ${
              side === 'right'
                ? 'bg-accent text-accent-foreground'
                : 'bg-muted/30 text-muted-foreground hover:bg-muted'
            }`}
          >
            Direito ▶
          </button>
        </div>
      </div>
    )}

    {mode === 'mono' && (
      <p className="text-[10px] text-muted-foreground/70 italic">Pan bloqueado no centro</p>
    )}
  </div>
);

const SettingsDialog: React.FC<SettingsDialogProps> = ({ open, onOpenChange, onAudioSettingsChange, onStartTutorial }) => {
  const [settings, setSettings] = useState<AudioSettings>(loadAudioSettings);
  const [activeTab, setActiveTab] = useState('audio');
  const navigate = useNavigate();

  useEffect(() => {
    if (open) setSettings(loadAudioSettings());
  }, [open]);

  const update = (partial: Partial<AudioSettings>) => {
    const next = { ...settings, ...partial };
    setSettings(next);
    saveAudioSettings(next);
    onAudioSettingsChange?.(next);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Configurações</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="audio" className="flex-1 gap-1.5 text-xs">
              <Headphones className="h-3.5 w-3.5" />
              Áudio
            </TabsTrigger>
            <TabsTrigger value="plans" className="flex-1 gap-1.5 text-xs">
              <Crown className="h-3.5 w-3.5" />
              Planos
            </TabsTrigger>
            <TabsTrigger value="guide" className="flex-1 gap-1.5 text-xs">
              <HelpCircle className="h-3.5 w-3.5" />
              Guia
            </TabsTrigger>
          </TabsList>

          <TabsContent value="audio" className="mt-4">
            <div className="space-y-3">
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
                label="Ambient Pads"
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

          <TabsContent value="plans" className="mt-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Planos e Assinatura</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Gerencie sua assinatura e desbloqueie recursos avançados.
              </p>
              <button
                onClick={() => { onOpenChange(false); navigate('/pricing'); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Crown className="h-4 w-4" />
                Ver Planos
              </button>
            </div>
          </TabsContent>

          <TabsContent value="guide" className="mt-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <HelpCircle className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Guia Prático</span>
              </div>
              <button
                onClick={() => { onOpenChange(false); onStartTutorial?.(); }}
                className="flex items-center gap-2 w-full px-3 py-2.5 text-sm font-medium text-primary hover:bg-muted rounded-md transition-colors"
              >
                Tour Completo
              </button>
              <div className="rounded-lg border border-border bg-muted/20">
                {TUTORIAL_SECTIONS.map(section => (
                  <button
                    key={section.id}
                    onClick={() => { onOpenChange(false); onStartTutorial?.(section.id); }}
                    className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors border-b border-border/50 last:border-0"
                  >
                    {section.label}
                  </button>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;