import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Music, Loader2, Calendar, BookOpen, Waypoints, ChevronDown, ChevronUp, Hand, Heart, Pin, PinOff, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { loadPerformanceSettings } from '@/lib/performance-settings';

interface SharedSong {
  id: string;
  name: string;
  bpm: number;
  timeSignature: string;
  key: string | null;
}

interface SharedSetlistData {
  id: string;
  name: string;
  songs: SharedSong[];
  event_date?: string;
  is_event?: boolean;
}

interface CueEntry {
  id: string;
  label: string;
  color: string;
  textColor: string;
  icon: React.FC<any>;
  time: Date;
  targetSongId?: string | null;
  targetSongName?: string | null;
}

const KEY_COLORS: Record<string, string> = {
  'C': 'bg-red-500', 'C#': 'bg-rose-500', 'Db': 'bg-rose-500',
  'D': 'bg-orange-500', 'D#': 'bg-amber-500', 'Eb': 'bg-amber-500',
  'E': 'bg-yellow-500', 'F': 'bg-lime-500', 'F#': 'bg-green-500',
  'Gb': 'bg-green-500', 'G': 'bg-teal-500', 'G#': 'bg-cyan-500',
  'Ab': 'bg-cyan-500', 'A': 'bg-blue-500', 'A#': 'bg-indigo-500',
  'Bb': 'bg-indigo-500', 'B': 'bg-violet-500',
};

const CUE_PRESETS = [
  { key: 'chorus', icon: Music, color: 'bg-purple-500', textColor: 'text-purple-500' },
  { key: 'verse', icon: BookOpen, color: 'bg-blue-500', textColor: 'text-blue-500' },
  { key: 'bridge', icon: Waypoints, color: 'bg-teal-500', textColor: 'text-teal-500' },
  { key: 'down', icon: ChevronDown, color: 'bg-sky-500', textColor: 'text-sky-500' },
  { key: 'up', icon: ChevronUp, color: 'bg-orange-500', textColor: 'text-orange-500' },
  { key: 'cut', icon: Hand, color: 'bg-red-500', textColor: 'text-red-500' },
  { key: 'worship', icon: Heart, color: 'bg-amber-500', textColor: 'text-amber-500' },
];

const formatEventDate = (dateStr: string) => {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

const formatTime = (date: Date) =>
  date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });

const SharedSetlist: React.FC = () => {
  const { t } = useTranslation();
  const { token } = useParams<{ token: string }>();
  const [setlist, setSetlist] = useState<SharedSetlistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cue, setCue] = useState<CueEntry | null>(null);
  const [cueVisible, setCueVisible] = useState(false);
  const [pinned, setPinned] = useState(() => loadPerformanceSettings().pinCueByDefault);
  const [history, setHistory] = useState<CueEntry[]>([]);
  const [highlightedSongId, setHighlightedSongId] = useState<string | null>(null);
  const cueTimerRef = useRef<number | null>(null);
  const fadeTimerRef = useRef<number | null>(null);
  const highlightTimerRef = useRef<number | null>(null);
  const pinnedRef = useRef(pinned);
  const settingsRef = useRef(loadPerformanceSettings());

  // Keep refs in sync
  useEffect(() => { pinnedRef.current = pinned; }, [pinned]);
  useEffect(() => {
    const sync = () => { settingsRef.current = loadPerformanceSettings(); };
    window.addEventListener('glory-performance-settings-updated', sync as EventListener);
    return () => window.removeEventListener('glory-performance-settings-updated', sync as EventListener);
  }, []);

  useEffect(() => {
    if (!token) { setError('Token inválido'); setLoading(false); return; }
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    fetch(`https://${projectId}.supabase.co/functions/v1/get-shared-setlist?token=${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        const s = data.setlist;
        setSetlist({
          id: s.id,
          name: s.name,
          songs: (s.songs || []) as SharedSong[],
          event_date: s.event_date,
          is_event: s.is_event,
        });
      })
      .catch((e) => setError(e.message || 'Erro ao carregar setlist'))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!setlist?.id) return;

    const showCue = (cueType: string, cueLabel: string, targetSongId?: string | null, targetSongName?: string | null) => {
      const preset = CUE_PRESETS.find(p => p.key === cueType);
      const IconComp = preset?.icon || Music;
      const entry: CueEntry = {
        id: `${Date.now()}`,
        label: cueLabel || cueType,
        color: preset?.color || 'bg-primary',
        textColor: preset?.textColor || 'text-primary',
        icon: IconComp,
        time: new Date(),
        targetSongId,
        targetSongName,
      };
      setCue(entry);
      setCueVisible(true);
      setHistory(prev => [entry, ...prev].slice(0, 3));

      // Highlight song if targeted — match by ID first, then by name
      if (targetSongId || targetSongName) {
        setSetlist(prev => {
          if (!prev) return prev;
          const matchById = prev.songs.find(s => s.id === targetSongId);
          const matchByName = !matchById && targetSongName
            ? prev.songs.find(s => s.name === targetSongName)
            : null;
          const matchedId = matchById?.id || matchByName?.id || targetSongId;
          if (matchedId) {
            setHighlightedSongId(matchedId);
            if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
            highlightTimerRef.current = window.setTimeout(() => setHighlightedSongId(null), 10000);
          }
          return prev;
        });
      }

      // Vibrate if enabled
      if (settingsRef.current.vibrateOnCue && typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(120);
      }

      if (cueTimerRef.current) clearTimeout(cueTimerRef.current);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);

      const duration = settingsRef.current.cueDisplaySeconds * 1000;

      // Only auto-hide when not pinned
      cueTimerRef.current = window.setTimeout(() => {
        if (!pinnedRef.current) {
          setCueVisible(false);
          fadeTimerRef.current = window.setTimeout(() => setCue(null), 600);
        }
      }, duration - 600);
    };

    const channel = supabase
      .channel(`live-cues-${setlist.id}`)
      .on('broadcast', { event: 'cue' }, (payload) => {
        const { cue_type, cue_label, target_song_id, target_song_name } = payload.payload || {};
        showCue(cue_type, cue_label, target_song_id, target_song_name);
      })
      .on('broadcast', { event: 'reorder' }, (payload) => {
        const newSongs = payload.payload?.songs;
        if (Array.isArray(newSongs) && newSongs.length > 0) {
          setSetlist(prev => {
            if (!prev) return prev;
            // Map reordered songs: try to match by name to preserve existing IDs, fallback to broadcast data
            const mapped = newSongs.map((ns: any) => {
              const existing = prev.songs.find(s => s.name === ns.name);
              return existing || (ns as SharedSong);
            });
            return { ...prev, songs: mapped };
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (cueTimerRef.current) clearTimeout(cueTimerRef.current);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, [setlist?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !setlist) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6">
        <Music className="h-12 w-12 text-muted-foreground" />
        <h1 className="text-xl font-bold text-foreground">{t('sharedSetlist.notFound')}</h1>
        <p className="text-sm text-muted-foreground text-center">{error || t('sharedSetlist.notFoundDesc')}</p>
        <Link to="/"><Button variant="outline">{t('sharedSetlist.goToApp')}</Button></Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card/80 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
          {setlist.is_event
            ? <Calendar className="h-4 w-4 text-primary-foreground" />
            : <Music className="h-4 w-4 text-primary-foreground" />}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold text-foreground truncate">{setlist.name}</h1>
          <p className="text-[10px] text-muted-foreground">
            {setlist.songs.length} {t('sharedSetlist.songs')} · {t('sharedSetlist.readOnly')}
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/15 border border-red-500/30">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Live</span>
        </div>
      </div>

      {/* Event date badge */}
      {setlist.is_event && setlist.event_date && (
        <div className="px-4 pt-4">
          <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-xl px-3 py-2 w-fit">
            <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-xs font-medium text-primary capitalize">
              {formatEventDate(setlist.event_date)}
            </span>
          </div>
        </div>
      )}

      {/* Songs — left aligned */}
      <div className="flex-1 px-4 py-4 space-y-2">
        {setlist.songs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">{t('sharedSetlist.noSongs')}</p>
        ) : (
          setlist.songs.map((song, index) => {
            const keyBase = song.key?.split(' ')[0] || '';
            const keyColor = KEY_COLORS[keyBase] || 'bg-muted';
            const isHighlighted = highlightedSongId === song.id;
            return (
              <div 
                key={song.id} 
                className={`bg-card border rounded-xl p-4 flex items-center gap-3 max-w-sm transition-all duration-500 ${
                  isHighlighted 
                    ? 'border-primary ring-2 ring-primary/50 scale-[1.02] shadow-lg shadow-primary/20' 
                    : 'border-border'
                }`}
              >
                <span className={`text-lg font-black w-6 text-center shrink-0 transition-colors ${
                  isHighlighted ? 'text-primary' : 'text-muted-foreground/30'
                }`}>{index + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold truncate transition-colors ${
                    isHighlighted ? 'text-primary' : 'text-foreground'
                  }`}>{song.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground font-mono tabular-nums">{song.bpm} BPM</span>
                    <span className="text-muted-foreground/30">·</span>
                    <span className="text-xs text-muted-foreground">{song.timeSignature}</span>
                  </div>
                </div>
                {song.key && (
                  <span className={`${keyColor} text-white text-xs font-bold px-2.5 py-1 rounded-lg shrink-0`}>{song.key}</span>
                )}
                {isHighlighted && (
                  <span className="h-3 w-3 rounded-full bg-primary animate-ping absolute -top-1 -right-1" />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Cue history — above the active bar */}
      {history.length > 0 && (
        <div className="px-4 pb-2 space-y-1">
          <div className="flex items-center gap-1.5 mb-2">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Histórico de sinais</span>
          </div>
          {history.map((entry, i) => (
            <div
              key={entry.id}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 border border-border transition-opacity ${i === 0 ? 'opacity-100 bg-card' : 'opacity-40 bg-card/50'}`}
            >
              <div className={`h-6 w-6 rounded-md ${entry.color} flex items-center justify-center shrink-0`}>
                <entry.icon className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <span className={`text-sm font-bold ${entry.textColor}`}>{entry.label}</span>
                {entry.targetSongName && (
                  <span className="text-[10px] text-muted-foreground ml-2">→ {entry.targetSongName}</span>
                )}
              </div>
              <span className="ml-auto text-[10px] text-muted-foreground font-mono tabular-nums shrink-0">{formatTime(entry.time)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Floating compact cue badge — doesn't block content */}
      <div
        className={`fixed bottom-4 right-4 z-20 w-fit max-w-[260px] transition-all duration-500 ease-in-out ${
          cueVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
        }`}
      >
        {cue && (
          <div className={`${cue.color} rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3 relative`}>
            <cue.icon className="h-8 w-8 text-white shrink-0 animate-[pulse_1s_ease-in-out_infinite]" />
            <div className="flex-1 min-w-0">
              <p className="text-lg font-black text-white drop-shadow-lg truncate leading-tight">
                {cue.label}
              </p>
              {cue.targetSongName && (
                <p className="text-[11px] text-white/80 font-medium truncate">→ {cue.targetSongName}</p>
              )}
              {pinned && (
                <span className="text-[9px] text-white/60 font-semibold uppercase tracking-widest">Fixado</span>
              )}
            </div>
            <button
              onClick={() => setPinned(p => !p)}
              className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors shrink-0"
              title={pinned ? 'Desafixar sinal' : 'Fixar sinal na tela'}
            >
              {pinned
                ? <PinOff className="h-3.5 w-3.5 text-white" />
                : <Pin className="h-3.5 w-3.5 text-white" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SharedSetlist;
