import React from 'react';
import { Piano, Usb, AlertTriangle, RotateCcw, Ear } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { defaultPads } from '@/lib/sounds';
import { midiNoteToName, type MidiChannel, type MidiDevice } from '@/lib/midi-engine';

interface MidiSettingsProps {
  isMidiSupported: boolean;
  connectedDevices: MidiDevice[];
  channel: MidiChannel;
  mappings: Record<number, string>;
  isLearning: boolean;
  learnPadId: string | null;
  onSetChannel: (ch: MidiChannel) => void;
  onStartLearn: (padId: string) => void;
  onStopLearn: () => void;
  onResetMappings: () => void;
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
  mappings,
  isLearning,
  learnPadId,
  onSetChannel,
  onStartLearn,
  onStopLearn,
  onResetMappings,
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

      {/* Section 2: Channel selector */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-2">
        <p className="text-sm font-semibold text-foreground">Canal MIDI</p>
        <p className="text-xs text-muted-foreground">Filtra mensagens pelo canal selecionado.</p>
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
                  disabled={isLearning}
                >
                  <Ear className="h-3 w-3 mr-1" />
                  Aprender
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Section 4: Actions */}
      <Button
        variant="outline"
        className="w-full gap-2"
        onClick={onResetMappings}
      >
        <RotateCcw className="h-4 w-4" />
        Resetar mapeamento padrão
      </Button>

      {/* Section 5: CC Mapping Reference */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-sm font-semibold text-foreground">Mapeamento de CCs</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure estes CCs no seu controlador MIDI para controle remoto.
          </p>
        </div>
        {[
          { cc: '1–9', desc: 'Volume dos Pads (faders)' },
          { cc: '7', desc: 'Volume Master' },
          { cc: '10', desc: 'Volume do Metrônomo' },
          { cc: '20', desc: 'BPM (40–240)' },
          { cc: '21', desc: 'Play/Pause Metrônomo (≥64)' },
          { cc: '22', desc: 'Música Anterior (≥64)' },
          { cc: '23', desc: 'Próxima Música (≥64)' },
        ].map((item, i) => (
          <div key={i} className={`flex items-center gap-3 px-4 py-2 ${i > 0 ? 'border-t border-border' : ''}`}>
            <span className="text-xs font-mono font-bold text-primary w-10 shrink-0">CC {item.cc}</span>
            <span className="text-xs text-muted-foreground">{item.desc}</span>
          </div>
        ))}
      </div>

      {/* Section 6: Info */}
      <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1.5">
        <p className="text-xs font-medium text-foreground">Como funciona?</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Conecte um controlador MIDI via USB ou Bluetooth. O app detecta automaticamente e permite tocar os pads com sensibilidade de velocity. Use o modo "Aprender" para personalizar o mapeamento de cada tecla. Configure os CCs acima no seu controlador para controle remoto de volumes, BPM e navegação.
        </p>
      </div>
    </div>
  );
};

export default MidiSettings;
