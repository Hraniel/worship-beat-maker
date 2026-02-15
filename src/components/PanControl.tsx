import React from 'react';
import { Slider } from '@/components/ui/slider';

interface PanControlProps {
  label?: string;
  pan: number;  // -1 (left) to 1 (right)
  onPanChange: (pan: number) => void;
  compact?: boolean;
}

const PanControl: React.FC<PanControlProps> = ({ label = 'Pan', pan, onPanChange, compact = false }) => {
  const displayValue = pan === 0 ? 'C' : pan < 0 ? `L${Math.round(Math.abs(pan) * 100)}` : `R${Math.round(pan * 100)}`;

  return (
    <div className={`flex items-center gap-2 ${compact ? '' : 'px-4 py-2'}`}>
      <span className={`${compact ? 'text-[9px]' : 'text-[10px]'} text-muted-foreground shrink-0`}>
        {label}
      </span>
      <div className="flex items-center gap-1 text-[9px] text-muted-foreground">L</div>
      <Slider
        value={[pan * 100]}
        onValueChange={([v]) => onPanChange(v / 100)}
        onReset={() => onPanChange(0)}
        min={-100}
        max={100}
        step={5}
        className="flex-1"
      />
      <div className="flex items-center gap-1 text-[9px] text-muted-foreground">R</div>
      <span className={`${compact ? 'text-[9px]' : 'text-[10px]'} text-muted-foreground w-7 text-right tabular-nums`}>
        {displayValue}
      </span>
    </div>
  );
};

export default PanControl;
