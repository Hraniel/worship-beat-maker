import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Timer, Drum, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/* ─── Tap Tempo ─── */
const MAX_TAP_INTERVAL = 2000; // ms
const TAP_HISTORY_SIZE = 8;

interface TapTempoProps {
  onBpmDetected: (bpm: number) => void;
  currentBpm: number;
}

const TapTempo: React.FC<TapTempoProps> = ({ onBpmDetected, currentBpm }) => {
  const [taps, setTaps] = useState<number[]>([]);
  const [detectedBpm, setDetectedBpm] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const handleTap = useCallback(() => {
    const now = performance.now();
    setFlash(true);
    setTimeout(() => setFlash(false), 120);

    setTaps(prev => {
      const last = prev[prev.length - 1];
      // Reset if gap is too long
      if (last && now - last > MAX_TAP_INTERVAL) return [now];
      const next = [...prev, now].slice(-TAP_HISTORY_SIZE);
      if (next.length >= 2) {
        const intervals = [];
        for (let i = 1; i < next.length; i++) intervals.push(next[i] - next[i - 1]);
        const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const bpm = Math.round(60000 / avg);
        if (bpm >= 40 && bpm <= 240) {
          setDetectedBpm(bpm);
          // Auto-apply after debounce
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = window.setTimeout(() => onBpmDetected(bpm), 1200);
        }
      }
      return next;
    });
  }, [onBpmDetected]);

  const reset = useCallback(() => {
    setTaps([]);
    setDetectedBpm(null);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  return (
    <div className="flex flex-col items-center gap-2 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
        <Timer className="h-3 w-3" />
        Tap Tempo
      </div>

      <button
        type="button"
        onPointerDown={handleTap}
        className={`w-20 h-20 rounded-full border-2 transition-all flex flex-col items-center justify-center select-none active:scale-95 ${
          flash
            ? 'border-primary bg-primary/20 scale-105'
            : 'border-border bg-card hover:border-primary/50'
        }`}
      >
        <span className="text-2xl font-black tabular-nums text-foreground">
          {detectedBpm ?? currentBpm}
        </span>
        <span className="text-[9px] text-muted-foreground">BPM</span>
      </button>

      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground">
          {taps.length < 2 ? 'Toque para detectar' : `${taps.length - 1} taps`}
        </span>
        {taps.length > 0 && (
          <button onClick={reset} className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors">
            <RotateCcw className="h-3 w-3" />
          </button>
        )}
      </div>

      {detectedBpm && detectedBpm !== currentBpm && (
        <Button
          size="sm"
          variant="outline"
          className="text-[10px] h-6 px-3"
          onClick={() => { onBpmDetected(detectedBpm); reset(); }}
        >
          Aplicar {detectedBpm} BPM
        </Button>
      )}
    </div>
  );
};

/* ─── Drum Tuner ─── */
const DRUM_NOTES: { name: string; label: string; freq: number }[] = [
  { name: 'kick', label: 'Bumbo', freq: 60 },
  { name: 'snare', label: 'Caixa', freq: 200 },
  { name: 'tom_hi', label: 'Tom Alto', freq: 300 },
  { name: 'tom_mid', label: 'Tom Médio', freq: 220 },
  { name: 'tom_low', label: 'Tom Baixo', freq: 140 },
  { name: 'floor', label: 'Surdo', freq: 90 },
];

const DrumTuner: React.FC = () => {
  const [activeNote, setActiveNote] = useState<string | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  const playNote = useCallback((note: typeof DRUM_NOTES[0]) => {
    // Stop previous
    if (oscRef.current) {
      try { oscRef.current.stop(); } catch {}
    }

    if (!ctxRef.current) ctxRef.current = new AudioContext();
    const ctx = ctxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(note.freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 2);

    oscRef.current = osc;
    gainRef.current = gain;
    setActiveNote(note.name);

    osc.onended = () => {
      setActiveNote(prev => prev === note.name ? null : prev);
    };
  }, []);

  const stopNote = useCallback(() => {
    if (oscRef.current) {
      try { oscRef.current.stop(); } catch {}
      oscRef.current = null;
    }
    setActiveNote(null);
  }, []);

  useEffect(() => () => { stopNote(); }, [stopNote]);

  return (
    <div className="flex flex-col gap-2 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
        <Drum className="h-3 w-3" />
        Afinador de Bateria
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {DRUM_NOTES.map((note) => (
          <button
            key={note.name}
            onPointerDown={() => playNote(note)}
            className={`flex flex-col items-center justify-center gap-0.5 py-2 px-1 rounded-lg border transition-all select-none active:scale-95 ${
              activeNote === note.name
                ? 'border-primary bg-primary/15 text-primary'
                : 'border-border bg-card text-foreground hover:border-primary/40'
            }`}
          >
            <span className="text-[11px] font-bold">{note.label}</span>
            <span className="text-[9px] text-muted-foreground">{note.freq} Hz</span>
          </button>
        ))}
      </div>

      {activeNote && (
        <Button size="sm" variant="ghost" className="text-[10px] h-6 mx-auto" onClick={stopNote}>
          Parar
        </Button>
      )}
    </div>
  );
};

/* ─── Main Panel ─── */
interface ToolsPanelProps {
  bpm: number;
  onBpmChange: (bpm: number) => void;
}

const ToolsPanel: React.FC<ToolsPanelProps> = ({ bpm, onBpmChange }) => {
  return (
    <div className="flex flex-col gap-1 overflow-auto">
      <div className="flex gap-2">
        <div className="flex-1 min-w-0">
          <TapTempo onBpmDetected={onBpmChange} currentBpm={bpm} />
        </div>
        <div className="w-px bg-border/50" />
        <div className="flex-1 min-w-0">
          <DrumTuner />
        </div>
      </div>
    </div>
  );
};

export default ToolsPanel;
