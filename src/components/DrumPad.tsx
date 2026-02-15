import React, { useCallback, useRef, useState } from 'react';
import { playSound } from '@/lib/audio-engine';
import { Upload, X, Volume2, Lock, Repeat } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import type { PadSound } from '@/lib/sounds';
import { useNavigate } from 'react-router-dom';

interface DrumPadProps {
  pad: PadSound;
  volume: number;
  isLooping?: boolean;
  isLocked?: boolean;
  hasCustomSound?: boolean;
  customFileName?: string;
  onToggleLoop?: () => void;
  onImportSound?: (padId: string, file: File) => void;
  onRemoveCustomSound?: (padId: string) => void;
  onVolumeChange?: (padId: string, volume: number) => void;
}

const DrumPad: React.FC<DrumPadProps> = ({
  pad, volume, isLooping, isLocked, hasCustomSound, customFileName,
  onToggleLoop, onImportSound, onRemoveCustomSound, onVolumeChange
}) => {
  const [isActive, setIsActive] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const longPressRef = useRef<number | null>(null);
  const navigate = useNavigate();

  const trigger = useCallback(() => {
    if (isLocked) {
      navigate('/pricing');
      return;
    }
    if (pad.isLoop && onToggleLoop) {
      onToggleLoop();
      return;
    }
    playSound(pad.id, volume);
    setIsActive(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => setIsActive(false), 120);
  }, [pad, volume, onToggleLoop, isLocked, navigate]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    if (isLocked) {
      trigger();
      return;
    }
    longPressRef.current = window.setTimeout(() => {
      setShowMenu(true);
      longPressRef.current = null;
    }, 500);
    trigger();
  }, [trigger, isLocked]);

  const handlePointerUp = useCallback(() => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImportSound) {
      onImportSound(pad.id, file);
    }
    setShowMenu(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [pad.id, onImportSound]);

  const volumePercent = Math.round(volume * 100);

  return (
    <div className="relative">
      <button
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className={`
          relative flex flex-col items-center justify-center rounded-lg
          border-2 transition-all duration-75 select-none cursor-pointer
          aspect-square w-full touch-none
          ${isActive && !isLocked ? 'animate-pad-pulse' : ''}
          ${isLooping ? 'animate-loop-border' : ''}
          ${isLocked ? 'opacity-40 grayscale' : ''}
        `}
        style={{
          backgroundColor: isLocked
            ? 'hsl(var(--muted) / 0.3)'
            : `hsl(var(${pad.colorVar}) / ${isActive ? 0.6 : isLooping ? 0.35 : 0.2})`,
          borderColor: isLocked
            ? 'hsl(var(--border))'
            : `hsl(var(${pad.colorVar}) / ${isActive ? 0.9 : isLooping ? 0.7 : 0.3})`,
          boxShadow: isLocked
            ? 'none'
            : isActive
            ? `0 0 20px hsl(var(${pad.colorVar}) / 0.4), inset 0 0 15px hsl(var(${pad.colorVar}) / 0.2)`
            : isLooping
            ? `0 0 12px hsl(var(${pad.colorVar}) / 0.25)`
            : 'none',
        }}
      >
        {/* Lock overlay for locked pads */}
        {isLocked && (
          <Lock className="absolute h-5 w-5 text-muted-foreground" />
        )}

        {/* Pad content */}
        {!isLocked && (
          <>
            <span
              className="text-xs font-bold tracking-wider opacity-90"
              style={{ color: `hsl(var(${pad.colorVar}))` }}
            >
              {pad.shortName}
            </span>
            <span className="text-[10px] text-muted-foreground mt-0.5 max-w-full truncate px-1">
              {hasCustomSound ? (customFileName || 'Custom') : pad.name}
            </span>
          </>
        )}

        {/* Loop indicator */}
        {pad.isLoop && !isLocked && (
          <div className="absolute top-1 right-1 flex items-center gap-0.5">
            <Repeat
              className="h-2.5 w-2.5"
              style={{
                color: isLooping
                  ? `hsl(var(${pad.colorVar}))`
                  : `hsl(var(${pad.colorVar}) / 0.4)`,
              }}
            />
            <div
              className={`w-1.5 h-1.5 rounded-full ${isLooping ? 'animate-pulse' : ''}`}
              style={{
                backgroundColor: isLooping
                  ? `hsl(var(${pad.colorVar}))`
                  : `hsl(var(${pad.colorVar}) / 0.3)`,
              }}
            />
          </div>
        )}

        {/* Custom sound indicator */}
        {hasCustomSound && !isLocked && (
          <div className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full bg-primary" />
        )}
      </button>

      {/* Context menu */}
      {showMenu && !isLocked && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1 bg-card border border-border rounded-md shadow-lg p-2 min-w-[160px] space-y-1">
            {/* Volume slider */}
            <div className="flex items-center gap-2 px-1 py-1">
              <Volume2 className="h-3 w-3 text-muted-foreground shrink-0" />
              <Slider
                value={[volume * 100]}
                onValueChange={([v]) => onVolumeChange?.(pad.id, v / 100)}
                min={0}
                max={100}
                step={1}
                className="flex-1"
              />
              <span className="text-[10px] text-muted-foreground w-7 text-right tabular-nums">{volumePercent}%</span>
            </div>

            <div className="h-px bg-border" />

            <button
              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-foreground hover:bg-muted rounded-sm transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-3 w-3" />
              Importar som
            </button>
            {hasCustomSound && (
              <button
                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-destructive hover:bg-muted rounded-sm transition-colors"
                onClick={() => {
                  onRemoveCustomSound?.(pad.id);
                  setShowMenu(false);
                }}
              >
                <X className="h-3 w-3" />
                Remover custom
              </button>
            )}
          </div>
        </>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/mp3,audio/wav,audio/mpeg,audio/ogg,.mp3,.wav,.ogg"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
};

export default DrumPad;
