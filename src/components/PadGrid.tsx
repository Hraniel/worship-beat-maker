import React from 'react';
import DrumPad from './DrumPad';
import type { PadSound } from '@/lib/sounds';
import { type PadEffects } from '@/lib/audio-effects';
import { type PadColor } from './PadColorPicker';
import { TIERS, type TierKey } from '@/lib/tiers';

interface PadGridProps {
  pads: PadSound[];
  padVolumes: Record<string, number>;
  activeLoops: Set<string>;
  customSounds: Record<string, string>;
  padSize: 'sm' | 'md' | 'lg';
  padScale?: number;
  padEffects: Record<string, PadEffects>;
  padNames: Record<string, string>;
  padPans: Record<string, number>;
  padColors: Record<string, PadColor>;
  editMode?: boolean;
  disabled?: boolean;
  panDisabled?: boolean;
  isMasterTier?: boolean;
  tier?: TierKey;
  focusMode?: boolean;
  bpm?: number;
  onToggleLoop: (padId: string) => void;
  onImportSound: (padId: string, file: File) => void;
  onImportStoreSound: (padId: string, soundName: string, arrayBuffer: ArrayBuffer) => void;
  onRemoveCustomSound: (padId: string) => void;
  onPadVolumeChange: (padId: string, volume: number) => void;
  onEffectsChange: (padId: string, fx: PadEffects) => void;
  onPadPanChange: (padId: string, pan: number) => void;
  onRenamePad: (padId: string, name: string) => void;
  onPadColorChange: (padId: string, color: PadColor) => void;
  onResetPad?: (padId: string) => void;
  onResetAllPads?: () => void;
  onGateBlocked?: (gateKey: string) => void;
  onPadPlayed?: () => void;
}

const PadGrid: React.FC<PadGridProps> = ({
  pads, padVolumes, activeLoops, customSounds, padSize, padScale = 65, padEffects, padNames, padPans, padColors, editMode, disabled, panDisabled, isMasterTier: isMaster = false, tier = 'free', focusMode, bpm,
  onToggleLoop, onImportSound, onImportStoreSound, onRemoveCustomSound, onPadVolumeChange, onEffectsChange, onPadPanChange, onRenamePad, onPadColorChange,
  onResetPad, onResetAllPads, onGateBlocked, onPadPlayed
}) => {
  const maxPads = TIERS[tier].maxPads;

  // Show 9 pads for 3x3 grid
  const visiblePads = pads.slice(0, 9);

  // Count current custom sounds for import limit
  const customSoundsCount = Object.keys(customSounds).length;

  // Map padScale (30-100) to max-width in px (240-700)
  const gridMaxWidth = Math.round(240 + ((padScale - 30) / 70) * 460);

  return (
    <div
      className={`grid grid-cols-3 gap-1.5 sm:gap-3 lg:gap-4 p-1.5 sm:p-4 w-full max-w-full max-h-full mx-auto transition-all duration-200 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}
      style={focusMode ? { maxWidth: '100%' } : { maxWidth: `min(${gridMaxWidth}px, 100%)` }}
    >
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
          bpm={bpm}
          onToggleLoop={pad.isLoop ? () => onToggleLoop(pad.id) : undefined}
          onImportSound={onImportSound}
          onImportStoreSound={onImportStoreSound}
          onRemoveCustomSound={onRemoveCustomSound}
          onVolumeChange={onPadVolumeChange}
          onEffectsChange={onEffectsChange}
          onPanChange={onPadPanChange}
          customName={padNames[pad.id]}
          onRename={onRenamePad}
          customColor={padColors[pad.id]}
          onColorChange={onPadColorChange}
          editMode={editMode}
          panDisabled={panDisabled}
          customSoundsCount={customSoundsCount}
          onResetPad={onResetPad}
          onResetAllPads={onResetAllPads}
          onGateBlocked={onGateBlocked}
          onPadPlayed={onPadPlayed}
        />
      ))}
    </div>
  );
};

export default PadGrid;
