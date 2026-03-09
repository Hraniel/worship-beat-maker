import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Play, Pause, Calendar, Radio, List, ArrowUp, ArrowDown, GripVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { SetlistSong } from '@/lib/sounds';
import TransposeControl from '@/components/performance/TransposeControl';
import SongDynamicsBar from '@/components/performance/SongDynamicsBar';
import RehearsalCounter from '@/components/performance/RehearsalCounter';
import LiveCuePanel from '@/components/performance/LiveCuePanel';

export interface PerformanceEvent {
  id: string;
  name: string;
  event_date: string;
}

interface PerformanceModeProps {
  songs: SetlistSong[];
  currentSongId: string | null;
  bpm: number;
  spotifyKey: string | null;
  metronomeIsPlaying: boolean;
  currentBeat?: number;
  currentMeasure?: number;
  setlistId?: string | null;
  events?: PerformanceEvent[];
  selectedEventId?: string | null;
  onSelectEvent?: (eventId: string | null) => void;
  onTogglePlay: () => void;
  onLoadSong: (song: SetlistSong) => void;
  onClose: () => void;
  onReorderSongs?: (reorderedSongs: SetlistSong[]) => void;
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
  songs, currentSongId, bpm, spotifyKey, metronomeIsPlaying, currentBeat = 0, currentMeasure = 0, setlistId, events = [], selectedEventId, onSelectEvent, onTogglePlay, onLoadSong, onClose, onReorderSongs,
}) => {
  const { t } = useTranslation();
  const [transpose, setTranspose] = useState(0);
  const [showEventPicker, setShowEventPicker] = useState(false);
  const [showSongList, setShowSongList] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const currentIndex = songs.findIndex(s => s.id === currentSongId);
  const currentSong = currentIndex >= 0 ? songs[currentIndex] : null;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < songs.length - 1;

  // Reset transpose when song changes
  useEffect(() => { setTranspose(0); }, [currentSongId]);

  const goNext = useCallback(() => {
    if (hasNext) onLoadSong(songs[currentIndex + 1]);
  }, [hasNext, currentIndex, songs, onLoadSong]);

  const goPrev = useCallback(() => {
    if (hasPrev) onLoadSong(songs[currentIndex - 1]);
  }, [hasPrev, currentIndex, songs, onLoadSong]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { 
        if (showSongList) { setShowSongList(false); return; }
        onClose(); return; 
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goNext();
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') goPrev();
      if (e.key === ' ') { e.preventDefault(); onTogglePlay(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goNext, goPrev, onClose, onTogglePlay, showSongList]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 60) {
      if (dx < 0) goNext();
      else goPrev();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  }, [goNext, goPrev]);

  const moveSong = useCallback((index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= songs.length) return;
    const reordered = [...songs];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newIndex, 0, moved);
    onReorderSongs?.(reordered);
  }, [songs, onReorderSongs]);

  const keyBase = spotifyKey?.split(' ')[0] || '';
  const keyColorClass = KEY_COLORS[keyBase] || 'bg-primary';
  const beatsPerMeasure = currentSong ? parseInt(currentSong.timeSignature.split('/')[0]) : 4;
  const hasSections = currentSong?.sections && currentSong.sections.length > 0;
  const totalMeasures = currentSong?.totalMeasures || 0;

  return (
    <div
      ref={containerRef}
      className="fixed z-[200] flex flex-col"
      style={{
        background: 'hsl(240 10% 4%)',
        top: 0, left: 0, right: 0, bottom: 0,
        width: '100dvw',
        height: '100dvh',
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 sm:px-6 pb-2 shrink-0"
        style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))' }}
      >
        <div className="flex items-center gap-2">
          {events.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowEventPicker(p => !p)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  selectedEventId
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-white/10 text-muted-foreground hover:text-foreground border border-white/10'
                }`}
              >
                <Radio className="h-3.5 w-3.5" />
                <span className="truncate max-w-[120px]">
                  {selectedEventId
                    ? events.find(e => e.id === selectedEventId)?.name || 'Evento'
                    : t('performance.selectEvent')}
                </span>
                {selectedEventId && <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />}
              </button>
              {showEventPicker && (
                <div className="absolute top-full mt-2 left-0 bg-card/95 backdrop-blur-xl border border-border rounded-2xl p-2 shadow-2xl min-w-[200px] z-50">
                  <p className="text-[10px] text-muted-foreground font-medium mb-1.5 px-2 uppercase tracking-wider">
                    {t('performance.broadcastTo')}
                  </p>
                  {events.map(ev => (
                    <button
                      key={ev.id}
                      onClick={() => {
                        onSelectEvent?.(ev.id === selectedEventId ? null : ev.id);
                        setShowEventPicker(false);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all ${
                        ev.id === selectedEventId
                          ? 'bg-red-500/20 text-red-400 font-bold'
                          : 'text-foreground hover:bg-white/10'
                      }`}
                    >
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <div className="text-left flex-1 min-w-0">
                        <p className="truncate font-medium">{ev.name}</p>
                        <p className="text-[10px] text-muted-foreground">{ev.event_date}</p>
                      </div>
                      {ev.id === selectedEventId && <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />}
                    </button>
                  ))}
                  {selectedEventId && (
                    <button
                      onClick={() => { onSelectEvent?.(null); setShowEventPicker(false); }}
                      className="w-full text-center text-[10px] text-muted-foreground hover:text-foreground py-1.5 mt-1 border-t border-border"
                    >
                      {t('performance.clearEvent')}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
          <span className="text-xs text-muted-foreground font-medium">
            {currentIndex + 1} / {songs.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <LiveCuePanel setlistId={selectedEventId || setlistId || null} isLeader={true} songs={songs} currentSongId={currentSongId} />
          {/* Song list toggle */}
          <button
            onClick={() => setShowSongList(p => !p)}
            className={`p-2 rounded-full transition-colors ${showSongList ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-white/10'}`}
            title={t('performance.songList')}
          >
            <List className="h-5 w-5" />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
            title={t('performance.closeEsc')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Song list panel (overlay) */}
      {showSongList && (
        <div className="absolute inset-0 z-[210] flex flex-col" style={{ background: 'hsl(240 10% 4% / 0.97)' }}>
          <div
            className="flex items-center justify-between px-4 sm:px-6 pb-3 shrink-0"
            style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))' }}
          >
            <h2 className="text-sm font-bold text-foreground">{t('performance.songList')}</h2>
            <button
              onClick={() => setShowSongList(false)}
              className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-1">
            {songs.map((song, i) => {
              const isActive = song.id === currentSongId;
              const songKeyBase = song.key?.split(' ')[0] || '';
              const songKeyColor = KEY_COLORS[songKeyBase] || '';
              return (
                <div
                  key={song.id}
                  className={`flex items-center gap-2 rounded-xl px-3 py-3 transition-all ${
                    isActive
                      ? 'bg-primary/20 border border-primary/40'
                      : 'bg-white/5 border border-transparent hover:bg-white/10'
                  }`}
                >
                  <span className="text-xs font-bold text-muted-foreground/50 w-5 text-center shrink-0">{i + 1}</span>
                  <button
                    onClick={() => { onLoadSong(song); setShowSongList(false); }}
                    className="flex-1 min-w-0 text-left"
                  >
                    <p className={`text-sm font-semibold truncate ${isActive ? 'text-primary' : 'text-foreground'}`}>{song.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground tabular-nums">{song.bpm} BPM</span>
                      {song.key && (
                        <span className={`${songKeyColor} text-white text-[9px] font-bold px-1.5 py-0.5 rounded`}>{song.key}</span>
                      )}
                    </div>
                  </button>
                  {onReorderSongs && (
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button
                        onClick={() => moveSong(i, 'up')}
                        disabled={i === 0}
                        className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-20 transition-all active:scale-90"
                      >
                        <ArrowUp className="h-4 w-4 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => moveSong(i, 'down')}
                        disabled={i === songs.length - 1}
                        className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-20 transition-all active:scale-90"
                      >
                        <ArrowDown className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dynamics bar */}
      {hasSections && (
        <div className="flex justify-center shrink-0 px-4">
          <SongDynamicsBar
            sections={currentSong!.sections!}
            totalMeasures={totalMeasures}
            currentMeasure={currentMeasure}
          />
        </div>
      )}

      {/* Main content — vertically centered in remaining space */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center w-full max-w-2xl mx-auto min-h-0">
        <div className="space-y-1">
          {currentSong ? (
            <h1 className="text-2xl sm:text-4xl font-black text-foreground tracking-tight leading-tight break-words">
              {currentSong.name}
            </h1>
          ) : (
            <p className="text-xl text-muted-foreground">{t('performance.noSongSelected')}</p>
          )}
        </div>

        <div className="flex items-center gap-5 mt-3">
          {/* BPM */}
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5">BPM</p>
            <p className="text-6xl sm:text-7xl font-black text-primary tabular-nums leading-none">{bpm}</p>
          </div>

          {/* Key with transpose */}
          {spotifyKey && (
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5">{t('performance.key')}</p>
              <div className={`${keyColorClass} text-white px-3 py-2 rounded-xl shadow-lg`}>
                <TransposeControl
                  originalKey={spotifyKey}
                  transpose={transpose}
                  onTransposeChange={setTranspose}
                />
              </div>
            </div>
          )}
        </div>

        {/* Rehearsal counter */}
        {totalMeasures > 0 && (
          <div className="mt-3">
            <RehearsalCounter
              currentMeasure={currentMeasure}
              totalMeasures={totalMeasures}
              currentBeat={currentBeat}
              beatsPerMeasure={beatsPerMeasure}
              markers={currentSong?.markers || []}
              isPlaying={metronomeIsPlaying}
            />
          </div>
        )}

        {currentSong?.timeSignature && !totalMeasures && (
          <p className="text-lg text-muted-foreground font-semibold mt-2">{currentSong.timeSignature}</p>
        )}
      </div>

      {/* Song list dots */}
      <div className="flex justify-center gap-1.5 shrink-0 pb-2">
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

      {/* Bottom controls */}
      <div
        className="flex items-center justify-between px-6 shrink-0"
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <button
          onClick={goPrev}
          disabled={!hasPrev}
          className="flex flex-col items-center gap-1 p-3 rounded-2xl hover:bg-white/10 disabled:opacity-20 transition-all active:scale-95"
        >
          <ChevronLeft className="h-8 w-8 text-foreground" />
          <span className="text-[10px] text-muted-foreground">{t('performance.previous')}</span>
        </button>

        <button
          onClick={onTogglePlay}
          className={`flex flex-col items-center gap-2 p-4 rounded-full transition-all active:scale-95 ${
            metronomeIsPlaying
              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/40'
              : 'bg-card border-2 border-border text-foreground hover:border-primary/50'
          }`}
        >
          {metronomeIsPlaying
            ? <Pause className="h-8 w-8" />
            : <Play className="h-8 w-8 ml-1" />}
        </button>

        <button
          onClick={goNext}
          disabled={!hasNext}
          className="flex flex-col items-center gap-1 p-3 rounded-2xl hover:bg-white/10 disabled:opacity-20 transition-all active:scale-95"
        >
          <ChevronRight className="h-8 w-8 text-foreground" />
          <span className="text-[10px] text-muted-foreground">{t('performance.next')}</span>
        </button>
      </div>
    </div>
  );
};

export default PerformanceMode;
