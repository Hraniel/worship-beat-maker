import React from 'react';
import { Piano } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { MidiDevice } from '@/lib/midi-engine';

interface MidiIndicatorProps {
  devices: MidiDevice[];
  onClick?: () => void;
}

const MidiIndicator: React.FC<MidiIndicatorProps> = ({ devices, onClick }) => {
  if (devices.length === 0) return null;

  const label = devices.map(d => d.name).join(', ');

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className="relative p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="MIDI conectado"
          >
            <Piano className="h-4 w-4" />
            <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-green-500" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs">{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default MidiIndicator;
