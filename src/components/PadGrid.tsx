import React from 'react';
import DrumPad from './DrumPad';
import type { PadSound } from '@/lib/sounds';
import { useSubscription } from '@/contexts/SubscriptionContext';

interface PadGridProps {
  pads: PadSound[];
  padVolumes: Record<string, number>;
  activeLoops: Set<string>;
  customSounds: Record<string, string>;
  onToggleLoop: (padId: string) => void;
  onImportSound: (padId: string, file: File) => void;
  onRemoveCustomSound: (padId: string) => void;
  onPadVolumeChange: (padId: string, volume: number) => void;
}

const PadGrid: React.FC<PadGridProps> = ({
  pads, padVolumes, activeLoops, customSounds,
  onToggleLoop, onImportSound, onRemoveCustomSound, onPadVolumeChange
}) => {
  const { tierConfig } = useSubscription();
  const maxPads = tierConfig.maxPads;

  // Show only first 8 pads in 4x2 layout
  const visiblePads = pads.slice(0, 8);

  return (
    <div className="grid grid-cols-4 grid-rows-2 gap-2 sm:gap-3 p-2 sm:p-4 max-w-[600px] mx-auto w-full">
      {visiblePads.map((pad, index) => {
        const isLocked = index >= maxPads;
        return (
          <DrumPad
            key={pad.id}
            pad={pad}
            volume={padVolumes[pad.id] ?? 0.7}
            isLooping={activeLoops.has(pad.id)}
            hasCustomSound={!!customSounds[pad.id]}
            customFileName={customSounds[pad.id]}
            isLocked={isLocked}
            onToggleLoop={pad.isLoop ? () => onToggleLoop(pad.id) : undefined}
            onImportSound={onImportSound}
            onRemoveCustomSound={onRemoveCustomSound}
            onVolumeChange={onPadVolumeChange}
          />
        );
      })}
    </div>
  );
};

export default PadGrid;
