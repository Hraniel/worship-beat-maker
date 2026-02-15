import React, { useState, useCallback, useEffect } from 'react';
import PadGrid from '@/components/PadGrid';
import Metronome from '@/components/Metronome';
import VolumeControl from '@/components/VolumeControl';
import SetlistManager from '@/components/SetlistManager';
import { setMasterVolume, getAudioContext } from '@/lib/audio-engine';
import { defaultPads, type SetlistSong } from '@/lib/sounds';

const STORAGE_KEY = 'drum-pads-worship-songs';

function loadSongs(): SetlistSong[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function saveSongsToStorage(songs: SetlistSong[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(songs));
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

  useEffect(() => {
    setMasterVolume(masterVolume);
  }, [masterVolume]);

  const toggleLoop = useCallback((padId: string) => {
    setActiveLoops(prev => {
      const next = new Set(prev);
      if (next.has(padId)) next.delete(padId);
      else next.add(padId);
      return next;
    });
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

      {/* Pad Grid - Main area */}
      <main className="flex-1 flex items-center justify-center overflow-hidden">
        <PadGrid
          pads={defaultPads}
          padVolumes={padVolumes}
          activeLoops={activeLoops}
          onToggleLoop={toggleLoop}
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
