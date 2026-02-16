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
  <div className="py-3 border-b border-border/50 last:border-0 space-y-2">
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <RadioGroup
        value={mode}
        onValueChange={(v) => onModeChange(v as 'stereo' | 'mono')}
        className="flex items-center gap-4"
      >
        <div className="flex items-center gap-1.5">
          <RadioGroupItem value="stereo" id={`${id}-stereo`} />
          <Label htmlFor={`${id}-stereo`} className="text-xs text-muted-foreground cursor-pointer">
            Stereo
          </Label>
        </div>
        <div className="flex items-center gap-1.5">
          <RadioGroupItem value="mono" id={`${id}-mono`} />
          <Label htmlFor={`${id}-mono`} className="text-xs text-muted-foreground cursor-pointer">
            Mono
          </Label>
        </div>
      </RadioGroup>
    </div>

    {mode === 'stereo' && (
      <div className="flex items-center gap-2 pl-1">
        <span className="text-[10px] text-muted-foreground">Lado:</span>
        <RadioGroup
          value={side || ''}
          onValueChange={(v) => onSideChange(v as 'left' | 'right')}
          className="flex items-center gap-3"
        >
          <div className="flex items-center gap-1">
            <RadioGroupItem value="left" id={`${id}-left`} className="h-3 w-3" />
            <Label htmlFor={`${id}-left`} className="text-[10px] text-muted-foreground cursor-pointer">
              Esquerdo (L)
            </Label>
          </div>
          <div className="flex items-center gap-1">
            <RadioGroupItem value="right" id={`${id}-right`} className="h-3 w-3" />
            <Label htmlFor={`${id}-right`} className="text-[10px] text-muted-foreground cursor-pointer">
              Direito (R)
            </Label>
          </div>
        </RadioGroup>
      </div>
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
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-3">
                <Volume2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Saída de Áudio</span>
              </div>

              <div className="rounded-lg border border-border bg-muted/20 px-3">
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

              <p className="text-[10px] text-muted-foreground mt-2 px-1">
                No modo Stereo, escolha o lado (L/R) para direcionar o áudio. Os controles de Pan serão ajustados automaticamente.
                No modo Mono, os controles de Pan ficam bloqueados no centro.
              </p>
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