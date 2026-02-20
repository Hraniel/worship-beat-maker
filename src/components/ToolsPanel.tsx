import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Timer, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/* ─── Tap Tempo ─── */
const MAX_TAP_INTERVAL = 2000; // ms
const TAP_HISTORY_SIZE = 8;

interface ToolsPanelProps {
  bpm: number;
  onBpmChange: (bpm: number) => void;
}

const ToolsPanel: React.FC<ToolsPanelProps> = ({ bpm, onBpmChange }) => {
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
      if (last && now - last > MAX_TAP_INTERVAL) return [now];
      const next = [...prev, now].slice(-TAP_HISTORY_SIZE);
      if (next.length >= 2) {
        const intervals = [];
        for (let i = 1; i < next.length; i++) intervals.push(next[i] - next[i - 1]);
        const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const bpmVal = Math.round(60000 / avg);
        if (bpmVal >= 40 && bpmVal <= 240) {
          setDetectedBpm(bpmVal);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = window.setTimeout(() => onBpmChange(bpmVal), 1200);
        }
      }
      return next;
    });
  }, [onBpmChange]);

  const reset = useCallback(() => {
    setTaps([]);
    setDetectedBpm(null);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-4 h-full">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
        <Timer className="h-3.5 w-3.5" />
        Tap Tempo
      </div>

      <button
        type="button"
        onPointerDown={handleTap}
        className={`w-28 h-28 rounded-full border-2 transition-all flex flex-col items-center justify-center select-none active:scale-95 ${
          flash
            ? 'border-primary bg-primary/20 scale-105'
            : 'border-border bg-card hover:border-primary/50'
        }`}
      >
        <span className="text-3xl font-black tabular-nums text-foreground">
          {detectedBpm ?? bpm}
        </span>
        <span className="text-[10px] text-muted-foreground">BPM</span>
      </button>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">
          {taps.length < 2 ? 'Toque para detectar' : `${taps.length - 1} taps`}
        </span>
        {taps.length > 0 && (
          <button onClick={reset} className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors">
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {detectedBpm && detectedBpm !== bpm && (
        <Button
          size="sm"
          variant="outline"
          className="text-xs h-8 px-4"
          onClick={() => { onBpmChange(detectedBpm); reset(); }}
        >
          Aplicar {detectedBpm} BPM
        </Button>
      )}
    </div>
  );
};

export default ToolsPanel;
