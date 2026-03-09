import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Music, ChevronRight, Loader2, Calendar, BookOpen, Waypoints, ChevronDown, ChevronUp, Hand, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';

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

const KEY_COLORS: Record<string, string> = {
  'C': 'bg-red-500', 'C#': 'bg-rose-500', 'Db': 'bg-rose-500',
  'D': 'bg-orange-500', 'D#': 'bg-amber-500', 'Eb': 'bg-amber-500',
  'E': 'bg-yellow-500', 'F': 'bg-lime-500', 'F#': 'bg-green-500',
  'Gb': 'bg-green-500', 'G': 'bg-teal-500', 'G#': 'bg-cyan-500',
  'Ab': 'bg-cyan-500', 'A': 'bg-blue-500', 'A#': 'bg-indigo-500',
  'Bb': 'bg-indigo-500', 'B': 'bg-violet-500',
};

const CUE_PRESETS = [
  { key: 'chorus', icon: Music, color: 'bg-purple-500' },
  { key: 'verse', icon: BookOpen, color: 'bg-blue-500' },
  { key: 'bridge', icon: Waypoints, color: 'bg-teal-500' },
  { key: 'down', icon: ChevronDown, color: 'bg-sky-500' },
  { key: 'up', icon: ChevronUp, color: 'bg-orange-500' },
  { key: 'cut', icon: Hand, color: 'bg-red-500' },
  { key: 'worship', icon: Heart, color: 'bg-amber-500' },
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

const SharedSetlist: React.FC = () => {
  const { t } = useTranslation();
  const { token } = useParams<{ token: string }>();
  const [setlist, setSetlist] = useState<SharedSetlistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ label: string; color: string; icon: React.FC<any> } | null>(null);
  const flashTimerRef = useRef<number | null>(null);

  // Fetch setlist data
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

  // Subscribe to live cues via broadcast (works for anon users)
  useEffect(() => {
    if (!setlist?.id) return;

    const showCue = (cueType: string, cueLabel: string) => {
      const preset = CUE_PRESETS.find(p => p.key === cueType);
      const IconComp = preset?.icon || Music;
      setFlash({
        label: cueLabel || cueType,
        color: preset?.color || 'bg-primary',
        icon: IconComp,
      });
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      flashTimerRef.current = window.setTimeout(() => setFlash(null), 3000);
    };

    const channel = supabase
      .channel(`live-cues-${setlist.id}`)
      .on('broadcast', { event: 'cue' }, (payload) => {
        const { cue_type, cue_label } = payload.payload || {};
        showCue(cue_type, cue_label);
      })
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'live_cues' },
        (payload) => {
          const cue = payload.new as any;
          if (cue.setlist_id !== setlist.id) return;
          showCue(cue.cue_type, cue.cue_label);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
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
        <Link to="/">
          <Button variant="outline">{t('sharedSetlist.goToApp')}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      {/* Live cue fullscreen flash */}
      {flash && (
        <div className={`fixed inset-0 z-[300] flex items-center justify-center ${flash.color}/30 animate-in fade-in duration-200`}>
          <div className="text-center animate-in zoom-in-50 duration-300">
            <flash.icon className="h-20 w-20 text-white mx-auto drop-shadow-lg" />
            <p className="text-5xl sm:text-6xl font-black text-white mt-4 drop-shadow-lg">
              {flash.label}
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-10 bg-card/80 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
          {setlist.is_event ? (
            <Calendar className="h-4 w-4 text-primary-foreground" />
          ) : (
            <Music className="h-4 w-4 text-primary-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold text-foreground truncate">{setlist.name}</h1>
          <p className="text-[10px] text-muted-foreground">
            {setlist.songs.length} {t('sharedSetlist.songs')} · {t('sharedSetlist.readOnly')}
          </p>
        </div>
        {/* Live indicator */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/15 border border-red-500/30">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Live</span>
        </div>
      </div>

      {/* Event date badge */}
      {setlist.is_event && setlist.event_date && (
        <div className="max-w-lg mx-auto px-4 pt-4">
          <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-xl px-3 py-2">
            <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-xs font-medium text-primary capitalize">
              {formatEventDate(setlist.event_date)}
            </span>
          </div>
        </div>
      )}

      {/* Songs */}
      <div className="max-w-lg mx-auto px-4 py-4 space-y-2">
        {setlist.songs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">{t('sharedSetlist.noSongs')}</p>
        ) : (
          setlist.songs.map((song, index) => {
            const keyBase = song.key?.split(' ')[0] || '';
            const keyColor = KEY_COLORS[keyBase] || 'bg-muted';
            return (
              <div key={song.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                <span className="text-lg font-black text-muted-foreground/30 w-6 text-center shrink-0">{index + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{song.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground font-mono tabular-nums">{song.bpm} BPM</span>
                    <span className="text-muted-foreground/30">·</span>
                    <span className="text-xs text-muted-foreground">{song.timeSignature}</span>
                  </div>
                </div>
                {song.key && (
                  <span className={`${keyColor} text-white text-xs font-bold px-2.5 py-1 rounded-lg shrink-0`}>{song.key}</span>
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0" />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default SharedSetlist;
