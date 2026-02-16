import React, { useState } from 'react';
import { Slider } from '@/components/ui/slider';
import ZoomPopup from './ZoomPopup';

interface PanControlProps {
  label?: string;
  pan: number;
  onPanChange: (pan: number) => void;
  compact?: boolean;
}

const PanControl: React.FC<PanControlProps> = ({ label = 'Pan', pan, onPanChange, compact = false }) => {
  const displayValue = pan === 0 ? 'C' : pan < 0 ? `L${Math.round(Math.abs(pan) * 100)}` : `R${Math.round(pan * 100)}`;
  const [dragging, setDragging] = useState(false);
  const angle = pan * 135;

  return (
    <div className={`flex items-center gap-2 ${compact ? '' : 'px-4 py-2'}`}>
      <span className={`${compact ? 'text-[9px]' : 'text-[10px]'} text-muted-foreground shrink-0`}>
        {label}
      </span>
      <div className="flex items-center gap-1 text-[9px] text-muted-foreground">L</div>
      <div
        className="flex-1"
        onPointerDown={() => setDragging(true)}
        onPointerUp={() => setDragging(false)}
        onPointerLeave={() => setDragging(false)}
      >
        <Slider
          value={[pan * 100]}
          onValueChange={([v]) => onPanChange(v / 100)}
          onReset={() => onPanChange(0)}
          min={-100}
          max={100}
          step={5}
          className="w-full"
        />
      </div>
      <div className="flex items-center gap-1 text-[9px] text-muted-foreground">R</div>
      <span className={`${compact ? 'text-[9px]' : 'text-[10px]'} text-muted-foreground w-7 text-right tabular-nums`}>
        {displayValue}
      </span>

      <ZoomPopup visible={dragging}>
        <div className="relative w-20 h-20 rounded-full border-2 border-border bg-muted/50">
          <div
            className="absolute top-2 left-1/2 w-1 h-6 bg-foreground rounded-full origin-bottom"
            style={{
              transform: `translateX(-50%) rotate(${angle}deg)`,
              transformOrigin: '50% 100%',
              top: '10px',
            }}
          />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-muted-foreground/40" />
        </div>
        <span className="text-sm font-bold text-foreground tabular-nums">{displayValue}</span>
      </ZoomPopup>
    </div>
  );
};

export default PanControl;
