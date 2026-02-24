import React, { useCallback, useRef, useState } from 'react';
import ZoomPopup from './ZoomPopup';
import { playSound, getPadPanner, unlockAudioContext } from '@/lib/audio-engine';
import { emitPadHit } from './MixerStrip';
import { getQuantizeDelay, isLoopEngineRunning } from '@/lib/loop-engine';
import { X, Volume2, Lock, Repeat, AudioWaveform, Pencil, Settings2, Palette, Upload, Store, RefreshCw } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import type { PadSound } from '@/lib/sounds';
import { useNavigate } from 'react-router-dom';
import PadEffectsPanel from './PadEffectsPanel';
import PanControl from './PanControl';
import PadColorPicker, { type PadColor, padColorToHsl } from './PadColorPicker';
import { type PadEffects, DEFAULT_EFFECTS, getEffectInput, applyEffects, hasActiveEffects } from '@/lib/audio-effects';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useFeatureGates, type GateCheckResult } from '@/hooks/useFeatureGates';
import { toast } from 'sonner';
import StoreImportPicker from './StoreImportPicker';
import { useTranslation } from 'react-i18next';

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
  panDisabled?: boolean;
  bpm?: number;
  onToggleLoop?: () => void;
  onImportSound?: (padId: string, file: File) => void;
  onImportStoreSound?: (padId: string, soundName: string, arrayBuffer: ArrayBuffer) => void;
  onRemoveCustomSound?: (padId: string) => void;
  onVolumeChange?: (padId: string, volume: number) => void;
  onEffectsChange?: (padId: string, fx: PadEffects) => void;
  onPanChange?: (padId: string, pan: number) => void;
  customName?: string;
  onRename?: (padId: string, name: string) => void;
  customColor?: PadColor;
  onColorChange?: (padId: string, color: PadColor) => void;
  customSoundsCount?: number;
  onResetPad?: (padId: string) => void;
  onResetAllPads?: () => void;
  onGateBlocked?: (gateKey: string) => void;
  onPadPlayed?: () => void;
}

const DrumPad: React.FC<DrumPadProps> = ({
  pad, volume, isLooping, isLocked, hasCustomSound, customFileName, padSize = 'md',
  isMasterTier, effects = DEFAULT_EFFECTS, pan = 0, customName, editMode, customColor, panDisabled, customSoundsCount = 0,
  bpm,
  onToggleLoop, onImportSound, onImportStoreSound, onRemoveCustomSound, onVolumeChange, onEffectsChange, onPanChange, onRename, onColorChange,
  onResetPad, onResetAllPads, onGateBlocked, onPadPlayed
}) => {
  const [isActive, setIsActive] = useState(false);
  const { t } = useTranslation();
  const [showMenu, setShowMenu] = useState(false);
  const [showEffects, setShowEffects] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showStorePicker, setShowStorePicker] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [draggingPadVol, setDraggingPadVol] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const timeoutRef = useRef<number | null>(null);
  const longPressRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();
  const { tier, tierConfig } = useSubscription();
  const { canAccess } = useFeatureGates();

  const isPro = tier === 'pro' || tier === 'master';
  const isMaster = tier === 'master';

  const goToPricing = useCallback((gateKey: string, feature: string) => {
    const result = canAccess(gateKey);
    if (!result.allowed && result.gate && onGateBlocked) {
      onGateBlocked(gateKey);
    } else {
      toast(t('drumPad.paidFeature'), { description: t('drumPad.paidFeatureDesc', { feature }) });
      navigate('/pricing');
    }
  }, [canAccess, onGateBlocked, navigate]);

  const trigger = useCallback(() => {
    if (isLocked) {
      goToPricing('unlimited_pads', 'este pad');
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
        // Route through pad panner for pan to work
        const panner = getPadPanner(pad.id);
        playSound(pad.id, volume, panner);
      }
      emitPadHit(pad.id);
      onPadPlayed?.();
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
  }, [pad, volume, onToggleLoop, isLocked, goToPricing, isMaster, effects, onPadPlayed]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    unlockAudioContext();
    if (editMode) {
      setShowMenu(true);
      return;
    }
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
  const LockedRow = ({ label, gateKey, feature }: { label: string; gateKey: string; feature: string }) => (
    <button
      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:bg-muted rounded-md transition-colors"
      onClick={() => goToPricing(gateKey, feature)}
    >
      <Lock className="h-3.5 w-3.5" />
      {label}
      <span className="ml-auto text-[10px] text-primary font-medium">PRO</span>
    </button>
  );

  const LockedMasterRow = ({ label, gateKey, feature }: { label: string; gateKey: string; feature: string }) => (
    <button
      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:bg-muted rounded-md transition-colors"
      onClick={() => goToPricing(gateKey, feature)}
    >
      <Lock className="h-3.5 w-3.5" />
      {label}
      <span className="ml-auto text-[10px] text-primary font-medium">MASTER</span>
    </button>
  );

  return (
    <div className="relative">
      {/* File input lives outside the menu so it persists after menu closes */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.ogg,.flac,.aac,.m4a,.aiff,.aif,.wma"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            onImportSound?.(pad.id, file);
          }
          e.target.value = '';
        }}
      />
      <button
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className={`
          relative flex flex-col items-center justify-center rounded-lg
          border border-white/10 transition-all duration-75 select-none cursor-pointer
          aspect-square w-full touch-none overflow-hidden
          ${isActive && !isLocked ? 'animate-pad-pulse' : ''}
        `}
        style={{
          background: isActive
            ? (customColor ? `hsl(${colorHsl} / ${0.25 * colorOpacity})` : 'hsl(0 0% 22%)')
            : isLooping
            ? (customColor ? `hsl(${colorHsl} / ${0.08 * colorOpacity})` : colorRef(0.06))
            : 'linear-gradient(145deg, hsl(0 0% 8%) 0%, hsl(0 0% 4%) 100%)',
          boxShadow: isActive
            ? (customColor
                ? `0 0 24px hsl(${colorHsl} / ${0.45 * colorOpacity}), inset 0 0 12px hsl(${colorHsl} / ${0.15 * colorOpacity})`
                : '0 0 20px hsl(0 0% 100% / 0.25), inset 0 0 10px hsl(0 0% 100% / 0.08)')
            : isLooping
            ? (customColor ? `0 0 14px hsl(${colorHsl} / ${0.3 * colorOpacity})` : `0 0 14px ${colorRef(0.25)}`)
            : 'none',
        }}
      >
        {/* Top color bar */}
        <div
          className={`absolute top-0 left-0 right-0 h-[3px] rounded-t-lg ${isLooping ? 'animate-loop-bar' : ''}`}
          style={{
            backgroundColor: colorSolid,
            opacity: isActive ? 1 : isLooping ? undefined : 0.85,
          }}
        />

        {editMode && (
          <Settings2 className="absolute top-1.5 left-1 h-3 w-3 text-primary/70" />
        )}
        {isLocked && (
          <Lock className="absolute top-1.5 right-1 h-3 w-3 text-muted-foreground/60" />
        )}

        {/* Short name in pad color */}
        <span
          className={`${sizes.label} font-bold tracking-wider max-w-full truncate px-1 text-center`}
          style={{ color: colorSolid }}
        >
          {customName || pad.shortName}
        </span>

        {/* Full name as muted subtitle — hidden when user imported a custom sound */}
        {!hasCustomSound && (
          <span className={`${sizes.name} text-muted-foreground max-w-full truncate px-1 text-center mt-0.5`}>
            {pad.name}
          </span>
        )}

        {pad.isLoop && (
          <div className="absolute top-1.5 right-1 flex items-center gap-0.5">
            <Repeat
              className={`${sizes.loop} ${isLooping ? 'text-foreground' : 'text-muted-foreground/40'}`}
            />
            <div
              className={`w-1.5 h-1.5 rounded-full ${isLooping ? 'animate-pulse bg-foreground' : 'bg-muted-foreground/30'}`}
            />
          </div>
        )}

        {hasCustomSound && (
          <div className="absolute bottom-1 left-1 w-1.5 h-1.5 rounded-full bg-primary" />
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
                <div
                  className="flex-1"
                  onPointerDown={() => setDraggingPadVol(true)}
                  onPointerUp={() => setDraggingPadVol(false)}
                  onPointerLeave={() => setDraggingPadVol(false)}
                >
                  <Slider
                    value={[volume * 100]}
                    onValueChange={([v]) => onVolumeChange?.(pad.id, v / 100)}
                    onReset={() => onVolumeChange?.(pad.id, 0.7)}
                    min={0}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>
                <span className="text-xs text-muted-foreground w-8 text-right tabular-nums">{volumePercent}%</span>
                <ZoomPopup visible={draggingPadVol}>
                  <Volume2 className="h-6 w-6 text-foreground" />
                  <span className="text-2xl font-bold text-foreground tabular-nums">{volumePercent}%</span>
                  <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-75" style={{ width: `${volume * 100}%` }} />
                  </div>
                </ZoomPopup>
              </div>
            ) : (
              <LockedRow label={t('drumPad.individualVolume')} gateKey="individual_volume" feature={t('drumPad.individualVolume').toLowerCase()} />
            )}

            {/* Pan - Pro feature */}
            {isPro ? (
              <PanControl
                label="Pan"
                pan={pan}
                onPanChange={(p) => onPanChange?.(pad.id, p)}
                compact
                disabled={panDisabled}
              />
            ) : (
              <LockedRow label={t('drumPad.panLR')} gateKey="pan_control" feature={t('drumPad.panControl')} />
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
                {t('drumPad.rename')}
              </button>
            )}

            {/* Import sound - available for ALL pads including loops */}
            {(() => {
              const maxImports = tierConfig.maxImports;
              const atLimit = !hasCustomSound && customSoundsCount >= maxImports;
              if (atLimit) {
                return (
                  <button
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:bg-muted rounded-md transition-colors"
                    onClick={() => toast.info(t('drumPad.importLimitReached', { max: maxImports }), { description: t('drumPad.importLimitHint') })}
                  >
                    <Lock className="h-3.5 w-3.5" />
                    {t('drumPad.importSound')} {pad.isLoop ? `(${t('drumPad.importSoundLoop').split('(')[1]}` : ''}
                    <span className="ml-auto text-[10px] text-muted-foreground">{customSoundsCount}/{maxImports}</span>
                  </button>
                );
              }
              return (
                <button
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md transition-colors"
                  onClick={() => { setShowMenu(false); setTimeout(() => fileInputRef.current?.click(), 50); }}
                >
                  <Upload className="h-3.5 w-3.5" />
                  {pad.isLoop ? t('drumPad.importSoundLoop') : t('drumPad.importSound')}
                  <span className="ml-auto text-[10px] text-muted-foreground">{customSoundsCount}/{maxImports}</span>
                </button>
              );
            })()}

            {/* Import from Glory Store - available for ALL pads including loops */}
            <>
              <button
                className={`flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md transition-colors ${
                  showStorePicker ? 'text-primary bg-primary/10' : 'text-foreground hover:bg-muted'
                }`}
                onClick={() => setShowStorePicker(prev => !prev)}
              >
                <Store className="h-3.5 w-3.5" />
                {t('drumPad.importFromStore')}
              </button>
              {showStorePicker && (
                <StoreImportPicker
                  onSelect={(soundId, soundName, arrayBuffer) => {
                    onImportStoreSound?.(pad.id, soundName, arrayBuffer);
                    setShowStorePicker(false);
                    setShowMenu(false);
                  }}
                  onClose={() => setShowStorePicker(false)}
                />
              )}
            </>

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
                {t('drumPad.removeCustom')}
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
              {t('drumPad.changeColor')}
              {customColor && (
                <span
                  className="ml-auto w-3 h-3 rounded-full border border-border"
                  style={{ backgroundColor: `hsl(${padColorToHsl(customColor)} / ${customColor.opacity})` }}
                />
              )}
            </button>
            {showColorPicker && (
              <div className="space-y-2">
                <PadColorPicker
                  color={customColor || { hue: 0, saturation: 75, lightness: 55, opacity: 1 }}
                  onChange={(c) => onColorChange?.(pad.id, c)}
                />
                {customColor && (
                  <button
                    className="flex items-center justify-center gap-1.5 w-full px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors border border-border"
                    onClick={() => { onColorChange?.(pad.id, undefined as any); setShowColorPicker(false); }}
                  >
                    {t('drumPad.backToDefault')}
                  </button>
                )}
              </div>
            )}

            {/* Reset options */}
            <div className="h-px bg-border" />
            <button
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md transition-colors"
              onClick={() => { onResetPad?.(pad.id); setShowMenu(false); }}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {t('drumPad.resetThisPad')}
            </button>
            <button
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-muted rounded-md transition-colors"
              onClick={() => { onResetAllPads?.(); setShowMenu(false); }}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {t('drumPad.resetAllPads')}
            </button>

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
                  {t('drumPad.effects')}
                  {hasActiveEffects(effects) && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                </button>
                {showEffects && (
                  <PadEffectsPanel
                    effects={effects}
                    bpm={bpm}
                    onChange={(fx) => onEffectsChange?.(pad.id, fx)}
                  />
                )}
              </>
            ) : (
              <LockedMasterRow label={t('drumPad.audioEffects')} gateKey="pad_effects" feature={t('drumPad.audioEffects').toLowerCase()} />
            )}
          </div>
        </>
      )}

    </div>
  );
};

export default DrumPad;
