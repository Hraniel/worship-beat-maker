import React from 'react';
import DrumPad from './DrumPad';
import type { PadSound } from '@/lib/sounds';
import { type PadEffects } from '@/lib/audio-effects';
import { TIERS, type TierKey } from '@/lib/tiers';

interface PadGridProps {
  pads: PadSound[];
  padVolumes: Record<string, number>;
  activeLoops: Set<string>;
  customSounds: Record<string, string>;
  padSize: 'sm' | 'md' | 'lg';
  padEffects: Record<string, PadEffects>;
  padNames: Record<string, string>;
  padPans: Record<string, number>;
  editMode?: boolean;
  isMasterTier?: boolean;
  tier?: TierKey;
  onToggleLoop: (padId: string) => void;
  onImportSound: (padId: string, file: File) => void;
  onRemoveCustomSound: (padId: string) => void;
  onPadVolumeChange: (padId: string, volume: number) => void;
  onEffectsChange: (padId: string, fx: PadEffects) => void;
  onPadPanChange: (padId: string, pan: number) => void;
  onRenamePad: (padId: string, name: string) => void;
}

const sizeMaxWidths = {
  sm: 'max-w-[400px]',
  md: 'max-w-[560px]',
  lg: 'max-w-[720px]',
};

const PadGrid: React.FC<PadGridProps> = ({
  pads, padVolumes, activeLoops, customSounds, padSize, padEffects, padNames, padPans, editMode, isMasterTier: isMaster = false, tier = 'free',
  onToggleLoop, onImportSound, onRemoveCustomSound, onPadVolumeChange, onEffectsChange, onPadPanChange, onRenamePad
}) => {
  const maxPads = TIERS[tier].maxPads;

  // Show all 8 pads — no pads are hidden
  const visiblePads = pads.slice(0, 8);

  return (
    <div className={`grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3 p-2 sm:p-4 ${sizeMaxWidths[padSize]} mx-auto w-full transition-all duration-200`}>
      {visiblePads.map((pad, index) => (
        <DrumPad
          key={pad.id}
          pad={pad}
          volume={padVolumes[pad.id] ?? 0.7}
          isLooping={activeLoops.has(pad.id)}
          hasCustomSound={!!customSounds[pad.id]}
          customFileName={customSounds[pad.id]}
          isLocked={index >= maxPads}
          padSize={padSize}
          isMasterTier={isMaster}
          effects={padEffects[pad.id]}
          pan={padPans[pad.id] ?? 0}
          onToggleLoop={pad.isLoop ? () => onToggleLoop(pad.id) : undefined}
          onImportSound={onImportSound}
          onRemoveCustomSound={onRemoveCustomSound}
          onVolumeChange={onPadVolumeChange}
          onEffectsChange={onEffectsChange}
          onPanChange={onPadPanChange}
          customName={padNames[pad.id]}
          onRename={onRenamePad}
          editMode={editMode}
        />
      ))}
    </div>
  );
};

export default PadGrid;
