import React, { useCallback, useRef, useState } from 'react';
import { playSound } from '@/lib/audio-engine';
import { getQuantizeDelay, isLoopEngineRunning } from '@/lib/loop-engine';
import { Upload, X, Volume2, Lock, Repeat, AudioWaveform, Pencil, Settings2, Palette } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import type { PadSound } from '@/lib/sounds';
import { useNavigate } from 'react-router-dom';
import BpmGuideDialog from './BpmGuideDialog';
import PadEffectsPanel from './PadEffectsPanel';
import PanControl from './PanControl';
import PadColorPicker, { type PadColor, padColorToHsl } from './PadColorPicker';
import { type PadEffects, DEFAULT_EFFECTS, getEffectInput, applyEffects, hasActiveEffects } from '@/lib/audio-effects';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { toast } from 'sonner';

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
  editMode?: boolean;
  onToggleLoop?: () => void;
  onImportSound?: (padId: string, file: File) => void;
  onRemoveCustomSound?: (padId: string) => void;
  onVolumeChange?: (padId: string, volume: number) => void;
  onEffectsChange?: (padId: string, fx: PadEffects) => void;
  onPanChange?: (padId: string, pan: number) => void;
  customName?: string;
  onRename?: (padId: string, name: string) => void;
  customColor?: PadColor;
  onColorChange?: (padId: string, color: PadColor) => void;
}

const DrumPad: React.FC<DrumPadProps> = ({
  pad, volume, isLooping, isLocked, hasCustomSound, customFileName, padSize = 'md',
  isMasterTier, effects = DEFAULT_EFFECTS, pan = 0, customName, editMode, customColor,
  onToggleLoop, onImportSound, onRemoveCustomSound, onVolumeChange, onEffectsChange, onPanChange, onRename, onColorChange
}) => {
  const [isActive, setIsActive] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showBpmGuide, setShowBpmGuide] = useState(false);
  const [showEffects, setShowEffects] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const timeoutRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const longPressRef = useRef<number | null>(null);
  const navigate = useNavigate();
  const { tier, tierConfig } = useSubscription();

  const isPro = tier === 'pro' || tier === 'master';
  const isMaster = tier === 'master';

  const goToPricing = useCallback((feature: string) => {
    toast('🔒 Recurso disponível nos planos pagos', { description: `Desbloqueie ${feature} assinando um plano.` });
    navigate('/pricing');
  }, [navigate]);

  const trigger = useCallback(() => {
    if (isLocked) {
      goToPricing('este pad');
      return;
    }
    if (pad.isLoop && onToggleLoop) {
      onToggleLoop();
      return;
    }

    const fireSound = () => {
      if (isMaster && hasActiveEffects(effects)) {
        applyEffects(pad.id, effects);
        const dest = getEffectInput(pad.id);
        playSound(pad.id, volume, dest);
      } else {
        playSound(pad.id, volume);
      }
      setIsActive(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setIsActive(false), 120);
    };

    // Quantize to nearest subdivision when clock is running
    if (isLoopEngineRunning()) {
      const delay = getQuantizeDelay();
      if (delay > 0) {
        setTimeout(fireSound, delay * 1000);
      } else {
        fireSound();
      }
    } else {
      fireSound();
    }
  }, [pad, volume, onToggleLoop, isLocked, goToPricing, isMaster, effects]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    if (editMode) {
      // In edit mode, open context menu directly, no sound
      setShowMenu(true);
      return;
    }
    // Play sound IMMEDIATELY on touch for minimum latency
    trigger();
    if (!isLocked) {
      longPressRef.current = window.setTimeout(() => {
        setShowMenu(true);
        longPressRef.current = null;
      }, 500);
    }
  }, [trigger, isLocked, editMode]);

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

  // Use custom color or fall back to CSS variable
  const colorHsl = customColor ? padColorToHsl(customColor) : null;
  const colorOpacity = customColor?.opacity ?? 1;
  const colorRef = (alpha: number) =>
    colorHsl
      ? `hsl(${colorHsl} / ${alpha * colorOpacity})`
      : `hsl(var(${pad.colorVar}) / ${alpha})`;
  const colorSolid = colorHsl ? `hsl(${colorHsl})` : `hsl(var(${pad.colorVar}))`;
  const textSizes = {
    sm: { label: 'text-[9px]', name: 'text-[8px]', lock: 'h-4 w-4', loop: 'h-2 w-2' },
    md: { label: 'text-xs', name: 'text-[10px]', lock: 'h-5 w-5', loop: 'h-2.5 w-2.5' },
    lg: { label: 'text-sm', name: 'text-xs', lock: 'h-6 w-6', loop: 'h-3 w-3' },
  };
  const sizes = textSizes[padSize];

  // Locked feature row component
  const LockedRow = ({ label, feature }: { label: string; feature: string }) => (
    <button
      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:bg-muted rounded-md transition-colors"
      onClick={() => goToPricing(feature)}
    >
      <Lock className="h-3.5 w-3.5" />
      {label}
      <span className="ml-auto text-[10px] text-primary font-medium">PRO</span>
    </button>
  );

  const LockedMasterRow = ({ label, feature }: { label: string; feature: string }) => (
    <button
      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:bg-muted rounded-md transition-colors"
      onClick={() => goToPricing(feature)}
    >
      <Lock className="h-3.5 w-3.5" />
      {label}
      <span className="ml-auto text-[10px] text-primary font-medium">MASTER</span>
    </button>
  );

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
        `}
        style={{
          backgroundColor: colorRef(isActive ? 0.6 : isLooping ? 0.35 : 0.2),
          borderColor: colorRef(isActive ? 0.9 : isLooping ? 0.7 : 0.3),
          boxShadow: isActive
            ? `0 0 20px ${colorRef(0.4)}, inset 0 0 15px ${colorRef(0.2)}`
            : isLooping
            ? `0 0 12px ${colorRef(0.25)}`
            : 'none',
        }}
      >
        {editMode && (
          <Settings2 className="absolute top-1 left-1 h-3 w-3 text-primary/70" />
        )}
        {isLocked && (
          <Lock className={`absolute top-1 right-1 h-3 w-3 text-muted-foreground/60`} />
        )}

        <span
          className={`${sizes.label} font-bold tracking-wider opacity-90 max-w-full truncate px-1 text-center`}
          style={{ color: colorSolid }}
        >
          {customName || pad.name}
        </span>

        {pad.isLoop && (
          <div className="absolute top-1 right-1 flex items-center gap-0.5">
            <Repeat
              className={sizes.loop}
              style={{
                color: isLooping ? colorSolid : colorRef(0.4),
              }}
            />
            <div
              className={`w-1.5 h-1.5 rounded-full ${isLooping ? 'animate-pulse' : ''}`}
              style={{
                backgroundColor: isLooping ? colorSolid : colorRef(0.3),
              }}
            />
          </div>
        )}

        {hasCustomSound && (
          <div className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full bg-primary" />
        )}
      </button>

      {/* Context menu */}
      {showMenu && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setShowMenu(false)} />
          <div className="fixed z-[101] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-lg shadow-2xl p-3 min-w-[240px] max-w-[300px] max-h-[80vh] overflow-y-auto space-y-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-foreground">{pad.name}</span>
              <button
                onClick={() => { setShowMenu(false); setShowEffects(false); setShowColorPicker(false); }}
                className="p-0.5 rounded hover:bg-muted transition-colors"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>

            {/* Volume - Pro feature */}
            {isPro ? (
              <div className="flex items-center gap-2 px-1 py-1">
                <Volume2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <Slider
                  value={[volume * 100]}
                  onValueChange={([v]) => onVolumeChange?.(pad.id, v / 100)}
                  onReset={() => onVolumeChange?.(pad.id, 0.7)}
                  min={0}
                  max={100}
                  step={1}
                  className="flex-1"
                />
                <span className="text-xs text-muted-foreground w-8 text-right tabular-nums">{volumePercent}%</span>
              </div>
            ) : (
              <LockedRow label="Volume individual" feature="volume individual" />
            )}

            {/* Pan - Pro feature */}
            {isPro ? (
              <PanControl
                label="Pan"
                pan={pan}
                onPanChange={(p) => onPanChange?.(pad.id, p)}
                compact
              />
            ) : (
              <LockedRow label="Pan (L/R)" feature="controle de panorâmica" />
            )}

            <div className="h-px bg-border" />

            {/* Rename - always available */}
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

            {/* Color picker - always available */}
            <button
              className={`flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md transition-colors ${
                showColorPicker ? 'text-primary bg-primary/10' : 'text-foreground hover:bg-muted'
              }`}
              onClick={() => setShowColorPicker(prev => !prev)}
            >
              <Palette className="h-3.5 w-3.5" />
              Alterar cor
              {customColor && (
                <span
                  className="ml-auto w-3 h-3 rounded-full border border-border"
                  style={{ backgroundColor: `hsl(${padColorToHsl(customColor)} / ${customColor.opacity})` }}
                />
              )}
            </button>
            {showColorPicker && (
              <PadColorPicker
                color={customColor || { hue: 0, saturation: 75, lightness: 55, opacity: 1 }}
                onChange={(c) => onColorChange?.(pad.id, c)}
              />
            )}

            {isPro ? (
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
            ) : (
              <LockedRow label="Importar som ilimitado" feature="importação de sons" />
            )}

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

            {/* Effects - Master tier */}
            <div className="h-px bg-border" />
            {isMaster ? (
              <>
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
            ) : (
              <LockedMasterRow label="Efeitos de áudio" feature="efeitos de áudio" />
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
