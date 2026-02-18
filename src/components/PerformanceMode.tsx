import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Play, Pause, Maximize } from 'lucide-react';
import type { SetlistSong } from '@/lib/sounds';

interface PerformanceModeProps {
  songs: SetlistSong[];
  currentSongId: string | null;
  bpm: number;
  spotifyKey: string | null;
  metronomeIsPlaying: boolean;
  onTogglePlay: () => void;
  onLoadSong: (song: SetlistSong) => void;
  onClose: () => void;
}

const KEY_COLORS: Record<string, string> = {
  'C': 'bg-red-500', 'C#': 'bg-rose-500', 'Db': 'bg-rose-500',
  'D': 'bg-orange-500', 'D#': 'bg-amber-500', 'Eb': 'bg-amber-500',
  'E': 'bg-yellow-500', 'F': 'bg-lime-500', 'F#': 'bg-green-500',
  'Gb': 'bg-green-500', 'G': 'bg-teal-500', 'G#': 'bg-cyan-500',
  'Ab': 'bg-cyan-500', 'A': 'bg-blue-500', 'A#': 'bg-indigo-500',
  'Bb': 'bg-indigo-500', 'B': 'bg-violet-500',
};

const PerformanceMode: React.FC<PerformanceModeProps> = ({
  songs, currentSongId, bpm, spotifyKey, metronomeIsPlaying, onTogglePlay, onLoadSong, onClose,
}) => {
  const [fullscreen, setFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentIndex = songs.findIndex(s => s.id === currentSongId);
  const currentSong = currentIndex >= 0 ? songs[currentIndex] : null;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < songs.length - 1;

  const goNext = useCallback(() => {
    if (hasNext) onLoadSong(songs[currentIndex + 1]);
  }, [hasNext, currentIndex, songs, onLoadSong]);

  const goPrev = useCallback(() => {
    if (hasPrev) onLoadSong(songs[currentIndex - 1]);
  }, [hasPrev, currentIndex, songs, onLoadSong]);

  // Keyboard controls
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goNext();
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') goPrev();
      if (e.key === ' ') { e.preventDefault(); onTogglePlay(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goNext, goPrev, onClose, onTogglePlay]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen();
        setFullscreen(true);
      } else {
        await document.exitFullscreen();
        setFullscreen(false);
      }
    } catch { /* fullscreen not supported */ }
  }, []);

  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const keyBase = spotifyKey?.split(' ')[0] || '';
  const keyColorClass = KEY_COLORS[keyBase] || 'bg-primary';

  return (
    <div
      ref={containerRef}
      className="fixed z-50 flex flex-col items-center justify-center"
      style={{
        background: 'hsl(240 10% 4%)',
        top: 0, left: 0, right: 0, bottom: 0,
        width: '100dvw',
        height: '100dvh',
      }}
    >
      {/* Top bar */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 pb-2"
        style={{ paddingTop: 'calc(1.5rem + env(safe-area-inset-top, 0px))' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">
            {currentIndex + 1} / {songs.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
            title="Tela cheia"
          >
            <Maximize className="h-5 w-5" />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
            title="Fechar (Esc)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col items-center justify-center gap-6 px-8 text-center w-full max-w-2xl">
        {/* Song name */}
        <div className="space-y-2">
          {currentSong ? (
            <h1 className="text-4xl sm:text-6xl font-black text-foreground tracking-tight leading-none break-words">
              {currentSong.name}
            </h1>
          ) : (
            <p className="text-2xl text-muted-foreground">Nenhuma música selecionada</p>
          )}
        </div>

        {/* BPM display */}
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">BPM</p>
            <p className="text-8xl sm:text-9xl font-black text-primary tabular-nums leading-none">{bpm}</p>
          </div>

          {/* Key badge */}
          {spotifyKey && (
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Tom</p>
              <div className={`${keyColorClass} text-white text-3xl sm:text-4xl font-black px-5 py-3 rounded-2xl shadow-lg`}>
                {spotifyKey}
              </div>
            </div>
          )}
        </div>

        {/* Time signature */}
        {currentSong?.timeSignature && (
          <p className="text-xl text-muted-foreground font-semibold">{currentSong.timeSignature}</p>
        )}
      </div>

      {/* Bottom controls */}
      <div
        className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-6"
        style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}
      >
        {/* Prev */}
        <button
          onClick={goPrev}
          disabled={!hasPrev}
          className="flex flex-col items-center gap-1 p-4 rounded-2xl hover:bg-white/10 disabled:opacity-20 transition-all active:scale-95"
        >
          <ChevronLeft className="h-10 w-10 text-foreground" />
          <span className="text-[10px] text-muted-foreground">Anterior</span>
        </button>

        {/* Play/Pause metronome */}
        <button
          onClick={onTogglePlay}
          className={`flex flex-col items-center gap-2 p-5 rounded-full transition-all active:scale-95 ${
            metronomeIsPlaying
              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/40'
              : 'bg-card border-2 border-border text-foreground hover:border-primary/50'
          }`}
        >
          {metronomeIsPlaying
            ? <Pause className="h-10 w-10" />
            : <Play className="h-10 w-10 ml-1" />}
        </button>

        {/* Next */}
        <button
          onClick={goNext}
          disabled={!hasNext}
          className="flex flex-col items-center gap-1 p-4 rounded-2xl hover:bg-white/10 disabled:opacity-20 transition-all active:scale-95"
        >
          <ChevronRight className="h-10 w-10 text-foreground" />
          <span className="text-[10px] text-muted-foreground">Próxima</span>
        </button>
      </div>

      {/* Song list dots */}
      <div className="absolute left-0 right-0 flex justify-center gap-1.5" style={{ bottom: 'calc(8rem + env(safe-area-inset-bottom, 0px))' }}>
        {songs.map((s, i) => (
          <button
            key={s.id}
            onClick={() => onLoadSong(s)}
            className={`h-2 rounded-full transition-all ${
              i === currentIndex ? 'w-6 bg-primary' : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/60'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default PerformanceMode;
