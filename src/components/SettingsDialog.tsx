import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Volume2, Headphones } from 'lucide-react';

const SETTINGS_KEY = 'drum-pads-audio-settings';

export interface AudioSettings {
  padsStereo: 'stereo' | 'mono';
  ambientStereo: 'stereo' | 'mono';
  metronomeStereo: 'stereo' | 'mono';
}

const defaultSettings: AudioSettings = {
  padsStereo: 'stereo',
  ambientStereo: 'stereo',
  metronomeStereo: 'stereo',
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
}

const StereoOption: React.FC<{ id: string; label: string; value: 'stereo' | 'mono'; onChange: (v: 'stereo' | 'mono') => void }> = ({ id, label, value, onChange }) => (
  <div className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
    <span className="text-sm font-medium text-foreground">{label}</span>
    <RadioGroup
      value={value}
      onValueChange={(v) => onChange(v as 'stereo' | 'mono')}
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
);

const SettingsDialog: React.FC<SettingsDialogProps> = ({ open, onOpenChange, onAudioSettingsChange }) => {
  const [settings, setSettings] = useState<AudioSettings>(loadAudioSettings);

  useEffect(() => {
    if (open) setSettings(loadAudioSettings());
  }, [open]);

  const updateSetting = (key: keyof AudioSettings, value: 'stereo' | 'mono') => {
    const next = { ...settings, [key]: value };
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

        <Tabs defaultValue="audio" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="audio" className="flex-1 gap-1.5 text-xs">
              <Headphones className="h-3.5 w-3.5" />
              Áudio
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
                  value={settings.padsStereo}
                  onChange={(v) => updateSetting('padsStereo', v)}
                />
                <StereoOption
                  id="ambient"
                  label="Ambient Pads"
                  value={settings.ambientStereo}
                  onChange={(v) => updateSetting('ambientStereo', v)}
                />
                <StereoOption
                  id="metronome"
                  label="Metrônomo"
                  value={settings.metronomeStereo}
                  onChange={(v) => updateSetting('metronomeStereo', v)}
                />
              </div>

              <p className="text-[10px] text-muted-foreground mt-2 px-1">
                No modo Mono, o áudio será centralizado sem separação estéreo.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
