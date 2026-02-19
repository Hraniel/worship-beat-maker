import React from 'react';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { type PadEffects, type DelaySubdivision, calcBpmDelayTime } from '@/lib/audio-effects';
import { Disc3, Timer, AudioWaveform, Zap } from 'lucide-react';

interface PadEffectsPanelProps {
  effects: PadEffects;
  bpm?: number;
  onChange: (fx: PadEffects) => void;
}

const SUBDIVISIONS: { value: DelaySubdivision; label: string }[] = [
  { value: '1/16', label: '1/16' },
  { value: '1/8',  label: '1/8' },
  { value: '1/8d', label: '1/8p' },
  { value: '1/4',  label: '1/4' },
  { value: '1/4d', label: '1/4p' },
  { value: '1/2',  label: '1/2' },
];

const PadEffectsPanel: React.FC<PadEffectsPanelProps> = ({ effects, bpm = 120, onChange }) => {
  const update = (key: keyof PadEffects, value: number | boolean | string) => {
    onChange({ ...effects, [key]: value });
  };

  const handleSyncBpmToggle = (checked: boolean) => {
    if (checked) {
      const newDelayTime = calcBpmDelayTime(bpm, effects.delaySubdivision);
      onChange({ ...effects, delaySyncBpm: true, delayTime: newDelayTime });
    } else {
      onChange({ ...effects, delaySyncBpm: false });
    }
  };

  const handleSubdivisionChange = (sub: DelaySubdivision) => {
    const newDelayTime = calcBpmDelayTime(bpm, sub);
    onChange({ ...effects, delaySubdivision: sub, delayTime: newDelayTime });
  };

  return (
    <div className="space-y-2 pt-1">
      <div className="flex items-center gap-1.5 mb-1">
        <AudioWaveform className="h-3 w-3 text-primary" />
        <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">Efeitos Master</span>
      </div>

      {/* EQ */}
      <div className="space-y-1.5 bg-muted/30 rounded-md p-2">
        <span className="text-[10px] font-medium text-muted-foreground uppercase">EQ</span>
        {([
          { key: 'eqLow' as const, label: 'Graves' },
          { key: 'eqMid' as const, label: 'Médios' },
          { key: 'eqHigh' as const, label: 'Agudos' },
        ]).map(({ key, label }) => (
          <div key={key} className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-12">{label}</span>
            <Slider
              value={[effects[key]]}
              onValueChange={([v]) => update(key, v)}
              onReset={() => update(key, 0)}
              min={-12}
              max={12}
              step={1}
              className="flex-1"
            />
            <span className="text-[10px] text-muted-foreground w-8 text-right tabular-nums">
              {effects[key] > 0 ? '+' : ''}{effects[key]}dB
            </span>
          </div>
        ))}
      </div>

      {/* Reverb */}
      <div className="flex items-center gap-2 bg-muted/30 rounded-md p-2">
        <Disc3 className="h-3 w-3 text-muted-foreground shrink-0" />
        <span className="text-[10px] text-muted-foreground w-12">Reverb</span>
        <Slider
          value={[effects.reverb * 100]}
          onValueChange={([v]) => update('reverb', v / 100)}
          onReset={() => update('reverb', 0)}
          min={0}
          max={100}
          step={1}
          className="flex-1"
        />
        <span className="text-[10px] text-muted-foreground w-8 text-right tabular-nums">
          {Math.round(effects.reverb * 100)}%
        </span>
      </div>

      {/* Delay */}
      <div className="space-y-1.5 bg-muted/30 rounded-md p-2">
        <div className="flex items-center gap-2">
          <Timer className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="text-[10px] text-muted-foreground w-12">Delay</span>
          <Slider
            value={[effects.delay * 100]}
            onValueChange={([v]) => update('delay', v / 100)}
            onReset={() => update('delay', 0)}
            min={0}
            max={100}
            step={1}
            className="flex-1"
          />
          <span className="text-[10px] text-muted-foreground w-8 text-right tabular-nums">
            {Math.round(effects.delay * 100)}%
          </span>
        </div>

        {effects.delay > 0 && (
          <>
            {/* Sync BPM toggle */}
            <div className="flex items-center gap-2 pl-5 pt-0.5">
              <Zap className="h-3 w-3 text-primary shrink-0" />
              <span className="text-[10px] text-foreground font-medium flex-1">Sync BPM</span>
              <Switch
                checked={effects.delaySyncBpm}
                onCheckedChange={handleSyncBpmToggle}
                className="scale-75 origin-right"
              />
            </div>

            {effects.delaySyncBpm ? (
              /* BPM sync mode: subdivision selector */
              <div className="pl-5 space-y-1.5">
                <div className="flex flex-wrap gap-1">
                  {SUBDIVISIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => handleSubdivisionChange(value)}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${
                        effects.delaySubdivision === value
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted/50 text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground">
                    {bpm} BPM →
                  </span>
                  <span className="text-[10px] font-medium text-primary tabular-nums">
                    {Math.round(calcBpmDelayTime(bpm, effects.delaySubdivision) * 1000)}ms
                  </span>
                </div>
              </div>
            ) : (
              /* Manual mode: tempo slider */
              <div className="flex items-center gap-2 pl-5">
                <span className="text-[10px] text-muted-foreground w-12">Tempo</span>
                <Slider
                  value={[effects.delayTime * 1000]}
                  onValueChange={([v]) => update('delayTime', v / 1000)}
                  onReset={() => update('delayTime', 0.3)}
                  min={100}
                  max={1000}
                  step={50}
                  className="flex-1"
                />
                <span className="text-[10px] text-muted-foreground w-8 text-right tabular-nums">
                  {Math.round(effects.delayTime * 1000)}ms
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PadEffectsPanel;
