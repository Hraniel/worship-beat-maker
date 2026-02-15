import React, { useState, useCallback, useEffect, useRef } from 'react';
import PadGrid from '@/components/PadGrid';
import Metronome from '@/components/Metronome';
import VolumeControl from '@/components/VolumeControl';
import SetlistManager from '@/components/SetlistManager';
import { setMasterVolume, getAudioContext, loadCustomBuffer, removeCustomBuffer, setMasterPan, setMetronomePan, setPadPan } from '@/lib/audio-engine';
import { defaultPads, type SetlistSong } from '@/lib/sounds';
import { saveCustomSound, getCustomSound, deleteCustomSound, getAllCustomSoundIds } from '@/lib/custom-sound-store';
import { addLoop, removeLoop, setLoopBpm, setLoopTimeSignature, updateLoopVolume, stopAllLoops } from '@/lib/loop-engine';
import { type PadEffects, loadAllEffects, saveAllEffects, applyEffects } from '@/lib/audio-effects';
import { useAuth } from '@/contexts/AuthContext';
import { useSetlists } from '@/hooks/useSetlists';
import { LogOut, Crown, ChevronUp, ChevronDown, Minus, Plus, Maximize, Minimize } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import PanControl from '@/components/PanControl';

const CUSTOM_NAMES_KEY = 'drum-pads-custom-names';
const PAD_SIZE_KEY = 'drum-pads-pad-size';
const FOCUS_MODE_KEY = 'drum-pads-focus-mode';

function loadCustomNames(): Record<string, string> {
  try {
    const data = localStorage.getItem(CUSTOM_NAMES_KEY);
    return data ? JSON.parse(data) : {};
  } catch { return {}; }
}

function saveCustomNames(names: Record<string, string>) {
  localStorage.setItem(CUSTOM_NAMES_KEY, JSON.stringify(names));
}

type PadSize = 'sm' | 'md' | 'lg';
const PAD_SIZES: PadSize[] = ['sm', 'md', 'lg'];

function loadPadSize(): PadSize {
  const v = localStorage.getItem(PAD_SIZE_KEY);
  if (v === 'sm' || v === 'md' || v === 'lg') return v;
  return 'md';
}

const Index = () => {
  const { signOut } = useAuth();
  const { setlists, createSetlist, updateSetlist, deleteSetlist, reorderSetlists } = useSetlists();
  const navigate = useNavigate();
  const [masterVolume, setMasterVol] = useState(0.7);
  const [bpm, setBpm] = useState(120);
  const [timeSignature, setTimeSignature] = useState('4/4');
  const [activeLoops, setActiveLoops] = useState<Set<string>>(new Set());
  const [padVolumes, setPadVolumes] = useState<Record<string, number>>({});
  const [currentSongId, setCurrentSongId] = useState<string | null>(null);
  const [audioReady, setAudioReady] = useState(false);
  const [customSounds, setCustomSounds] = useState<Record<string, string>>(loadCustomNames);
  const [metronomeOpen, setMetronomeOpen] = useState(true);
  const [padSize, setPadSize] = useState<PadSize>(loadPadSize);
  const [padEffects, setPadEffects] = useState<Record<string, PadEffects>>(loadAllEffects);
  const [padNames, setPadNames] = useState<Record<string, string>>(() => {
    try { const d = localStorage.getItem('drum-pads-pad-names'); return d ? JSON.parse(d) : {}; } catch { return {}; }
  });
  const [focusMode, setFocusMode] = useState(() => localStorage.getItem(FOCUS_MODE_KEY) === 'true');
  const [padPans, setPadPans] = useState<Record<string, number>>(() => {
    try { const d = localStorage.getItem('drum-pads-pad-pans'); return d ? JSON.parse(d) : {}; } catch { return {}; }
  });
  const [metronomePan, setMetronomePanState] = useState(0);

  const changePadSize = useCallback((dir: 1 | -1) => {
    setPadSize(prev => {
      const idx = PAD_SIZES.indexOf(prev);
      const next = PAD_SIZES[Math.max(0, Math.min(PAD_SIZES.length - 1, idx + dir))];
      localStorage.setItem(PAD_SIZE_KEY, next);
      return next;
    });
  }, []);

  const toggleFocusMode = useCallback(() => {
    setFocusMode(prev => {
      const next = !prev;
      localStorage.setItem(FOCUS_MODE_KEY, String(next));
      return next;
    });
  }, []);

  // Keep loop engine in sync with BPM/time signature
  const bpmRef = useRef(bpm);
  const tsRef = useRef(timeSignature);

  useEffect(() => {
    bpmRef.current = bpm;
    setLoopBpm(bpm);
  }, [bpm]);

  useEffect(() => {
    tsRef.current = timeSignature;
    setLoopTimeSignature(timeSignature);
  }, [timeSignature]);

  // Cleanup loops on unmount
  useEffect(() => {
    return () => stopAllLoops();
  }, []);

  // Init audio on first interaction
  const initAudio = useCallback(() => {
    if (!audioReady) {
      getAudioContext();
      setAudioReady(true);
    }
  }, [audioReady]);

  useEffect(() => {
    const handler = () => initAudio();
    document.addEventListener('pointerdown', handler, { once: true });
    return () => document.removeEventListener('pointerdown', handler);
  }, [initAudio]);

  // Load custom sounds from IndexedDB on mount
  useEffect(() => {
    async function loadAll() {
      const ids = await getAllCustomSoundIds();
      for (const id of ids) {
        const data = await getCustomSound(id);
        if (data) {
          try {
            await loadCustomBuffer(id, data.buffer);
          } catch (e) {
            console.warn('Failed to load custom sound:', id, e);
          }
        }
      }
    }
    loadAll();
  }, []);

  useEffect(() => {
    setMasterVolume(masterVolume);
  }, [masterVolume]);

  const toggleLoop = useCallback((padId: string) => {
    const pad = defaultPads.find(p => p.id === padId);
    if (!pad) return;

    setActiveLoops(prev => {
      const next = new Set(prev);
      if (next.has(padId)) {
        next.delete(padId);
        removeLoop(padId);
      } else {
        next.add(padId);
        const vol = padVolumes[padId] ?? 0.7;
        addLoop(pad, vol);
      }
      return next;
    });
  }, [padVolumes]);

  // Custom sound import
  const handleImportSound = useCallback(async (padId: string, file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      await loadCustomBuffer(padId, arrayBuffer);
      await saveCustomSound(padId, arrayBuffer, file.name);
      const updated = { ...customSounds, [padId]: file.name };
      setCustomSounds(updated);
      saveCustomNames(updated);
      toast.success(`Som "${file.name}" importado!`);
    } catch (e) {
      console.error('Error importing sound:', e);
      toast.error('Erro ao importar som. Verifique o formato do arquivo.');
    }
  }, [customSounds]);

  const handleRemoveCustomSound = useCallback(async (padId: string) => {
    removeCustomBuffer(padId);
    await deleteCustomSound(padId);
    const updated = { ...customSounds };
    delete updated[padId];
    setCustomSounds(updated);
    saveCustomNames(updated);
    toast.success('Som customizado removido');
  }, [customSounds]);

  const handlePadVolumeChange = useCallback((padId: string, vol: number) => {
    setPadVolumes(prev => ({ ...prev, [padId]: vol }));
    updateLoopVolume(padId, vol);
  }, []);

  const handleEffectsChange = useCallback((padId: string, fx: PadEffects) => {
    setPadEffects(prev => {
      const next = { ...prev, [padId]: fx };
      saveAllEffects(next);
      applyEffects(padId, fx);
      return next;
    });
  }, []);

  const handleRenamePad = useCallback((padId: string, name: string) => {
    setPadNames(prev => {
      const next = { ...prev };
      if (name) next[padId] = name; else delete next[padId];
      localStorage.setItem('drum-pads-pad-names', JSON.stringify(next));
      return next;
    });
  }, []);

  const handlePadPanChange = useCallback((padId: string, pan: number) => {
    setPadPans(prev => {
      const next = { ...prev, [padId]: pan };
      localStorage.setItem('drum-pads-pad-pans', JSON.stringify(next));
      return next;
    });
    setPadPan(padId, pan);
  }, []);

  const handleMetronomePanChange = useCallback((pan: number) => {
    setMetronomePanState(pan);
    setMetronomePan(pan);
  }, []);

  // Setlist management — now backed by database
  const songs = setlists.flatMap((sl) =>
    sl.songs.length > 0 ? sl.songs.map((s) => ({ ...s, id: sl.id, _setlistId: sl.id })) : [{ 
      id: sl.id, name: sl.name, bpm: 120, timeSignature: '4/4', 
      pads: defaultPads, padVolumes: {}, _setlistId: sl.id 
    }]
  );

  // Auto-save current song before switching
  const autoSaveCurrentSong = useCallback(async () => {
    if (!currentSongId) return;
    const setlist = setlists.find(s => s.id === currentSongId);
    if (!setlist) return;
    const updatedSong: SetlistSong = {
      id: setlist.songs[0]?.id || currentSongId,
      name: setlist.name,
      bpm,
      timeSignature,
      pads: defaultPads,
      padVolumes: { ...padVolumes },
    };
    await updateSetlist(currentSongId, [updatedSong]);
  }, [currentSongId, bpm, timeSignature, padVolumes, setlists, updateSetlist]);

  const handleSaveSong = useCallback(async (name: string) => {
    const song: SetlistSong = {
      id: Date.now().toString(),
      name,
      bpm,
      timeSignature,
      pads: defaultPads,
      padVolumes: { ...padVolumes },
    };
    const result = await createSetlist(name, [song]);
    if (result) setCurrentSongId(result.id);
  }, [bpm, timeSignature, padVolumes, createSetlist]);

  const handleLoadSong = useCallback(async (song: SetlistSong) => {
    // Auto-save current song first
    await autoSaveCurrentSong();
    // Load the new song
    setBpm(song.bpm);
    setTimeSignature(song.timeSignature);
    setPadVolumes(song.padVolumes || {});
    setCurrentSongId((song as any)._setlistId || song.id);
    stopAllLoops();
    setActiveLoops(new Set());
  }, [autoSaveCurrentSong]);

  const handleDeleteSong = useCallback(async (id: string) => {
    await deleteSetlist(id);
    if (currentSongId === id) setCurrentSongId(null);
  }, [deleteSetlist, currentSongId]);

  return (
    <div className="flex flex-col h-[100dvh] bg-background overflow-hidden" onPointerDown={initAudio}>
      {/* Header - hidden in focus mode */}
      {!focusMode && (
        <header className="flex items-center justify-between px-3 py-2 border-b border-border bg-card/50 backdrop-blur shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-primary">🥁</span>
            <h1 className="text-sm font-bold text-foreground tracking-tight hidden sm:block">Drum Pads Worship</h1>
            <h1 className="text-sm font-bold text-foreground tracking-tight sm:hidden">DPW</h1>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Pad size controls */}
            <div className="flex items-center gap-0.5 mr-1 border border-border rounded-md">
              <button
                onClick={() => changePadSize(-1)}
                disabled={padSize === 'sm'}
                className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                title="Diminuir pads"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="text-[10px] text-muted-foreground w-5 text-center uppercase tabular-nums">{padSize}</span>
              <button
                onClick={() => changePadSize(1)}
                disabled={padSize === 'lg'}
                className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                title="Aumentar pads"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>

            <SetlistManager
              songs={songs}
              currentSongId={currentSongId}
              onSaveSong={handleSaveSong}
              onLoadSong={handleLoadSong}
              onDeleteSong={handleDeleteSong}
              onReorder={reorderSetlists}
            />
            <button
              onClick={() => navigate('/pricing')}
              className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
              title="Planos"
            >
              <Crown className="h-4 w-4" />
            </button>
            <button
              onClick={toggleFocusMode}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Modo foco"
            >
              <Maximize className="h-4 w-4" />
            </button>
            <button
              onClick={signOut}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>
      )}

      {/* Info bar - hidden in focus mode */}
      {!focusMode && (
        <div className="px-3 py-1 text-[10px] text-muted-foreground text-center border-b border-border/50 hidden sm:block">
          Segure um pad para ajustar volume e importar som · Toque nos loops (RCK/BLD) para ativar padrões rítmicos
        </div>
      )}

      {/* Pad Grid - Main area */}
      <main className="flex-1 flex items-center justify-center overflow-hidden">
        <PadGrid
          pads={defaultPads}
          padVolumes={padVolumes}
          activeLoops={activeLoops}
          customSounds={customSounds}
          padSize={padSize}
          padEffects={padEffects}
          padPans={padPans}
          onToggleLoop={toggleLoop}
          onImportSound={handleImportSound}
          onRemoveCustomSound={handleRemoveCustomSound}
          onPadVolumeChange={handlePadVolumeChange}
          onEffectsChange={handleEffectsChange}
          onPadPanChange={handlePadPanChange}
          padNames={padNames}
          onRenamePad={handleRenamePad}
        />
      </main>

      {/* Bottom controls */}
      <footer className="shrink-0 border-t border-border bg-card/50 backdrop-blur p-2 sm:p-3 space-y-2">
        <div className="max-w-[600px] mx-auto space-y-2">
          {/* Focus mode: show exit button */}
          {focusMode && (
            <div className="flex justify-end">
              <button
                onClick={toggleFocusMode}
                className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                title="Sair do modo foco"
              >
                <Minimize className="h-3 w-3" />
                Sair do foco
              </button>
            </div>
          )}

          <VolumeControl
            volume={masterVolume}
            onVolumeChange={setMasterVol}
            label="Volume Master"
          />

          {/* Metronome - hidden in focus mode */}
          {!focusMode && (
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => setMetronomeOpen(prev => !prev)}
                className="flex items-center justify-between w-full px-4 py-2 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-foreground tabular-nums">{bpm}</span>
                  <span className="text-xs text-muted-foreground">BPM</span>
                  <span className="text-xs text-muted-foreground">· {timeSignature}</span>
                </div>
                {metronomeOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              {metronomeOpen && (
                <div className="px-0 pb-0">
                  <Metronome
                    bpm={bpm}
                    onBpmChange={setBpm}
                    timeSignature={timeSignature}
                    onTimeSignatureChange={setTimeSignature}
                  />
                  <PanControl
                    label="Pan Metrônomo"
                    pan={metronomePan}
                    onPanChange={handleMetronomePanChange}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </footer>
    </div>
  );
};

export default Index;
