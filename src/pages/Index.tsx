import React, { useState, useCallback, useEffect, useRef } from 'react';
import PadGrid from '@/components/PadGrid';
import Metronome from '@/components/Metronome';
import VolumeControl from '@/components/VolumeControl';
import SetlistManager from '@/components/SetlistManager';
import { setMasterVolume, getAudioContext, loadCustomBuffer, removeCustomBuffer } from '@/lib/audio-engine';
import { defaultPads, type SetlistSong } from '@/lib/sounds';
import { saveCustomSound, getCustomSound, deleteCustomSound, getAllCustomSoundIds } from '@/lib/custom-sound-store';
import { addLoop, removeLoop, setLoopBpm, setLoopTimeSignature, updateLoopVolume, stopAllLoops } from '@/lib/loop-engine';
import { toast } from 'sonner';

const STORAGE_KEY = 'drum-pads-worship-songs';
const CUSTOM_NAMES_KEY = 'drum-pads-custom-names';

function loadSongs(): SetlistSong[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function saveSongsToStorage(songs: SetlistSong[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(songs));
}

function loadCustomNames(): Record<string, string> {
  try {
    const data = localStorage.getItem(CUSTOM_NAMES_KEY);
    return data ? JSON.parse(data) : {};
  } catch { return {}; }
}

function saveCustomNames(names: Record<string, string>) {
  localStorage.setItem(CUSTOM_NAMES_KEY, JSON.stringify(names));
}

const Index = () => {
  const [masterVolume, setMasterVol] = useState(0.7);
  const [bpm, setBpm] = useState(120);
  const [timeSignature, setTimeSignature] = useState('4/4');
  const [activeLoops, setActiveLoops] = useState<Set<string>>(new Set());
  const [padVolumes, setPadVolumes] = useState<Record<string, number>>({});
  const [songs, setSongs] = useState<SetlistSong[]>(loadSongs);
  const [currentSongId, setCurrentSongId] = useState<string | null>(null);
  const [audioReady, setAudioReady] = useState(false);
  const [customSounds, setCustomSounds] = useState<Record<string, string>>(loadCustomNames);

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
    // Update loop engine volume if this pad is looping
    updateLoopVolume(padId, vol);
  }, []);

  // Setlist management
  const handleSaveSong = useCallback((name: string) => {
    const song: SetlistSong = {
      id: Date.now().toString(),
      name,
      bpm,
      timeSignature,
      pads: defaultPads,
      padVolumes: { ...padVolumes },
    };
    const updated = [...songs, song];
    setSongs(updated);
    saveSongsToStorage(updated);
    setCurrentSongId(song.id);
  }, [bpm, timeSignature, padVolumes, songs]);

  const handleLoadSong = useCallback((song: SetlistSong) => {
    setBpm(song.bpm);
    setTimeSignature(song.timeSignature);
    setPadVolumes(song.padVolumes);
    setCurrentSongId(song.id);
    // Stop all loops when switching songs
    stopAllLoops();
    setActiveLoops(new Set());
  }, []);

  const handleDeleteSong = useCallback((id: string) => {
    const updated = songs.filter(s => s.id !== id);
    setSongs(updated);
    saveSongsToStorage(updated);
    if (currentSongId === id) setCurrentSongId(null);
  }, [songs, currentSongId]);

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden" onPointerDown={initAudio}>
      {/* Header */}
      <header className="flex items-center justify-between px-3 py-2 border-b border-border bg-card/50 backdrop-blur shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-primary">🥁</span>
          <h1 className="text-sm font-bold text-foreground tracking-tight">Drum Pads Worship</h1>
        </div>
        <SetlistManager
          songs={songs}
          currentSongId={currentSongId}
          onSaveSong={handleSaveSong}
          onLoadSong={handleLoadSong}
          onDeleteSong={handleDeleteSong}
        />
      </header>

      {/* Info bar */}
      <div className="px-3 py-1 text-[10px] text-muted-foreground text-center border-b border-border/50">
        Segure um pad para ajustar volume e importar som · Toque nos loops (RCK/BLD) para ativar padrões rítmicos
      </div>

      {/* Pad Grid - Main area */}
      <main className="flex-1 flex items-center justify-center overflow-hidden">
        <PadGrid
          pads={defaultPads}
          padVolumes={padVolumes}
          activeLoops={activeLoops}
          customSounds={customSounds}
          onToggleLoop={toggleLoop}
          onImportSound={handleImportSound}
          onRemoveCustomSound={handleRemoveCustomSound}
          onPadVolumeChange={handlePadVolumeChange}
        />
      </main>

      {/* Bottom controls */}
      <footer className="shrink-0 border-t border-border bg-card/50 backdrop-blur p-2 sm:p-3 space-y-2">
        <div className="max-w-[600px] mx-auto space-y-2">
          <VolumeControl
            volume={masterVolume}
            onVolumeChange={setMasterVol}
            label="Volume Master"
          />
          <Metronome
            bpm={bpm}
            onBpmChange={setBpm}
            timeSignature={timeSignature}
            onTimeSignatureChange={setTimeSignature}
          />
        </div>
      </footer>
    </div>
  );
};

export default Index;
