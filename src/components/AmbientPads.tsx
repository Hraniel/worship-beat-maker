import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Volume2, StopCircle, X, Lock } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useSubscription } from '@/contexts/SubscriptionContext';
import {
  ALL_NOTES,
  type NoteName,
  toggleAmbientNote,
  stopAllAmbient,
  isAmbientNoteActive,
  setAmbientVolume,
  getAmbientVolume,
  hasCustomSample,
  loadAmbientSample,
  initAmbientSamples,
  stopAmbientNote,
  startAmbientNote,
  setAmbientPan,
  getAmbientPan } from
'@/lib/ambient-engine';
import { saveAmbientSound, deleteAmbientSound, getAllAmbientSoundNotes } from '@/lib/ambient-sound-store';
import PanControl from '@/components/PanControl';

const NOTE_COLORS: Record<NoteName, string> = {
  C: '0 70% 55%', 'C#': '20 65% 50%', D: '35 70% 55%', 'D#': '50 65% 50%',
  E: '80 60% 50%', F: '140 55% 45%', 'F#': '170 60% 45%', G: '200 65% 50%',
  'G#': '230 60% 55%', A: '260 65% 55%', 'A#': '290 60% 50%', B: '320 65% 50%'
};

const AmbientPads: React.FC = () => {
  const { tier } = useSubscription();
  const isMaster = tier === 'master';
  const [expanded, setExpanded] = useState(false);
  const [activeNotes, setActiveNotes] = useState<Set<NoteName>>(new Set());
  const [volume, setVolume] = useState(getAmbientVolume);
  const [pan, setPan] = useState(getAmbientPan);
  const [customNotes, setCustomNotes] = useState<Set<string>>(new Set());
  const togglingRef = useRef(false);

  const samplesLoadedRef = useRef(false);

  // Background preload (non-blocking, sequential to save memory)
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
    // Prevent concurrent toggles (rapid taps causing race conditions)
    if (togglingRef.current) return;
    togglingRef.current = true;
    setLoading(true);
    try {
      const isNowActive = await toggleAmbientNote(note);
      if (isNowActive) {
        setActiveNotes(new Set([note]));
      } else {
        setActiveNotes(new Set());
      }
    } catch (e: any) {
      console.error('[AmbientPads] Toggle error:', e);
      toast.error(`Erro no pad: ${e?.message || 'desconhecido'}`);
    }
    setLoading(false);
    togglingRef.current = false;
  }, []);

  const handleRemoveCustom = useCallback(async (note: NoteName, e: React.MouseEvent) => {
    e.stopPropagation();
    const wasActive = isAmbientNoteActive(note);
    if (wasActive) stopAmbientNote(note);

    await deleteAmbientSound(note);
    await loadAmbientSample(note); // clears the buffer

    if (wasActive) startAmbientNote(note); // restart with synth
    setCustomNotes((prev) => {
      const next = new Set(prev);
      next.delete(note);
      return next;
    });
    toast.success(`Pad ${note} restaurado para sintetizado`);
  }, []);

  const handleStopAll = useCallback(() => {
    stopAllAmbient();
    setActiveNotes(new Set());
  }, []);

  const handleVolumeChange = useCallback((val: number[]) => {
    const v = val[0] / 100;
    setVolume(v);
    setAmbientVolume(v);
  }, []);

  const handlePanChange = useCallback((val: number) => {
    setPan(val);
    setAmbientPan(val);
  }, []);

  const hasActive = activeNotes.size > 0;

  return (
    <div className="w-full">


      <button
        onClick={() => setExpanded((p) => !p)}
        className="flex items-center justify-between w-full px-3 py-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">

        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground"> Ambient Pads</span>
          {hasActive &&
          <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-medium">
              {[...activeNotes][0]} ativa
            </span>
          }
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {expanded &&
      <div className="mt-2 space-y-3">
          {/* Volume + controls */}
          <div className="flex items-center gap-2 px-1">
            <Volume2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <Slider
            value={[volume * 100]}
            onValueChange={handleVolumeChange}
            min={0}
            max={100}
            step={1}
            className="flex-1" />

            <span className="text-xs text-muted-foreground w-8 text-right tabular-nums">{Math.round(volume * 100)}%</span>
            {hasActive &&
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={handleStopAll}>
                <StopCircle className="h-3 w-3" />
                Parar
              </Button>
          }
          </div>
          {isMaster ? (
            <PanControl label="Pan Ambient" pan={pan} onPanChange={handlePanChange} />
          ) : (
            <button
              className="flex items-center gap-2 w-full px-1 py-1.5 text-xs text-muted-foreground hover:bg-muted rounded-md transition-colors"
              onClick={() => toast('🔒 Pan disponível no plano Master')}
            >
              <Lock className="h-3 w-3" />
              Pan Ambient
              <span className="ml-auto text-[10px] text-primary font-medium">MASTER</span>
            </button>
          )}

          {/* Note grid */}
          <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-12 ambient-grid">
            {ALL_NOTES.map((note) => {
            const isActive = activeNotes.has(note);
            const isCustom = customNotes.has(note);
            const color = NOTE_COLORS[note];
            const isSharp = note.includes('#');
            return (
              <button
                key={note}
                onClick={() => !loading && handleToggle(note)}
                disabled={loading}
                className={`
                    relative flex items-center justify-center rounded-md
                    border transition-all duration-200 select-none
                    h-10 sm:h-12 text-xs font-bold text-foreground
                    ${loading ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                    ${isSharp ? 'text-[10px]' : ''}
                  `}
                style={{
                  backgroundColor: isActive ? 'hsl(0 0% 20%)' : 'hsl(0 0% 8%)',
                  borderColor: isActive ? 'hsl(0 0% 40%)' : 'hsl(0 0% 18%)',
                  boxShadow: isActive ? '0 0 12px hsl(0 0% 30% / 0.4)' : 'none',
                }}>

                  {note}
                  {isCustom &&
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[7px] opacity-60">
                      MP3
                    </span>
                }
                  {isActive &&
                <span
                  className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full animate-pulse bg-foreground" />

                }
                </button>);

          })}
          </div>

          {loading && (
            <p className="text-[10px] text-primary text-center animate-pulse">
              Carregando samples... aguarde
            </p>
          )}

          <p className="text-[10px] text-muted-foreground text-center">
            Toque para ativar/desativar acordes sustentados
          </p>
        </div>
      }
    </div>);

};

export default AmbientPads;