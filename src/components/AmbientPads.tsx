import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Volume2, StopCircle, Upload, X, Lock } from 'lucide-react';
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
  const [editMode, setEditMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingNoteRef = useRef<NoteName | null>(null);

  const samplesLoadedRef = useRef(false);

  // Lazy-load samples on first user interaction (ensures AudioContext is allowed)
  const ensureSamplesLoaded = useCallback(async () => {
    if (samplesLoadedRef.current) return;
    samplesLoadedRef.current = true;
    await initAmbientSamples();
    const notes = await getAllAmbientSoundNotes();
    setCustomNotes(new Set(notes));
  }, []);

  // Eagerly preload samples in background on mount
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    ensureSamplesLoaded().then(() => setLoading(false));
  }, [ensureSamplesLoaded]);

  const handleToggle = useCallback(async (note: NoteName) => {
    if (editMode) {
      pendingNoteRef.current = note;
      fileInputRef.current?.click();
      return;
    }
    if (!samplesLoadedRef.current) {
      setLoading(true);
      await ensureSamplesLoaded();
      setLoading(false);
    }
    const isNowActive = toggleAmbientNote(note);
    if (isNowActive) {
      setActiveNotes(new Set([note]));
    } else {
      setActiveNotes(new Set());
    }
  }, [editMode, ensureSamplesLoaded]);

  const handleFileImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const note = pendingNoteRef.current;
    if (!file || !note) return;

    if (!file.type.startsWith('audio/')) {
      toast.error('Selecione um arquivo de áudio (MP3/WAV)');
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      await saveAmbientSound(note, arrayBuffer, file.name);

      // If note is currently playing, restart with new sample
      const wasActive = isAmbientNoteActive(note);
      if (wasActive) stopAmbientNote(note);
      await loadAmbientSample(note);
      if (wasActive) startAmbientNote(note);

      setCustomNotes((prev) => new Set([...prev, note]));
      toast.success(`Pad ${note} importado: ${file.name}`);
    } catch (err) {
      toast.error('Erro ao importar arquivo');
      console.error(err);
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
    pendingNoteRef.current = null;
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
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleFileImport} />


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
            <Button
            variant={editMode ? 'default' : 'ghost'}
            size="sm"
            className="h-7 px-2 text-xs gap-1"
            onClick={() => setEditMode((p) => !p)}>

              <Upload className="h-3 w-3" />
              {editMode ? 'Pronto' : 'Importar'}
            </Button>
            {hasActive &&
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={handleStopAll}>
                <StopCircle className="h-3 w-3" />
                Parar
              </Button>
          }
          </div>

          {editMode &&
        <p className="text-[10px] text-primary text-center animate-pulse">
              Toque em uma nota para importar seu arquivo MP3
            </p>
        }

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
          <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-12">
            {ALL_NOTES.map((note) => {
            const isActive = activeNotes.has(note);
            const isCustom = customNotes.has(note);
            const color = NOTE_COLORS[note];
            const isSharp = note.includes('#');
            return (
              <button
                key={note}
                onClick={() => handleToggle(note)}
                className={`
                    relative flex items-center justify-center rounded-md
                    border transition-all duration-200 select-none cursor-pointer
                    h-10 sm:h-12 text-xs font-bold text-foreground
                    ${isSharp ? 'text-[10px]' : ''}
                    ${editMode ? 'ring-2 ring-primary/30 animate-pulse' : ''}
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
                  {editMode && isCustom &&
                <button
                  onClick={(e) => handleRemoveCustom(note, e)}
                  className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-3.5 h-3.5 flex items-center justify-center z-10">

                      <X className="h-2.5 w-2.5" />
                    </button>
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
            {editMode ?
          'Clique em uma nota para substituir por seu MP3 • Clique no X para remover' :
          'Toque para ativar/desativar acordes sustentados'}
          </p>
        </div>
      }
    </div>);

};

export default AmbientPads;