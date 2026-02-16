import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';

interface VolumeControlProps {
  volume: number;
  onVolumeChange: (v: number) => void;
  label?: string;
  /** Master pan value -1 to 1 */
  pan?: number;
  onPanChange?: (p: number) => void;
}

/** Tiny knob visual for pan */
const PanKnob: React.FC<{ pan: number; onChange: (p: number) => void }> = ({ pan, onChange }) => {
  const angle = pan * 135; // -135° to 135° range mapped from -1..1
  const displayValue = pan === 0 ? 'C' : pan < 0 ? `L${Math.round(Math.abs(pan) * 100)}` : `R${Math.round(pan * 100)}`;

  return (
    <div className="flex flex-col items-center gap-0.5 select-none">
      <div
        className="relative w-8 h-8 landscape:w-12 landscape:h-12 rounded-full border border-border bg-muted/50 cursor-pointer"
        onPointerDown={(e) => {
          e.preventDefault();
          const el = e.currentTarget;
          const rect = el.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          let moved = false;
          const longPress = window.setTimeout(() => {
            if (!moved) onChange(0);
          }, 400);

          const move = (ev: PointerEvent) => {
            moved = true;
            clearTimeout(longPress);
            const dx = ev.clientX - cx;
            const raw = Math.max(-1, Math.min(1, dx / 16));
            let snapped: number;
            if (Math.abs(raw) < 0.06) snapped = 0;
            else if (raw > 0.92) snapped = 1;
            else if (raw < -0.92) snapped = -1;
            else snapped = Math.round(raw * 20) / 20;
            onChange(snapped);
          };
          const up = () => {
            clearTimeout(longPress);
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
          };
          window.addEventListener('pointermove', move);
          window.addEventListener('pointerup', up);
        }}
        onDoubleClick={() => onChange(0)}
        title={`Pan: ${displayValue}`}
      >
        {/* Knob indicator line */}
        <div
          className="absolute top-1 left-1/2 w-0.5 h-2.5 landscape:h-4 bg-foreground rounded-full origin-bottom"
          style={{
            transform: `translateX(-50%) rotate(${angle}deg)`,
            transformOrigin: '50% 100%',
            top: '4px',
          }}
        />
        {/* Center dot */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-muted-foreground/40" />
      </div>
      <span className="text-[8px] landscape:text-[10px] text-muted-foreground tabular-nums leading-none">{displayValue}</span>
    </div>
  );
};

const VolumeControl: React.FC<VolumeControlProps> = ({ volume, onVolumeChange, label = "Master", pan, onPanChange }) => {
  const isMuted = volume === 0;

  return (
    <div className="flex items-center gap-2 landscape:gap-3 px-3 py-1.5 bg-card rounded-lg border border-border">
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0"
        onClick={() => onVolumeChange(isMuted ? 0.7 : 0)}
      >
        {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
      </Button>
      <Slider
        value={[volume * 100]}
        onValueChange={([v]) => onVolumeChange(v / 100)}
        onReset={() => onVolumeChange(0.7)}
        min={0}
        max={100}
        step={1}
        className="flex-1"
      />
      <span className="text-[10px] text-muted-foreground w-7 text-right tabular-nums shrink-0">
        {Math.round(volume * 100)}%
      </span>
      {pan !== undefined && onPanChange && (
        <div className="border-l border-border pl-2 ml-1">
          <PanKnob pan={pan} onChange={onPanChange} />
        </div>
      )}
    </div>
  );
};

export default VolumeControl;
