import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Play, Pause, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { playMetronomeClick } from '@/lib/audio-engine';

interface MetronomeProps {
  bpm: number;
  onBpmChange: (bpm: number) => void;
  timeSignature: string;
  onTimeSignatureChange: (ts: string) => void;
  onBeat?: (beat: number) => void;
}

const TIME_SIGNATURES = ['4/4', '3/4', '6/8'];

const Metronome: React.FC<MetronomeProps> = ({
  bpm, onBpmChange, timeSignature, onTimeSignatureChange, onBeat
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const beatRef = useRef(0);

  const beatsPerMeasure = parseInt(timeSignature.split('/')[0]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPlaying(false);
    setCurrentBeat(0);
    beatRef.current = 0;
  }, []);

  const start = useCallback(() => {
    stop();
    setIsPlaying(true);
    const interval = (60 / bpm) * 1000;
    beatRef.current = 0;

    const tick = () => {
      const beat = beatRef.current;
      playMetronomeClick(beat === 0, 0.3);
      setCurrentBeat(beat);
      onBeat?.(beat);
      beatRef.current = (beat + 1) % beatsPerMeasure;
    };

    tick();
    intervalRef.current = window.setInterval(tick, interval);
  }, [bpm, beatsPerMeasure, stop, onBeat]);

  useEffect(() => {
    return stop;
  }, [stop]);

  // Restart if bpm/timeSignature changes while playing
  useEffect(() => {
    if (isPlaying) start();
  }, [bpm, timeSignature]); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePlay = () => {
    if (isPlaying) stop();
    else start();
  };

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
          onClick={togglePlay}
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
