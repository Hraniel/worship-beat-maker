import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';

interface VolumeControlProps {
  volume: number;
  onVolumeChange: (v: number) => void;
  label?: string;
}

const VolumeControl: React.FC<VolumeControlProps> = ({ volume, onVolumeChange, label = "Master" }) => {
  const isMuted = volume === 0;

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-card rounded-lg border border-border">
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        onClick={() => onVolumeChange(isMuted ? 0.7 : 0)}
      >
        {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </Button>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground mb-1">{label}</p>
        <Slider
          value={[volume * 100]}
          onValueChange={([v]) => onVolumeChange(v / 100)}
          onReset={() => onVolumeChange(0.7)}
          min={0}
          max={100}
          step={1}
        />
      </div>
    </div>
  );
};

export default VolumeControl;
