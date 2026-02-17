import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Volume2, StopCircle, Lock } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useSubscription } from '@/contexts/SubscriptionContext';
import PanKnob from './PanKnob';
import ZoomPopup from './ZoomPopup';
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

interface AmbientPadsProps {
  panDisabled?: boolean;
}

const AmbientPads: React.FC<AmbientPadsProps> = ({ panDisabled }) => {
  const { tier } = useSubscription();
  const isMaster = tier === 'master';
  const [expanded, setExpanded] = useState(false);
  const [activeNotes, setActiveNotes] = useState<Set<NoteName>>(new Set());
  const [volume, setVolume] = useState(getAmbientVolume);
  const [pan, setPan] = useState(getAmbientPan);
  const [customNotes, setCustomNotes] = useState<Set<string>>(new Set());
  const togglingRef = useRef(false);
  const [draggingVolume, setDraggingVolume] = useState(false);

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

  // Listen for tutorial expand event
  useEffect(() => {
    const handler = () => setExpanded(true);
    window.addEventListener('tutorial:expand-ambient', handler);
    return () => window.removeEventListener('tutorial:expand-ambient', handler);
  }, []);

  // Listen for settings pan changes
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        setPan(detail.pan);
        setAmbientPan(detail.pan);
      }
    };
    window.addEventListener('settings:ambient-pan', handler);
    return () => window.removeEventListener('settings:ambient-pan', handler);
  }, []);

  const handleToggle = useCallback(async (note: NoteName) => {
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
    await loadAmbientSample(note);
    if (wasActive) startAmbientNote(note);
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
    // Clear side selection in settings if pan moved to center
    if (val === 0) {
      try {
        const raw = localStorage.getItem('drum-pads-audio-settings');
        if (raw) {
          const settings = JSON.parse(raw);
          if (settings.ambientSide) {
            settings.ambientSide = null;
            localStorage.setItem('drum-pads-audio-settings', JSON.stringify(settings));
            window.dispatchEvent(new CustomEvent('settings:audio-changed', { detail: settings }));
          }
        }
      } catch {}
    }
  }, []);

  const hasActive = activeNotes.size > 0;

  return (
    <div className="w-full">
      <button
        onClick={() => setExpanded((p) => !p)}
        className="flex items-center justify-between w-full px-3 py-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">Continuous Pads</span>
          {hasActive &&
            <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-medium">
              {[...activeNotes][0]} ativa
            </span>
          }
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {expanded &&
        <div className="mt-2">
          {/* Main layout: pads grid left, controls right */}
          <div className="flex gap-2">
            {/* Note grid - 4 columns, 3 rows */}
            <div className="grid grid-cols-4 landscape:grid-cols-6 gap-1.5 flex-1">
              {ALL_NOTES.map((note) => {
                const isActive = activeNotes.has(note);
                const isCustom = customNotes.has(note);
                const isSharp = note.includes('#');
                return (
                  <button
                    key={note}
                    onClick={() => !loading && handleToggle(note)}
                    disabled={loading}
                    className={`
                      relative flex items-center justify-center rounded-md
                      border transition-all duration-200 select-none
                      h-14 sm:h-16 landscape:h-12 text-xs font-bold text-foreground
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
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full animate-pulse bg-foreground" />
                    }
                  </button>
                );
              })}
            </div>

            {/* Right controls: vertical volume slider + pan knob + stop */}
            <div className="flex flex-col items-center gap-2 landscape:gap-3 py-1 w-12 landscape:w-16 shrink-0">
              <Volume2 className="h-3 w-3 text-muted-foreground shrink-0" />
              <div
                className="flex-1 flex items-center justify-center"
                style={{ minHeight: '80px' }}
                onPointerDown={() => setDraggingVolume(true)}
                onPointerUp={() => setDraggingVolume(false)}
                onPointerLeave={() => setDraggingVolume(false)}
              >
                <Slider
                  value={[volume * 100]}
                  onValueChange={handleVolumeChange}
                  min={0}
                  max={100}
                  step={1}
                  orientation="vertical"
                  className="h-full"
                />
              </div>
              <span className="text-[8px] text-muted-foreground tabular-nums">{Math.round(volume * 100)}%</span>

              <ZoomPopup visible={draggingVolume}>
                <Volume2 className="h-6 w-6 text-foreground" />
                <span className="text-2xl font-bold text-foreground tabular-nums">{Math.round(volume * 100)}%</span>
                <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-75" style={{ width: `${volume * 100}%` }} />
                </div>
              </ZoomPopup>

              {/* Pan knob */}
              {isMaster ? (
                <PanKnob pan={pan} onChange={handlePanChange} disabled={panDisabled} />
              ) : (
                <button
                  className="flex flex-col items-center gap-0.5"
                  onClick={() => toast('🔒 Pan disponível no plano Master')}
                  title="Pan (Master)"
                >
                  <Lock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[7px] text-primary font-medium">PAN</span>
                </button>
              )}

              {hasActive && (
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleStopAll} title="Parar">
                  <StopCircle className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>

          {loading && (
            <p className="text-[10px] text-primary text-center animate-pulse mt-2">
              Carregando samples... aguarde
            </p>
          )}

          <p className="text-[10px] text-muted-foreground text-center mt-2">
            Toque para ativar/desativar acordes sustentados
          </p>
        </div>
      }
    </div>
  );
};

export default AmbientPads;
