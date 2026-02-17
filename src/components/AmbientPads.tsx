import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Volume2, StopCircle, Lock } from 'lucide-react';
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
  getAmbientPan,
  getAmbientAnalyserNode,
} from '@/lib/ambient-engine';
import { saveAmbientSound, deleteAmbientSound, getAllAmbientSoundNotes } from '@/lib/ambient-sound-store';

interface AmbientPadsProps {
  panDisabled?: boolean;
}

const AmbientPads: React.FC<AmbientPadsProps> = ({ panDisabled }) => {
  const { tier } = useSubscription();
  const isMaster = tier === 'master';
  // expanded state removed - always visible now
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

  // Auto-expand no longer needed - always visible

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

  // VU meter animation
  const vuBarsRef = useRef<number[]>(new Array(8).fill(0));
  const [vuBars, setVuBars] = useState<number[]>(new Array(8).fill(0));
  const vuAnimRef = useRef<number>(0);

  useEffect(() => {
    if (!hasActive) {
      if (vuAnimRef.current) cancelAnimationFrame(vuAnimRef.current);
      setVuBars(new Array(8).fill(0));
      return;
    }

    let analyser: AnalyserNode;
    try {
      analyser = getAmbientAnalyserNode();
    } catch {
      return;
    }

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteFrequencyData(dataArray);
      const bars = vuBarsRef.current;
      const binSize = Math.floor(dataArray.length / 8);
      for (let i = 0; i < 8; i++) {
        let sum = 0;
        for (let j = 0; j < binSize; j++) {
          sum += dataArray[i * binSize + j];
        }
        const avg = sum / binSize / 255;
        // Smooth decay
        bars[i] = Math.max(avg, bars[i] * 0.88);
      }
      setVuBars([...bars]);
      vuAnimRef.current = requestAnimationFrame(tick);
    };

    vuAnimRef.current = requestAnimationFrame(tick);
    return () => {
      if (vuAnimRef.current) cancelAnimationFrame(vuAnimRef.current);
    };
  }, [hasActive]);

  return (
    <div className="w-full">
      <div className="flex gap-1">
            {/* Left: Volume fader (mixing console style) */}
            <div
              className="flex flex-col items-center py-0.5 w-5 shrink-0 touch-none"
              onPointerDown={(e) => {
                setDraggingVolume(true);
                (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
              }}
              onPointerUp={() => setDraggingVolume(false)}
              onPointerLeave={() => setDraggingVolume(false)}
            >
              <div
                className="relative flex-1 w-[3px] rounded-full"
                style={{ backgroundColor: 'hsl(0 0% 20%)', minHeight: '50px' }}
                onPointerDown={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const y = Math.max(0, Math.min(1, (rect.bottom - e.clientY) / rect.height));
                  handleVolumeChange([y * 100]);
                }}
                onPointerMove={(e) => {
                  if (!draggingVolume) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const y = Math.max(0, Math.min(1, (rect.bottom - e.clientY) / rect.height));
                  handleVolumeChange([y * 100]);
                }}
              >
                {/* Fill */}
                <div
                  className="absolute bottom-0 left-0 w-full rounded-full"
                  style={{
                    height: `${volume * 100}%`,
                    backgroundColor: 'hsl(0 0% 45%)',
                  }}
                />
                {/* Thumb */}
                <div
                  className="absolute left-1/2 -translate-x-1/2 w-3 h-[6px] rounded-[1px]"
                  style={{
                    bottom: `calc(${volume * 100}% - 3px)`,
                    backgroundColor: 'hsl(0 0% 70%)',
                    boxShadow: '0 1px 3px hsl(0 0% 0% / 0.4)',
                  }}
                />
              </div>

              <ZoomPopup visible={draggingVolume}>
                <Volume2 className="h-6 w-6 text-foreground" />
                <span className="text-2xl font-bold text-foreground tabular-nums">{Math.round(volume * 100)}%</span>
                <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-75" style={{ width: `${volume * 100}%` }} />
                </div>
              </ZoomPopup>
            </div>

            {/* VU Meter bars */}
            <div className="flex flex-col items-end justify-end gap-[1px] w-3 shrink-0 py-0.5">
              {vuBars.slice(0, 6).map((level, i) => {
                const barHeight = Math.max(2, level * 100);
                const isHot = level > 0.7;
                const isWarm = level > 0.4;
                return (
                  <div key={i} className="w-full flex items-end" style={{ height: '12px' }}>
                    <div
                      className="w-full rounded-[1px] transition-all duration-75"
                      style={{
                        height: `${barHeight}%`,
                        backgroundColor: isHot
                          ? 'hsl(0 70% 55%)'
                          : isWarm
                          ? 'hsl(45 80% 55%)'
                          : 'hsl(140 60% 45%)',
                        opacity: hasActive ? 0.9 : 0.15,
                        boxShadow: hasActive && level > 0.3
                          ? `0 0 4px ${isHot ? 'hsl(0 70% 55% / 0.4)' : isWarm ? 'hsl(45 80% 55% / 0.3)' : 'hsl(140 60% 45% / 0.3)'}`
                          : 'none',
                      }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Note grid */}
            <div className="grid grid-cols-6 gap-[3px] flex-1 ambient-grid">
              {ALL_NOTES.map((note) => {
                const isActive = activeNotes.has(note);
                const isCustom = customNotes.has(note);
                return (
                  <button
                    key={note}
                    onClick={() => !loading && handleToggle(note)}
                    disabled={loading}
                    className={`
                      relative flex items-center justify-center rounded-[5px]
                      transition-all duration-150 select-none
                      h-8 text-[10px] font-semibold tracking-wide
                      ${loading ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer active:scale-95'}
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

            {/* Right: pan + stop */}
            <div className="flex flex-col items-center justify-between py-0.5 w-7 shrink-0">
              {isMaster ? (
                <PanKnob pan={pan} onChange={handlePanChange} disabled={panDisabled} />
              ) : (
                <button
                  className="flex flex-col items-center gap-0.5"
                  onClick={() => toast('🔒 Pan disponível no plano Master')}
                  title="Pan (Master)"
                >
                  <Lock className="h-2.5 w-2.5 text-muted-foreground" />
                  <span className="text-[6px] text-primary font-medium">PAN</span>
                </button>
              )}

              {hasActive && (
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={handleStopAll} title="Parar">
                  <StopCircle className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          {loading && (
            <p className="text-[9px] text-primary text-center animate-pulse mt-1">
              Carregando...
            </p>
          )}
    </div>
  );
};

export default AmbientPads;
