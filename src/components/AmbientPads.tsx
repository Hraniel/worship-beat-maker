import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Play, Pause, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useFeatureGates } from '@/hooks/useFeatureGates';
import UpgradeGateModal, { type UpgradeGatePayload } from '@/components/UpgradeGateModal';

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
}

const AmbientPads: React.FC<AmbientPadsProps> = ({ panDisabled }) => {
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
    // Check feature gate before allowing interaction
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
      toast.error(`Erro no pad: ${e?.message || 'desconhecido'}`);
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
    toast.success(`Pad ${note} restaurado para sintetizado`);
  }, []);

  const handlePlayPause = useCallback(() => {
    if (isPaused) {
      // Resume paused notes
      pausedNotesRef.current.forEach(note => startAmbientNote(note));
      setActiveNotes(new Set(pausedNotesRef.current));
      setIsPaused(false);
      pausedNotesRef.current = [];
    } else {
      // Pause active notes
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

        <div className="flex gap-1">
          {/* Note grid */}
          <div className="grid grid-cols-6 gap-[2px] md:gap-1 flex-1 ambient-grid">
            {ALL_NOTES.map((note) => {
              const isActive = activeNotes.has(note);
              const isCustom = customNotes.has(note);
              return (
                <button
                  key={note}
                  onClick={() => !loading && handleToggle(note)}
                  disabled={loading || isLocked}
                  className={`
                    relative flex items-center justify-center rounded-[5px]
                    transition-all duration-150 select-none
                    h-6 md:h-10 text-[10px] md:text-xs font-semibold tracking-wide
                    ${loading || isLocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer active:scale-95'}
                    ${isActive
                      ? 'text-foreground ring-1 ring-foreground/30'
                      : 'text-muted-foreground hover:text-foreground/80'}
                  `}
                  style={{
                    backgroundColor: isActive ? 'hsl(0 0% 18%)' : 'hsl(0 0% 11%)',
                    boxShadow: isActive
                      ? 'inset 0 0 0 1px hsl(0 0% 28%), 0 0 10px hsl(0 0% 100% / 0.05)'
                      : 'inset 0 0 0 1px hsl(0 0% 15%)',
                  }}>
                  {note}
                  {isCustom &&
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[5px] opacity-40">MP3</span>
                  }
                  {isActive &&
                    <span className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full animate-pulse bg-primary" />
                  }
                </button>
              );
            })}
          </div>

          {/* Right: play/pause */}
          {showPlayPause && (
            <div className="flex flex-col items-center justify-end py-0.5 w-7 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-foreground hover:text-foreground"
                onClick={handlePlayPause}
                title={isPaused ? 'Retomar' : 'Pausar'}
              >
                {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
              </Button>
            </div>
          )}
        </div>

        {loading && (
          <p className="text-[9px] text-primary text-center animate-pulse mt-1">
            Carregando...
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

