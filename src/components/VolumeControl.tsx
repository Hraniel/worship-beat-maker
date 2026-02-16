import React, { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import PanKnob from './PanKnob';
import ZoomPopup from './ZoomPopup';

interface VolumeControlProps {
  volume: number;
  onVolumeChange: (v: number) => void;
  label?: string;
  pan?: number;
  onPanChange?: (p: number) => void;
}

const VolumeControl: React.FC<VolumeControlProps> = ({ volume, onVolumeChange, label = "Master", pan, onPanChange }) => {
  const isMuted = volume === 0;
  const [draggingVolume, setDraggingVolume] = useState(false);

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
      <div
        className="flex-1"
        onPointerDown={() => setDraggingVolume(true)}
        onPointerUp={() => setDraggingVolume(false)}
        onPointerLeave={() => setDraggingVolume(false)}
      >
        <Slider
          value={[volume * 100]}
          onValueChange={([v]) => onVolumeChange(v / 100)}
          onReset={() => onVolumeChange(0.7)}
          min={0}
          max={100}
          step={1}
          className="w-full"
        />
      </div>
      <span className="text-[10px] text-muted-foreground w-7 text-right tabular-nums shrink-0">
        {Math.round(volume * 100)}%
      </span>
      {pan !== undefined && onPanChange && (
        <div className="border-l border-border pl-2 ml-1">
          <PanKnob pan={pan} onChange={onPanChange} />
        </div>
      )}

      <ZoomPopup visible={draggingVolume}>
        {isMuted ? <VolumeX className="h-6 w-6 text-muted-foreground" /> : <Volume2 className="h-6 w-6 text-foreground" />}
        <span className="text-2xl font-bold text-foreground tabular-nums">{Math.round(volume * 100)}%</span>
        <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-75" style={{ width: `${volume * 100}%` }} />
        </div>
      </ZoomPopup>
    </div>
  );
};

export default VolumeControl;
