import React from 'react';
import DrumPad from './DrumPad';
import type { PadSound } from '@/lib/sounds';

interface PadGridProps {
  pads: PadSound[];
  padVolumes: Record<string, number>;
  activeLoops: Set<string>;
  customSounds: Record<string, string>; // padId -> fileName
  onToggleLoop: (padId: string) => void;
  onImportSound: (padId: string, file: File) => void;
  onRemoveCustomSound: (padId: string) => void;
}

const PadGrid: React.FC<PadGridProps> = ({
  pads, padVolumes, activeLoops, customSounds,
  onToggleLoop, onImportSound, onRemoveCustomSound
}) => {
  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3 p-2 sm:p-4 max-w-[600px] mx-auto">
      {pads.map((pad) => (
        <DrumPad
          key={pad.id}
          pad={pad}
          volume={padVolumes[pad.id] ?? 0.7}
          isLooping={activeLoops.has(pad.id)}
          hasCustomSound={!!customSounds[pad.id]}
          customFileName={customSounds[pad.id]}
          onToggleLoop={pad.isLoop ? () => onToggleLoop(pad.id) : undefined}
          onImportSound={onImportSound}
          onRemoveCustomSound={onRemoveCustomSound}
        />
      ))}
    </div>
  );
};

export default PadGrid;
