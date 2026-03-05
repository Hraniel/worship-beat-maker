import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Play, Pause, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useFeatureGates } from '@/hooks/useFeatureGates';
import UpgradeGateModal, { type UpgradeGatePayload } from '@/components/UpgradeGateModal';
import { useTranslation } from 'react-i18next';

import {
  ALL_NOTES,
  type NoteName,
  toggleAmbientNote,
  stopAllAmbient,
  isAmbientNoteActive,
  loadAmbientSample,
  initAmbientSamples,
  stopAmbientNote,
  startAmbientNote,
} from '@/lib/ambient-engine';
import { saveAmbientSound, deleteAmbientSound, getAllAmbientSoundNotes } from '@/lib/ambient-sound-store';
import { emitPadHit } from './MixerStrip';

interface AmbientPadsProps {
  panDisabled?: boolean;
  /** When true, renders larger buttons for the dedicated full-page view */
  fullPage?: boolean;
}

const AmbientPads: React.FC<AmbientPadsProps> = ({ panDisabled, fullPage }) => {
  const { t } = useTranslation();
  const { tier } = useSubscription();
  const { canAccess } = useFeatureGates();
  const [upgradeGate, setUpgradeGate] = useState<UpgradeGatePayload | null>(null);
  const [activeNotes, setActiveNotes] = useState<Set<NoteName>>(new Set());
  const [customNotes, setCustomNotes] = useState<Set<string>>(new Set());
  const [isPaused, setIsPaused] = useState(false);
  const pausedNotesRef = useRef<NoteName[]>([]);
  const togglingRef = useRef(false);

  const samplesLoadedRef = useRef(false);

  const ensureSamplesLoaded = useCallback(async () => {
    if (samplesLoadedRef.current) return;
    samplesLoadedRef.current = true;
    try {
      await initAmbientSamples();
      const notes = await getAllAmbientSoundNotes();
      setCustomNotes(new Set(notes));
    } catch (e) {
      console.error('[AmbientPads] Init failed:', e);
      samplesLoadedRef.current = false;
    }
  }, []);

  const [loading, setLoading] = useState(false);
  useEffect(() => {
    ensureSamplesLoaded();
  }, [ensureSamplesLoaded]);

  const handleToggle = useCallback(async (note: NoteName) => {
    const gateResult = canAccess('ambient_pads');
    if (!gateResult.allowed && gateResult.gate) {
      setUpgradeGate({
        gateKey: 'ambient_pads',
        gateLabel: gateResult.gate.gate_label,
        requiredTier: gateResult.requiredTier!,
      });
      return;
    }

    if (togglingRef.current) return;
    togglingRef.current = true;
    setLoading(true);
    try {
      const isNowActive = await toggleAmbientNote(note);
      if (isNowActive) {
        setActiveNotes(new Set([note]));
        setIsPaused(false);
        pausedNotesRef.current = [];
        emitPadHit('ambient');
      } else {
        setActiveNotes(new Set());
        setIsPaused(false);
        pausedNotesRef.current = [];
      }
    } catch (e: any) {
      console.error('[AmbientPads] Toggle error:', e);
      toast.error(t('ambient.padError', { msg: e?.message || 'unknown' }));
    }
    setLoading(false);
    togglingRef.current = false;
  }, [canAccess]);

  const handleRemoveCustom = useCallback(async (note: NoteName, e: React.MouseEvent) => {
    e.stopPropagation();
    const wasActive = isAmbientNoteActive(note);
    if (wasActive) stopAmbientNote(note);
    await deleteAmbientSound(note);
    await loadAmbientSample(note);
    if (wasActive) startAmbientNote(note);
    setCustomNotes((prev) => {
      const next = new Set(prev);
      next.delete(note);
      return next;
    });
    toast.success(t('ambient.restoredToSynth', { note }));
  }, []);

  const handlePlayPause = useCallback(() => {
    if (isPaused) {
      pausedNotesRef.current.forEach(note => startAmbientNote(note));
      setActiveNotes(new Set(pausedNotesRef.current));
      setIsPaused(false);
      pausedNotesRef.current = [];
    } else {
      const notes = Array.from(activeNotes) as NoteName[];
      notes.forEach(note => stopAmbientNote(note));
      pausedNotesRef.current = notes;
      setActiveNotes(new Set());
      setIsPaused(true);
    }
  }, [isPaused, activeNotes]);

  const hasActive = activeNotes.size > 0;
  const showPlayPause = hasActive || isPaused;
  const isLocked = !canAccess('ambient_pads').allowed;

  return (
    <>
      <div className="w-full relative">
        {/* Lock overlay */}
        {isLocked && (
          <button
            className="absolute inset-0 z-10 flex items-center justify-center gap-1.5 rounded-[5px] cursor-pointer group"
            style={{ background: 'hsl(0 0% 0% / 0.55)', backdropFilter: 'blur(1px)' }}
            onClick={() => {
              const r = canAccess('ambient_pads');
              if (!r.allowed && r.gate) {
                setUpgradeGate({ gateKey: 'ambient_pads', gateLabel: r.gate.gate_label, requiredTier: r.requiredTier! });
              }
            }}
          >
            <Lock className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />
            <span className="text-[10px] font-semibold text-muted-foreground group-hover:text-foreground transition-colors">Pro</span>
          </button>
        )}

        <div className={fullPage ? "flex flex-col gap-2" : "flex gap-1"}>
          {/* Note grid */}
          <div className={
            fullPage
              ? "grid grid-cols-4 md:grid-cols-6 gap-2 flex-1 ambient-grid"
              : "grid grid-cols-6 gap-[2px] md:gap-1.5 flex-1 ambient-grid"
          }>
            {ALL_NOTES.map((note) => {
              const isActive = activeNotes.has(note);
              const isCustom = customNotes.has(note);
              return (
                <button
                  key={note}
                  onClick={() => !loading && handleToggle(note)}
                  disabled={loading || isLocked}
                  className={`
                    relative flex items-center justify-center
                    transition-all duration-150 select-none
                    ${fullPage
                      ? 'h-11 md:h-12 text-sm font-bold tracking-wider rounded-lg'
                      : 'h-6 md:h-9 text-[10px] md:text-xs font-semibold tracking-wide rounded-[5px]'
                    }
                    ${loading || isLocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer active:scale-95'}
                    ${isActive
                      ? 'text-foreground ring-1 ring-foreground/30'
                      : 'text-muted-foreground hover:text-foreground/80'}
                  `}
                  style={{
                    backgroundColor: isActive
                      ? fullPage ? 'hsl(0 0% 100% / 0.1)' : 'hsl(0 0% 100% / 0.08)'
                      : fullPage ? 'hsl(0 0% 100% / 0.04)' : 'hsl(0 0% 100% / 0.03)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    boxShadow: isActive
                      ? fullPage
                        ? 'inset 0 0 0 1.5px hsl(0 0% 100% / 0.15), 0 0 14px hsl(0 0% 100% / 0.05)'
                        : 'inset 0 0 0 1px hsl(0 0% 100% / 0.12), 0 0 10px hsl(0 0% 100% / 0.03)'
                      : fullPage
                        ? 'inset 0 0 0 1px hsl(0 0% 100% / 0.06)'
                        : 'inset 0 0 0 1px hsl(0 0% 100% / 0.05)',
                  }}>
                  {note}
                  {isCustom &&
                    <span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 opacity-40 ${fullPage ? 'text-[7px]' : 'text-[5px]'}`}>MP3</span>
                  }
                  {isActive &&
                    <span className={`absolute top-1 right-1 rounded-full animate-pulse bg-primary ${fullPage ? 'w-1.5 h-1.5' : 'w-1 h-1'}`} />
                  }
                </button>
              );
            })}
          </div>

          {/* Play/pause */}
          {showPlayPause && (
            <div className={
              fullPage
                ? "flex items-center justify-center py-1"
                : "flex flex-col items-center justify-end py-0.5 w-7 shrink-0"
            }>
              <Button
                variant="ghost"
                size="icon"
                className={fullPage ? "h-8 w-8 text-foreground hover:text-foreground" : "h-5 w-5 text-foreground hover:text-foreground"}
                onClick={handlePlayPause}
                title={isPaused ? t('ambient.resume') : t('ambient.pause')}
              >
                {isPaused ? <Play className={fullPage ? "h-5 w-5" : "h-3 w-3"} /> : <Pause className={fullPage ? "h-5 w-5" : "h-3 w-3"} />}
              </Button>
            </div>
          )}
        </div>

        {loading && (
          <p className="text-[9px] text-primary text-center animate-pulse mt-1">
            {t('ambient.loading')}
          </p>
        )}
      </div>

      {upgradeGate && (
        <UpgradeGateModal
          payload={upgradeGate}
          onClose={() => setUpgradeGate(null)}
        />
      )}
    </>
  );
};

export default AmbientPads;
