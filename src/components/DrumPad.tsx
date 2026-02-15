import React, { useCallback, useRef, useState } from 'react';
import { playSound } from '@/lib/audio-engine';
import { Upload, X } from 'lucide-react';
import type { PadSound } from '@/lib/sounds';

interface DrumPadProps {
  pad: PadSound;
  volume: number;
  isLooping?: boolean;
  hasCustomSound?: boolean;
  customFileName?: string;
  onToggleLoop?: () => void;
  onImportSound?: (padId: string, file: File) => void;
  onRemoveCustomSound?: (padId: string) => void;
}

const DrumPad: React.FC<DrumPadProps> = ({
  pad, volume, isLooping, hasCustomSound, customFileName,
  onToggleLoop, onImportSound, onRemoveCustomSound
}) => {
  const [isActive, setIsActive] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const longPressRef = useRef<number | null>(null);

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
    // Long press to show menu
    longPressRef.current = window.setTimeout(() => {
      setShowMenu(true);
      longPressRef.current = null;
    }, 500);
    trigger();
  }, [trigger]);

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
        <span className="text-[10px] text-muted-foreground mt-0.5 max-w-full truncate px-1">
          {hasCustomSound ? (customFileName || 'Custom') : pad.name}
        </span>
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
        {hasCustomSound && (
          <div className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full bg-primary" />
        )}
      </button>

      {/* Context menu for import */}
      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1 bg-card border border-border rounded-md shadow-lg p-1 min-w-[140px]">
            <button
              className="flex items-center gap-2 w-full px-3 py-2 text-xs text-foreground hover:bg-muted rounded-sm transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-3 w-3" />
              Importar som
            </button>
            {hasCustomSound && (
              <button
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-destructive hover:bg-muted rounded-sm transition-colors"
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
