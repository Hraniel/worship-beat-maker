import React from 'react';
import { Piano, Usb, AlertTriangle, RotateCcw, Ear, SlidersHorizontal } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { defaultPads } from '@/lib/sounds';
import {
  midiNoteToName,
  CC_FUNCTIONS,
  findCCForFunction,
  type MidiChannel,
  type MidiDevice,
  type CCFunctionId,
} from '@/lib/midi-engine';

interface MidiSettingsProps {
  isMidiSupported: boolean;
  connectedDevices: MidiDevice[];
  channel: MidiChannel;
  ccChannel: MidiChannel;
  mappings: Record<number, string>;
  isLearning: boolean;
  learnPadId: string | null;
  onSetChannel: (ch: MidiChannel) => void;
  onSetCCChannel: (ch: MidiChannel) => void;
  onStartLearn: (padId: string) => void;
  onStopLearn: () => void;
  onResetMappings: () => void;
  ccMappings: Record<number, CCFunctionId>;
  isCCLearning: boolean;
  ccLearnFunctionId: CCFunctionId | null;
  onStartCCLearn: (functionId: CCFunctionId) => void;
  onStopCCLearn: () => void;
  onResetCCMappings: () => void;
}

const gridPads = defaultPads.slice(0, 8);

function findNoteForPad(mappings: Record<number, string>, padId: string): number | null {
  for (const [note, id] of Object.entries(mappings)) {
    if (id === padId) return Number(note);
  }
  return null;
}

const MidiSettings: React.FC<MidiSettingsProps> = ({
  isMidiSupported,
  connectedDevices,
  channel,
  ccChannel,
  mappings,
  isLearning,
  learnPadId,
  onSetChannel,
  onSetCCChannel,
  onStartLearn,
  onStopLearn,
  onResetMappings,
  ccMappings,
  isCCLearning,
  ccLearnFunctionId,
  onStartCCLearn,
  onStopCCLearn,
  onResetCCMappings,
}) => {
  // Browser not supported
  if (!isMidiSupported) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <AlertTriangle className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          MIDI não é suportado neste navegador. Use Chrome, Edge ou Android para conectar controladores MIDI.
        </p>
      </div>
    );
  }

  const hasDevice = connectedDevices.length > 0;
  const anyLearning = isLearning || isCCLearning;

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Header */}
      <div className="flex justify-center items-center gap-2">
        <Piano className="h-5 w-5 text-primary" />
        <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">MIDI</span>
      </div>

      {/* Section 1: Device status */}
      <div className="rounded-lg border border-border bg-card p-4 flex items-center gap-3">
        <Usb className={`h-5 w-5 shrink-0 ${hasDevice ? 'text-green-500' : 'text-muted-foreground'}`} />
        <div className="flex-1 min-w-0">
          {hasDevice ? (
            <>
              <p className="text-sm font-semibold text-foreground truncate">
                {connectedDevices.map(d => d.name).join(', ')}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {connectedDevices.length === 1 ? '1 dispositivo conectado' : `${connectedDevices.length} dispositivos conectados`}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-foreground">Nenhum dispositivo</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Conecte um controlador MIDI via USB ou Bluetooth
              </p>
            </>
          )}
        </div>
        {hasDevice && <span className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0" />}
      </div>

      {/* Section 2: Channel selectors */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">Canal das Notas (Pads)</p>
          <p className="text-xs text-muted-foreground">Filtra notas MIDI para os pads.</p>
          <Select
            value={String(channel)}
            onValueChange={(v) => onSetChannel(v === 'all' ? 'all' : Number(v))}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os canais</SelectItem>
              {Array.from({ length: 16 }, (_, i) => i + 1).map((ch) => (
                <SelectItem key={ch} value={String(ch)}>
                  Canal {ch}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="border-t border-border pt-3 space-y-2">
          <p className="text-sm font-semibold text-foreground">Canal dos CCs (Faders/Knobs)</p>
          <p className="text-xs text-muted-foreground">Filtra mensagens CC para volumes, BPM, etc.</p>
          <Select
            value={String(ccChannel)}
            onValueChange={(v) => onSetCCChannel(v === 'all' ? 'all' : Number(v))}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os canais</SelectItem>
              {Array.from({ length: 16 }, (_, i) => i + 1).map((ch) => (
                <SelectItem key={ch} value={String(ch)}>
                  Canal {ch}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Section 3: Pad mapping */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-sm font-semibold text-foreground">Mapeamento dos Pads</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Associe notas MIDI aos pads. Use "Aprender" para mapear pelo controlador.
          </p>
        </div>
        {gridPads.map((pad, i) => {
          const note = findNoteForPad(mappings, pad.id);
          const isThisLearning = isLearning && learnPadId === pad.id;
          return (
            <div
              key={pad.id}
              className={`flex items-center gap-3 px-4 py-2.5 ${i > 0 ? 'border-t border-border' : ''} ${
                isThisLearning ? 'bg-primary/10 animate-pulse' : ''
              }`}
            >
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: `hsl(var(${pad.colorVar}))` }}
              />
              <span className="text-sm font-medium text-foreground flex-1 min-w-0 truncate">
                {pad.shortName}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums shrink-0 w-16 text-right">
                {isThisLearning
                  ? 'Toque...'
                  : note !== null
                  ? `${midiNoteToName(note)} (${note})`
                  : '—'}
              </span>
              {isThisLearning ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-destructive"
                  onClick={onStopLearn}
                >
                  Cancelar
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => onStartLearn(pad.id)}
                  disabled={anyLearning}
                >
                  <Ear className="h-3 w-3 mr-1" />
                  Aprender
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Reset pad mappings */}
      <Button
        variant="outline"
        className="w-full gap-2"
        onClick={onResetMappings}
      >
        <RotateCcw className="h-4 w-4" />
        Resetar mapeamento de pads
      </Button>

      {/* Section 4: CC Mapping (Learnable) */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-semibold text-foreground">Mapeamento de CCs</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Associe controles CC (faders, knobs, botões) às funções. Use "Aprender" para mapear pelo controlador.
            </p>
          </div>
        </div>
        {CC_FUNCTIONS.map((fn, i) => {
          const cc = findCCForFunction(fn.id);
          const isThisCCLearning = isCCLearning && ccLearnFunctionId === fn.id;
          return (
            <div
              key={fn.id}
              className={`flex items-center gap-3 px-4 py-2.5 ${i > 0 ? 'border-t border-border' : ''} ${
                isThisCCLearning ? 'bg-primary/10 animate-pulse' : ''
              }`}
            >
              <span className="text-sm font-medium text-foreground flex-1 min-w-0 truncate">
                {fn.label}
              </span>
              <span className="text-xs font-mono text-muted-foreground tabular-nums shrink-0 w-16 text-right">
                {isThisCCLearning
                  ? 'Mova...'
                  : cc !== null
                  ? `CC ${cc}`
                  : '—'}
              </span>
              {isThisCCLearning ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-destructive"
                  onClick={onStopCCLearn}
                >
                  Cancelar
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => onStartCCLearn(fn.id)}
                  disabled={anyLearning}
                >
                  <Ear className="h-3 w-3 mr-1" />
                  Aprender
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Reset CC mappings */}
      <Button
        variant="outline"
        className="w-full gap-2"
        onClick={onResetCCMappings}
      >
        <RotateCcw className="h-4 w-4" />
        Resetar mapeamento de CCs
      </Button>

      {/* Section 5: Info */}
      <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1.5">
        <p className="text-xs font-medium text-foreground">Como funciona?</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Conecte um controlador MIDI via USB ou Bluetooth. O app detecta automaticamente e permite tocar os pads com sensibilidade de velocity. Use o modo "Aprender" para personalizar o mapeamento de cada tecla, fader ou knob. Mova o controle desejado no seu controlador para associá-lo à função.
        </p>
      </div>
    </div>
  );
};

export default MidiSettings;
