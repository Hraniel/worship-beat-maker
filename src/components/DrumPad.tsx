import React, { useCallback, useRef, useState } from 'react';
import { playSound } from '@/lib/audio-engine';
import type { PadSound } from '@/lib/sounds';

interface DrumPadProps {
  pad: PadSound;
  volume: number;
  isLooping?: boolean;
  onToggleLoop?: () => void;
  onVolumeChange?: (volume: number) => void;
}

const DrumPad: React.FC<DrumPadProps> = ({ pad, volume, isLooping, onToggleLoop }) => {
  const [isActive, setIsActive] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const trigger = useCallback(() => {
    if (pad.isLoop && onToggleLoop) {
      onToggleLoop();
      return;
    }
    playSound(pad.id, volume);
    setIsActive(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => setIsActive(false), 120);
  }, [pad, volume, onToggleLoop]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    trigger();
  }, [trigger]);

  return (
    <button
      onPointerDown={handlePointerDown}
      className={`
        relative flex flex-col items-center justify-center rounded-lg
        border-2 transition-all duration-75 select-none cursor-pointer
        aspect-square w-full touch-none
        ${isActive ? 'animate-pad-pulse' : ''}
        ${isLooping ? 'animate-loop-border' : ''}
      `}
      style={{
        backgroundColor: `hsl(var(${pad.colorVar}) / ${isActive ? 0.6 : isLooping ? 0.35 : 0.2})`,
        borderColor: `hsl(var(${pad.colorVar}) / ${isActive ? 0.9 : isLooping ? 0.7 : 0.3})`,
        boxShadow: isActive
          ? `0 0 20px hsl(var(${pad.colorVar}) / 0.4), inset 0 0 15px hsl(var(${pad.colorVar}) / 0.2)`
          : isLooping
          ? `0 0 12px hsl(var(${pad.colorVar}) / 0.25)`
          : 'none',
      }}
    >
      <span
        className="text-xs font-bold tracking-wider opacity-90"
        style={{ color: `hsl(var(${pad.colorVar}))` }}
      >
        {pad.shortName}
      </span>
      <span className="text-[10px] text-muted-foreground mt-0.5">{pad.name}</span>
      {pad.isLoop && (
        <div
          className="absolute top-1 right-1 w-2 h-2 rounded-full"
          style={{
            backgroundColor: isLooping
              ? `hsl(var(${pad.colorVar}))`
              : `hsl(var(${pad.colorVar}) / 0.3)`,
          }}
        />
      )}
    </button>
  );
};

export default DrumPad;
