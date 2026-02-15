import React, { useCallback, useEffect } from 'react';
import { Play, Pause, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { enableMetronome, disableMetronome, onMetronomeBeat } from '@/lib/loop-engine';

interface MetronomeProps {
  bpm: number;
  onBpmChange: (bpm: number) => void;
  timeSignature: string;
  onTimeSignatureChange: (ts: string) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onBeat?: (beat: number) => void;
}

const TIME_SIGNATURES = ['4/4', '3/4', '6/8'];

const Metronome: React.FC<MetronomeProps> = ({
  bpm, onBpmChange, timeSignature, onTimeSignatureChange, isPlaying, onTogglePlay, onBeat
}) => {
  const [currentBeat, setCurrentBeat] = React.useState(0);
  const beatsPerMeasure = parseInt(timeSignature.split('/')[0]);

  // Wire metronome beat callback
  useEffect(() => {
    const handler = (beat: number) => {
      setCurrentBeat(beat);
      onBeat?.(beat);
    };
    onMetronomeBeat(handler);
    return () => onMetronomeBeat(null);
  }, [onBeat]);

  // Start/stop metronome via unified engine
  useEffect(() => {
    if (isPlaying) {
      enableMetronome(0.3);
    } else {
      disableMetronome();
      setCurrentBeat(0);
    }
    return () => {
      disableMetronome();
    };
  }, [isPlaying]);

  return (
    <div className="flex flex-col items-center gap-3 px-4 py-3">
      <div className="flex items-center gap-2 w-full">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onBpmChange(Math.max(40, bpm - 1))}>
          <Minus className="h-3 w-3" />
        </Button>
        <div className="flex-1 text-center">
          <span className="text-2xl font-bold text-foreground tabular-nums">{bpm}</span>
          <span className="text-xs text-muted-foreground ml-1">BPM</span>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onBpmChange(Math.min(240, bpm + 1))}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      <Slider
        value={[bpm]}
        onValueChange={([v]) => onBpmChange(v)}
        min={40}
        max={240}
        step={1}
        className="w-full"
      />

      <div className="flex items-center gap-2 w-full">
        <Button
          onClick={onTogglePlay}
          variant={isPlaying ? "destructive" : "default"}
          size="sm"
          className="flex-1"
        >
          {isPlaying ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
          {isPlaying ? 'Parar' : 'Iniciar'}
        </Button>

        <div className="flex gap-1">
          {TIME_SIGNATURES.map((ts) => (
            <Button
              key={ts}
              variant={timeSignature === ts ? "default" : "outline"}
              size="sm"
              className="text-xs px-2 h-8"
              onClick={() => onTimeSignatureChange(ts)}
            >
              {ts}
            </Button>
          ))}
        </div>
      </div>

      {/* Beat indicator */}
      <div className="flex gap-1.5">
        {Array.from({ length: beatsPerMeasure }).map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-all ${
              isPlaying && currentBeat === i
                ? i === 0
                  ? 'bg-primary scale-125 animate-beat-flash'
                  : 'bg-foreground/70 scale-110 animate-beat-flash'
                : 'bg-muted-foreground/20'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default Metronome;
