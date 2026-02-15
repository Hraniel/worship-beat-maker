import React from 'react';
import DrumPad from './DrumPad';
import type { PadSound } from '@/lib/sounds';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { type PadEffects } from '@/lib/audio-effects';

interface PadGridProps {
  pads: PadSound[];
  padVolumes: Record<string, number>;
  activeLoops: Set<string>;
  customSounds: Record<string, string>;
  padSize: 'sm' | 'md' | 'lg';
  padEffects: Record<string, PadEffects>;
  padNames: Record<string, string>;
  onToggleLoop: (padId: string) => void;
  onImportSound: (padId: string, file: File) => void;
  onRemoveCustomSound: (padId: string) => void;
  onPadVolumeChange: (padId: string, volume: number) => void;
  onEffectsChange: (padId: string, fx: PadEffects) => void;
  onRenamePad: (padId: string, name: string) => void;
}

const sizeMaxWidths = {
  sm: 'max-w-[400px]',
  md: 'max-w-[560px]',
  lg: 'max-w-[720px]',
};

const PadGrid: React.FC<PadGridProps> = ({
  pads, padVolumes, activeLoops, customSounds, padSize, padEffects, padNames,
  onToggleLoop, onImportSound, onRemoveCustomSound, onPadVolumeChange, onEffectsChange, onRenamePad
}) => {
  const { tierConfig, tier } = useSubscription();
  const maxPads = tierConfig.maxPads;
  const isMaster = tier === 'master';

  // Show only first 8 pads in 4x2 layout
  const visiblePads = pads.slice(0, 8);

  return (
    <div className={`grid grid-cols-4 grid-rows-2 gap-2 sm:gap-3 p-2 sm:p-4 ${sizeMaxWidths[padSize]} mx-auto w-full transition-all duration-200`}>
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
            padSize={padSize}
            isMasterTier={isMaster}
            effects={padEffects[pad.id]}
            onToggleLoop={pad.isLoop ? () => onToggleLoop(pad.id) : undefined}
            onImportSound={onImportSound}
            onRemoveCustomSound={onRemoveCustomSound}
            onVolumeChange={onPadVolumeChange}
            onEffectsChange={onEffectsChange}
            customName={padNames[pad.id]}
            onRename={onRenamePad}
          />
        );
      })}
    </div>
  );
};

export default PadGrid;
