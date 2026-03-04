import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Play, Pause, Minus, Plus, Lock, Gauge } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { enableMetronome, disableMetronome, onMetronomeBeat, setSyncEnabled, isSyncEnabled } from '@/lib/loop-engine';
import { useFeatureGates } from '@/hooks/useFeatureGates';
import UpgradeGateModal, { type UpgradeGatePayload } from '@/components/UpgradeGateModal';
import { useTranslation } from 'react-i18next';

interface MetronomeProps {
  bpm: number;
  onBpmChange: (bpm: number) => void;
  timeSignature: string;
  onTimeSignatureChange: (ts: string) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onBeat?: (beat: number) => void;
  songKey?: string | null;
  onKeyChange?: (key: string) => void;
  onUpgradeGate?: (payload: UpgradeGatePayload) => void;
}

const TIME_SIGNATURES = ['4/4', '3/4', '6/8'];

const Metronome: React.FC<MetronomeProps> = ({
  bpm, onBpmChange, timeSignature, onTimeSignatureChange, isPlaying, onTogglePlay, onBeat, songKey, onKeyChange, onUpgradeGate
}) => {
  const { t } = useTranslation();
  const { canAccess } = useFeatureGates();
  const [syncOn, setSyncOn] = useState(() => {
    const stored = localStorage.getItem('drum-pads-sync-enabled');
    const val = stored === null ? true : stored === 'true';
    setSyncEnabled(val);
    return val;
  });
  const [editingKey, setEditingKey] = useState(false);
  const [editKeyValue, setEditKeyValue] = useState('');
  const keyInputRef = useRef<HTMLInputElement>(null);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [beatTick, setBeatTick] = useState(0);
  const [localBpm, setLocalBpm] = useState(bpm);
  const [editingBpm, setEditingBpm] = useState(false);
  const [editBpmValue, setEditBpmValue] = useState('');
  const debounceRef = useRef<number | null>(null);
  const pendingBpmRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const beatsPerMeasure = parseInt(timeSignature.split('/')[0]);

  // Sync localBpm when bpm changes externally
  useEffect(() => { setLocalBpm(bpm); }, [bpm]);

  const applyBpm = useCallback((val: number) => {
    const clamped = Math.max(40, Math.min(240, val));
    if (isPlaying) {
      pendingBpmRef.current = clamped;
      setLocalBpm(clamped);
    } else {
      setLocalBpm(clamped);
      onBpmChange(clamped);
    }
  }, [isPlaying, onBpmChange]);

  const handleBpmSlider = useCallback((val: number) => {
    setLocalBpm(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      applyBpm(val);
    }, 400);
  }, [applyBpm]);

  const handleBpmButton = useCallback((val: number) => {
    applyBpm(val);
  }, [applyBpm]);

  // Click on BPM number to edit
  const handleBpmClick = useCallback(() => {
    setEditBpmValue(String(localBpm));
    setEditingBpm(true);
    setTimeout(() => inputRef.current?.select(), 50);
  }, [localBpm]);

  const commitBpmEdit = useCallback(() => {
    setEditingBpm(false);
    const val = parseInt(editBpmValue);
    if (!isNaN(val) && val >= 40 && val <= 240) {
      applyBpm(val);
    }
  }, [editBpmValue, applyBpm]);

  const handleBpmKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitBpmEdit();
    if (e.key === 'Escape') setEditingBpm(false);
  }, [commitBpmEdit]);

  useEffect(() => {
    const handler = (beat: number) => {
      setCurrentBeat(beat);
      setBeatTick(t => t + 1);
      onBeat?.(beat);
      if (beat === 0 && pendingBpmRef.current !== null) {
        const pending = pendingBpmRef.current;
        pendingBpmRef.current = null;
        onBpmChange(pending);
      }
    };
    const unsubscribe = onMetronomeBeat(handler);
    return () => unsubscribe?.();
  }, [onBeat, onBpmChange]);

  useEffect(() => {
    if (isPlaying) {
      enableMetronome(0.3);
    } else {
      disableMetronome();
      setCurrentBeat(0);
      if (pendingBpmRef.current !== null) {
        onBpmChange(pendingBpmRef.current);
        pendingBpmRef.current = null;
      }
    }
    return () => {
      disableMetronome();
    };
  }, [isPlaying, onBpmChange]);

  return (
    <div className="flex flex-col gap-2 px-3 py-2">
      {/* BPM slider row — volume-style */}
      <div className="flex items-center gap-1.5">
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => handleBpmButton(Math.max(40, localBpm - 1))}>
          <Minus className="h-3 w-3" />
        </Button>
        <div className="flex-1 flex items-center gap-2">
          <Gauge className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <Slider
            value={[localBpm]}
            onValueChange={([v]) => handleBpmSlider(v)}
            min={40}
            max={240}
            step={1}
            className="flex-1"
          />
          {editingBpm ? (
            <input
              ref={inputRef}
              type="number"
              value={editBpmValue}
              onChange={(e) => setEditBpmValue(e.target.value)}
              onBlur={commitBpmEdit}
              onKeyDown={handleBpmKeyDown}
              className="w-12 h-6 text-xs font-bold text-center bg-muted border border-primary rounded px-1 focus:outline-none text-foreground tabular-nums"
              min={40}
              max={240}
            />
          ) : (
            <button
              className="text-xs font-bold text-muted-foreground tabular-nums hover:bg-muted rounded px-1.5 py-0.5 transition-colors shrink-0 min-w-[36px] text-center"
              onClick={handleBpmClick}
              title={t('metronome.editBpmTitle')}
            >
              {localBpm}
            </button>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => handleBpmButton(Math.min(240, localBpm + 1))}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Button
          onClick={onTogglePlay}
          variant="outline"
          size="sm"
          className={`h-7 px-3 text-xs gap-1 ${isPlaying ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90 border-destructive' : 'border-green-500 bg-green-500 text-white hover:bg-green-600'}`}
        >
          {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          {isPlaying ? t('metronome.stop') : t('metronome.play')}
        </Button>

        <div className="flex gap-0.5 ml-1">
          {TIME_SIGNATURES.map((ts) => (
            <Button
              key={ts}
              variant={timeSignature === ts ? "default" : "outline"}
              size="sm"
              className="text-[10px] px-1.5 h-7"
              onClick={() => onTimeSignatureChange(ts)}
            >
              {ts}
            </Button>
          ))}
        </div>

        <Button
          variant={syncOn ? "default" : "outline"}
          size="sm"
          className="text-[10px] px-1.5 h-7 ml-1 gap-0.5"
          onClick={() => {
            const check = canAccess('sync');
            if (!check.allowed) {
              onUpgradeGate?.({ gateKey: 'sync', gateLabel: check.gate?.gate_label || 'Sync', requiredTier: check.requiredTier || 'master' });
              return;
            }
            const next = !syncOn;
            setSyncOn(next);
            setSyncEnabled(next);
            localStorage.setItem('drum-pads-sync-enabled', String(next));
          }}
        >
          {!canAccess('sync').allowed && <Lock className="h-2.5 w-2.5" />}
          Sync
        </Button>

        {/* Key editable field */}
        {onKeyChange && (
          <div className="flex items-center gap-1 ml-1">
            <span className="text-[10px] text-muted-foreground">{t('metronome.key')}:</span>
            {editingKey ? (
              <input
                ref={keyInputRef}
                value={editKeyValue}
                onChange={(e) => setEditKeyValue(e.target.value.toUpperCase())}
                onBlur={() => {
                  setEditingKey(false);
                  if (editKeyValue.trim()) onKeyChange(editKeyValue.trim());
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { setEditingKey(false); if (editKeyValue.trim()) onKeyChange(editKeyValue.trim()); }
                  if (e.key === 'Escape') setEditingKey(false);
                }}
                className="w-12 h-7 text-[11px] font-bold text-center bg-muted border border-primary rounded px-1 focus:outline-none"
                maxLength={4}
                placeholder="C#m"
              />
            ) : (
              <button
                onClick={() => { setEditKeyValue(songKey || ''); setEditingKey(true); setTimeout(() => keyInputRef.current?.select(), 30); }}
                className={`h-7 px-2 rounded text-[11px] font-bold border transition-colors hover:border-primary ${songKey ? 'bg-primary/10 text-primary border-primary/30' : 'bg-muted text-muted-foreground border-border'}`}
                title={t('metronome.editBpmTitle')}
              >
                {songKey || '—'}
              </button>
            )}
          </div>
        )}

        {/* Beat indicator */}
        <div className="flex gap-1 ml-auto">
          {Array.from({ length: beatsPerMeasure }).map((_, i) => (
            <div
              key={isPlaying && currentBeat === i ? `${i}-${beatTick}` : i}
              className={`w-2 h-2 rounded-full transition-colors ${
                isPlaying && currentBeat === i
                  ? i === 0
                    ? 'bg-primary animate-beat-flash'
                    : 'bg-foreground/70 animate-beat-flash'
                  : 'bg-muted-foreground/20'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Metronome;
