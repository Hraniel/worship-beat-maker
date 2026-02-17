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
  const [localBpm, setLocalBpm] = React.useState(bpm);
  const debounceRef = React.useRef<number | null>(null);
  const beatsPerMeasure = parseInt(timeSignature.split('/')[0]);

  // Sync localBpm when bpm changes externally
  React.useEffect(() => { setLocalBpm(bpm); }, [bpm]);

  const handleBpmSlider = React.useCallback((val: number) => {
    setLocalBpm(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      onBpmChange(val);
    }, 400);
  }, [onBpmChange]);

  const handleBpmButton = React.useCallback((val: number) => {
    setLocalBpm(val);
    onBpmChange(val);
  }, [onBpmChange]);

  useEffect(() => {
    const handler = (beat: number) => {
      setCurrentBeat(beat);
      onBeat?.(beat);
    };
    onMetronomeBeat(handler);
    return () => onMetronomeBeat(null);
  }, [onBeat]);

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
    <div className="flex flex-col gap-2 px-3 py-2">
      {/* BPM + slider row */}
      <div className="flex items-center gap-1.5">
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => handleBpmButton(Math.max(40, localBpm - 1))}>
          <Minus className="h-3 w-3" />
        </Button>
        <Slider
          value={[localBpm]}
          onValueChange={([v]) => handleBpmSlider(v)}
          min={40}
          max={240}
          step={1}
          className="flex-1"
        />
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => handleBpmButton(Math.min(240, localBpm + 1))}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {/* Controls row: play + time sigs + beats */}
      <div className="flex items-center gap-1.5">
        <Button
          onClick={onTogglePlay}
          variant={isPlaying ? "destructive" : "default"}
          size="sm"
          className="h-7 px-3 text-xs gap-1"
        >
          {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          {isPlaying ? 'Stop' : 'Play'}
        </Button>

        <div className="flex gap-0.5">
          {TIME_SIGNATURES.map((ts) => (
            <Button
              key={ts}
              variant={timeSignature === ts ? "default" : "outline"}
              size="sm"
              className="text-[10px] px-1.5 h-7"
              onClick={() => onTimeSignatureChange(ts)}
            >
              {ts}
            </Button>
          ))}
        </div>

        {/* Beat indicator */}
        <div className="flex gap-1 ml-auto">
          {Array.from({ length: beatsPerMeasure }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${
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
    </div>
  );
};

export default Metronome;
