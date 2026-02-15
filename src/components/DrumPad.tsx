import React, { useCallback, useRef, useState } from 'react';
import { playSound } from '@/lib/audio-engine';
import { Upload, X, Volume2, Lock, Repeat, AudioWaveform, Pencil } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import type { PadSound } from '@/lib/sounds';
import { useNavigate } from 'react-router-dom';
import BpmGuideDialog from './BpmGuideDialog';
import PadEffectsPanel from './PadEffectsPanel';
import PanControl from './PanControl';
import { type PadEffects, DEFAULT_EFFECTS, getEffectInput, applyEffects, hasActiveEffects } from '@/lib/audio-effects';

interface DrumPadProps {
  pad: PadSound;
  volume: number;
  isLooping?: boolean;
  isLocked?: boolean;
  hasCustomSound?: boolean;
  customFileName?: string;
  padSize?: 'sm' | 'md' | 'lg';
  isMasterTier?: boolean;
  effects?: PadEffects;
  pan?: number;
  onToggleLoop?: () => void;
  onImportSound?: (padId: string, file: File) => void;
  onRemoveCustomSound?: (padId: string) => void;
  onVolumeChange?: (padId: string, volume: number) => void;
  onEffectsChange?: (padId: string, fx: PadEffects) => void;
  onPanChange?: (padId: string, pan: number) => void;
  customName?: string;
  onRename?: (padId: string, name: string) => void;
}

const DrumPad: React.FC<DrumPadProps> = ({
  pad, volume, isLooping, isLocked, hasCustomSound, customFileName, padSize = 'md',
  isMasterTier, effects = DEFAULT_EFFECTS, pan = 0, customName,
  onToggleLoop, onImportSound, onRemoveCustomSound, onVolumeChange, onEffectsChange, onPanChange, onRename
}) => {
  const [isActive, setIsActive] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showBpmGuide, setShowBpmGuide] = useState(false);
  const [showEffects, setShowEffects] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
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
    // Route through effects chain if Master tier has active effects
    if (isMasterTier && hasActiveEffects(effects)) {
      applyEffects(pad.id, effects);
      const dest = getEffectInput(pad.id);
      playSound(pad.id, volume, dest);
    } else {
      playSound(pad.id, volume);
    }
    setIsActive(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => setIsActive(false), 120);
  }, [pad, volume, onToggleLoop, isLocked, navigate, isMasterTier, effects]);

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

  const textSizes = {
    sm: { label: 'text-[9px]', name: 'text-[8px]', lock: 'h-4 w-4', loop: 'h-2 w-2' },
    md: { label: 'text-xs', name: 'text-[10px]', lock: 'h-5 w-5', loop: 'h-2.5 w-2.5' },
    lg: { label: 'text-sm', name: 'text-xs', lock: 'h-6 w-6', loop: 'h-3 w-3' },
  };
  const sizes = textSizes[padSize];

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
        {isLocked && (
          <Lock className={`absolute ${sizes.lock} text-muted-foreground`} />
        )}

        {!isLocked && (
          <>
            <span
              className={`${sizes.label} font-bold tracking-wider opacity-90`}
              style={{ color: `hsl(var(${pad.colorVar}))` }}
            >
              {customName || pad.shortName}
            </span>
            <span className={`${sizes.name} text-muted-foreground mt-0.5 max-w-full truncate px-1`}>
              {hasCustomSound ? (customFileName || 'Custom') : pad.name}
            </span>
          </>
        )}

        {pad.isLoop && !isLocked && (
          <div className="absolute top-1 right-1 flex items-center gap-0.5">
            <Repeat
              className={sizes.loop}
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

        {hasCustomSound && !isLocked && (
          <div className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full bg-primary" />
        )}
      </button>

      {/* Context menu — rendered as fixed overlay to avoid z-index issues */}
      {showMenu && !isLocked && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setShowMenu(false)} />
          <div className="fixed z-[101] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-lg shadow-2xl p-3 min-w-[240px] max-w-[300px] max-h-[80vh] overflow-y-auto space-y-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-foreground">{pad.name}</span>
              <button
                onClick={() => { setShowMenu(false); setShowEffects(false); }}
                className="p-0.5 rounded hover:bg-muted transition-colors"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>

            <div className="flex items-center gap-2 px-1 py-1">
              <Volume2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Slider
                value={[volume * 100]}
                onValueChange={([v]) => onVolumeChange?.(pad.id, v / 100)}
                min={0}
                max={100}
                step={1}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground w-8 text-right tabular-nums">{volumePercent}%</span>
            </div>

            <PanControl
              label="Pan"
              pan={pan}
              onPanChange={(p) => onPanChange?.(pad.id, p)}
              compact
            />

            <div className="h-px bg-border" />

            {/* Rename inline */}
            {isRenaming ? (
              <div className="flex items-center gap-1 px-2">
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value.slice(0, 6))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = renameValue.trim();
                      if (val) onRename?.(pad.id, val);
                      else onRename?.(pad.id, '');
                      setIsRenaming(false);
                    }
                    if (e.key === 'Escape') setIsRenaming(false);
                  }}
                  placeholder={pad.shortName}
                  maxLength={6}
                  className="flex-1 h-8 px-2 text-sm rounded border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  className="px-2 py-1 text-xs text-primary hover:bg-muted rounded"
                  onClick={() => {
                    const val = renameValue.trim();
                    if (val) onRename?.(pad.id, val);
                    else onRename?.(pad.id, '');
                    setIsRenaming(false);
                  }}
                >OK</button>
              </div>
            ) : (
              <button
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md transition-colors"
                onClick={() => { setRenameValue(customName || pad.shortName); setIsRenaming(true); }}
              >
                <Pencil className="h-3.5 w-3.5" />
                Renomear
              </button>
            )}

            <button
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md transition-colors"
              onClick={() => {
                setShowMenu(false);
                setShowEffects(false);
                setShowBpmGuide(true);
              }}
            >
              <Upload className="h-3.5 w-3.5" />
              Importar som
            </button>
            {hasCustomSound && (
              <button
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-muted rounded-md transition-colors"
                onClick={() => {
                  onRemoveCustomSound?.(pad.id);
                  setShowMenu(false);
                  setShowEffects(false);
                }}
              >
                <X className="h-3.5 w-3.5" />
                Remover custom
              </button>
            )}

            {/* Effects toggle - Master tier only */}
            {isMasterTier && (
              <>
                <div className="h-px bg-border" />
                <button
                  className={`flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md transition-colors ${
                    showEffects ? 'text-primary bg-primary/10' : 'text-foreground hover:bg-muted'
                  }`}
                  onClick={() => setShowEffects(prev => !prev)}
                >
                  <AudioWaveform className="h-3.5 w-3.5" />
                  Efeitos
                  {hasActiveEffects(effects) && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                </button>
                {showEffects && (
                  <PadEffectsPanel
                    effects={effects}
                    onChange={(fx) => onEffectsChange?.(pad.id, fx)}
                  />
                )}
              </>
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

      <BpmGuideDialog
        open={showBpmGuide}
        onClose={() => setShowBpmGuide(false)}
        onConfirm={() => {
          setShowBpmGuide(false);
          fileInputRef.current?.click();
        }}
      />
    </div>
  );
};

export default DrumPad;
