import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Search, Music, Loader2, Sparkles, Check, X, Zap, Lock, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AISongResult {
  name: string;
  artist: string;
  bpm: number | null;
  key: string | null;
  mode: string;
  source?: string | null;
}

interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  album: string;
  image: string;
  duration_ms: number;
  preview_url: string | null;
}

interface PadConfig {
  volume: number;
  eqLow: number;
  eqMid: number;
  eqHigh: number;
  reverb: number;
  delay: number;
  delayTime: number;
  pattern?: number[];
}

interface SuggestedConfig {
  bpm: number;
  key?: string;
  timeSignature: string;
  recommendedLoop: string;
  description: string;
  patternName?: string;
  trackName?: string;
  pads: Record<string, PadConfig>;
}

interface MusicAISearchProps {
  onApplyConfig: (config: SuggestedConfig) => void;
  locked?: boolean;
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
}

const PAD_LABELS: Record<string, string> = {
  kick: 'Kick',
  snare: 'Snare',
  'hihat-closed': 'HH Closed',
  'hihat-open': 'HH Open',
  crash: 'Crash',
  clap: 'Clap',
  'loop-worship-1': 'Worship Snap',
  'loop-worship-2': 'Worship Flow',
};

const USAGE_KEY = 'music-ai-usage';

function getUsageStats() {
  try {
    const raw = localStorage.getItem(USAGE_KEY);
    if (raw) return JSON.parse(raw) as { total: number; lastReset: string };
  } catch {}
  return { total: 0, lastReset: new Date().toISOString().slice(0, 10) };
}

function incrementUsage() {
  const stats = getUsageStats();
  const today = new Date().toISOString().slice(0, 10);
  if (stats.lastReset !== today) {
    stats.total = 0;
    stats.lastReset = today;
  }
  stats.total++;
  localStorage.setItem(USAGE_KEY, JSON.stringify(stats));
  return stats;
}


const MusicAISearch: React.FC<MusicAISearchProps> = ({ onApplyConfig, locked, externalOpen, onExternalOpenChange }) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen ?? internalOpen;
  const setOpen = (v: boolean) => { onExternalOpenChange ? onExternalOpenChange(v) : setInternalOpen(v); };

  // AI song search state
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<AISongResult[]>([]);
  const [selectedSong, setSelectedSong] = useState<AISongResult | null>(null);

  // AI analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [suggestion, setSuggestion] = useState<SuggestedConfig | null>(null);
  const [dataSource, setDataSource] = useState<{ bpm: string; key: string } | null>(null);

  // Spotify preview state
  const [spotifyQuery, setSpotifyQuery] = useState('');
  const [spotifySearching, setSpotifySearching] = useState(false);
  const [spotifyTracks, setSpotifyTracks] = useState<SpotifyTrack[]>([]);
  const [previewTrackId, setPreviewTrackId] = useState<string | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [previewProgress, setPreviewProgress] = useState(0);

  const [usage, setUsage] = useState(getUsageStats);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup audio on close or unmount
  useEffect(() => { if (!open) stopPreview(); }, [open]);
  useEffect(() => { return () => stopPreview(); }, []);

  // Refresh usage on open
  useEffect(() => { if (open) setUsage(getUsageStats()); }, [open]);

  // Auto-populate Spotify search from selected song
  useEffect(() => {
    if (selectedSong) {
      setSpotifyQuery(`${selectedSong.name} ${selectedSong.artist}`);
      setSpotifyTracks([]);
    }
  }, [selectedSong]);

  const stopPreview = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
    setPreviewPlaying(false);
    setPreviewTrackId(null);
    setPreviewProgress(0);
  }, []);

  const startProgressTracking = useCallback(() => {
    if (progressInterval.current) clearInterval(progressInterval.current);
    progressInterval.current = setInterval(() => {
      if (audioRef.current) {
        const pct = (audioRef.current.currentTime / audioRef.current.duration) * 100;
        setPreviewProgress(isNaN(pct) ? 0 : pct);
      }
    }, 200);
  }, []);

  const togglePreview = useCallback((track: SpotifyTrack) => {
    if (!track.preview_url) return;
    if (previewTrackId === track.id && previewPlaying) {
      audioRef.current?.pause();
      setPreviewPlaying(false);
      if (progressInterval.current) clearInterval(progressInterval.current);
      return;
    }
    if (previewTrackId === track.id && !previewPlaying && audioRef.current) {
      audioRef.current.play();
      setPreviewPlaying(true);
      startProgressTracking();
      return;
    }
    stopPreview();
    const audio = new Audio(track.preview_url);
    audioRef.current = audio;
    setPreviewTrackId(track.id);
    setPreviewProgress(0);
    audio.play();
    setPreviewPlaying(true);
    startProgressTracking();
    audio.onended = () => {
      setPreviewPlaying(false);
      setPreviewProgress(0);
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, [previewTrackId, previewPlaying, stopPreview, startProgressTracking]);

  const seekPreview = useCallback((delta: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, Math.min(audioRef.current.duration || 30, audioRef.current.currentTime + delta));
    }
  }, []);

  const formatDuration = (ms: number) => {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // --- songbpm.com search ---
  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setSearching(true);
    setResults([]);
    setSelectedSong(null);
    setSuggestion(null);
    setDataSource(null);

    try {
      const { data, error } = await supabase.functions.invoke('music-search-ai', {
        body: { query: query.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const found: AISongResult[] = data.results || [];
      setResults(found);
      if (!found.length) toast.info('Nenhuma música encontrada. Tente outra busca.');
    } catch (e) {
      console.error('music-search-ai error:', e);
      toast.error('Erro ao buscar músicas. Tente novamente.');
    } finally {
      setSearching(false);
    }
  }, [query]);

  // --- AI analysis ---
  const handleAnalyze = useCallback(async (song: AISongResult) => {
    setSelectedSong(song);
    setSuggestion(null);
    setDataSource(null);
    setAnalyzing(true);

    try {
      const { data, error } = await supabase.functions.invoke('suggest-pad-config', {
        body: {
          trackName: song.name,
          artist: song.artist,
          bpm: song.bpm,
          key: song.key,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setSuggestion(data.config);
      setDataSource(data.source || null);
      setUsage(incrementUsage());
    } catch (e) {
      console.error('Analysis error:', e);
      toast.error('Erro ao analisar música. Tente novamente.');
      setSelectedSong(null);
    } finally {
      setAnalyzing(false);
    }
  }, []);

  // --- Spotify preview search ---
  const handleSpotifySearch = useCallback(async () => {
    if (!spotifyQuery.trim()) return;
    setSpotifySearching(true);
    setSpotifyTracks([]);
    stopPreview();

    try {
      const { data, error } = await supabase.functions.invoke('spotify-search', {
        body: { query: spotifyQuery.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSpotifyTracks(data.tracks || []);
      if (!data.tracks?.length) toast.info('Nenhuma música encontrada no Spotify.');
    } catch (e) {
      console.error('Spotify search error:', e);
      toast.error('Erro ao buscar no Spotify.');
    } finally {
      setSpotifySearching(false);
    }
  }, [spotifyQuery, stopPreview]);

  // --- Apply config ---
  const handleApply = useCallback(() => {
    if (!suggestion) return;
    const configWithTrack = {
      ...suggestion,
      trackName: selectedSong ? `${selectedSong.name} - ${selectedSong.artist}` : undefined,
    };
    onApplyConfig(configWithTrack);
    toast.success('Configuração aplicada nos pads!');
    setOpen(false);
    setQuery('');
    setResults([]);
    setSelectedSong(null);
    setSuggestion(null);
    setSpotifyTracks([]);
    setSpotifyQuery('');
  }, [suggestion, selectedSong, onApplyConfig]);

  return (
    <Sheet open={locked ? false : open} onOpenChange={(v) => { if (!locked) setOpen(v); }}>
      {!externalOpen && externalOpen === undefined && (
        <SheetTrigger asChild>
          {locked ? (
            <button
              className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
              onClick={(e) => { e.preventDefault(); toast('🔒 Music AI disponível no plano Master'); }}
            >
              <Lock className="h-4 w-4" />
              Music AI
              <span className="ml-auto text-[10px] text-primary font-medium">MASTER</span>
            </button>
          ) : (
            <button className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors">
              <Music className="h-4 w-4 text-muted-foreground" />
              Music AI
            </button>
          )}
        </SheetTrigger>
      )}

      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col overflow-hidden">
        <SheetHeader className="shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Music AI
          </SheetTitle>
          <SheetDescription>
            Digite o nome da música ou artista e a IA sugere as opções com BPM e Tom
          </SheetDescription>
        </SheetHeader>

        {/* Usage counter */}
        <div className="flex items-center gap-2 mt-2 px-2 py-1.5 rounded-md bg-muted/50 text-[11px] text-muted-foreground shrink-0">
          <Zap className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>Hoje: <strong className="text-foreground">{usage.total}</strong> análise{usage.total !== 1 ? 's' : ''} de IA</span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-5 pb-4">
          {/* ── Section 1: AI song search ── */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              1. Buscar música com IA
            </p>
            <div className="flex gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nome da música ou artista..."
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={searching || !query.trim()} size="icon">
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>

            {/* Search results */}
            {!selectedSong && results.length > 0 && (
              <div className="space-y-1">
                {results.map((r, i) => {
                  const sourceDomain = r.source ? (() => { try { return new URL(r.source).hostname.replace('www.', ''); } catch { return null; } })() : null;
                  return (
                    <button
                      key={i}
                      onClick={() => handleAnalyze(r)}
                      className="w-full flex items-start justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors text-left border border-border/50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{r.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{r.artist}</p>
                        {sourceDomain && (
                          <p className="text-[10px] text-primary/60 truncate mt-0.5">📌 {sourceDomain}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0 pt-0.5">
                        {r.bpm ? (
                          <div className="text-right">
                            <span className="text-sm font-bold text-foreground">{r.bpm}</span>
                            <span className="text-[10px] text-muted-foreground ml-0.5">BPM</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">BPM?</span>
                        )}
                        {r.key ? (
                          <div className="bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded">
                            {r.key}
                          </div>
                        ) : (
                          <div className="bg-muted text-muted-foreground text-[10px] font-bold px-1.5 py-0.5 rounded">
                            Tom?
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Selected song + analysis ── */}
          {selectedSong && (
            <div className="space-y-3">
              {/* Selected card */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center shrink-0">
                  <Music className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{selectedSong.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{selectedSong.artist}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {selectedSong.bpm && (
                      <span className="text-[10px] font-bold text-foreground">{selectedSong.bpm} BPM</span>
                    )}
                    {selectedSong.key && (
                      <span className="text-[10px] bg-primary/10 text-primary px-1 rounded font-bold">{selectedSong.key}</span>
                    )}
                    <span className="text-[10px] text-primary/70 font-medium flex items-center gap-0.5">
                      <Sparkles className="h-2.5 w-2.5" /> IA
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost" size="icon" className="h-7 w-7 shrink-0"
                  onClick={() => { setSelectedSong(null); setSuggestion(null); setDataSource(null); }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Analyzing spinner */}
              {analyzing && (
                <div className="flex flex-col items-center gap-3 py-6">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <div className="text-center">
                    <p className="text-sm font-medium">IA analisando música...</p>
                    <p className="text-xs text-muted-foreground">Configurando pads com BPM {selectedSong.bpm}{selectedSong.key ? ` · ${selectedSong.key}` : ''}</p>
                  </div>
                </div>
              )}

              {/* AI suggestion result */}
              {suggestion && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">Sugestão da IA</span>
                    {suggestion.patternName && (
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
                        {suggestion.patternName}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">{suggestion.description}</p>

                  <div className="grid grid-cols-4 gap-2">
                    <div className="bg-muted/50 rounded-md p-2 text-center">
                      <span className="text-lg font-bold text-foreground">{suggestion.bpm}</span>
                      <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                        BPM
                        {dataSource?.bpm === 'songbpm.com' && (
                           <span className="text-primary font-bold">✓</span>
                        )}
                      </p>
                    </div>
                    <div className="bg-muted/50 rounded-md p-2 text-center">
                      <span className="text-lg font-bold text-foreground">{suggestion.key || '—'}</span>
                      <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                        Tom
                        {dataSource?.key === 'songbpm.com' && (
                           <span className="text-primary font-bold">✓</span>
                        )}
                      </p>
                    </div>
                    <div className="bg-muted/50 rounded-md p-2 text-center">
                      <span className="text-lg font-bold text-foreground">{suggestion.timeSignature}</span>
                      <p className="text-[10px] text-muted-foreground">Compasso</p>
                    </div>
                    <div className="bg-muted/50 rounded-md p-2 text-center">
                      <span className="text-sm font-bold text-foreground">
                        {suggestion.recommendedLoop === 'loop-worship-1' ? 'Snap' :
                          suggestion.recommendedLoop === 'loop-worship-2' ? 'Flow' :
                          suggestion.recommendedLoop?.includes('rock') ? 'Rock' : 'Ballad'}
                      </span>
                      <p className="text-[10px] text-muted-foreground">Loop</p>
                    </div>
                  </div>

                  {/* Pad effects preview */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase">Efeitos dos Pads</span>
                    {suggestion.pads && Object.entries(suggestion.pads).map(([padId, cfg]) => (
                      <div key={padId} className="flex items-center justify-between text-xs bg-muted/30 rounded px-2 py-1">
                        <span className="font-medium">{PAD_LABELS[padId] || padId}</span>
                        <div className="flex gap-2 text-muted-foreground text-[10px]">
                          <span>Vol {Math.round(cfg.volume * 100)}%</span>
                          {cfg.reverb > 0 && <span>Rev {Math.round(cfg.reverb * 100)}%</span>}
                          {cfg.delay > 0 && <span>Del {Math.round(cfg.delay * 100)}%</span>}
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button onClick={handleApply} className="w-full gap-2">
                    <Check className="h-4 w-4" />
                    Aplicar configuração
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ── Section 2: Spotify preview (shows after song selected) ── */}
          {selectedSong && (
            <div className="space-y-2 border-t border-border/50 pt-4">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                2. Ouvir preview no Spotify <span className="normal-case font-normal">(opcional)</span>
              </p>
              <div className="flex gap-2">
                <Input
                  value={spotifyQuery}
                  onChange={(e) => setSpotifyQuery(e.target.value)}
                  placeholder="Buscar no Spotify..."
                  onKeyDown={(e) => e.key === 'Enter' && handleSpotifySearch()}
                  className="flex-1"
                />
                <Button onClick={handleSpotifySearch} disabled={spotifySearching || !spotifyQuery.trim()} size="icon" variant="outline">
                  {spotifySearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>

              {spotifyTracks.length > 0 && (
                <div className="space-y-1">
                  {spotifyTracks.map((track) => {
                    const isActive = previewTrackId === track.id;
                    return (
                      <div key={track.id} className={`rounded-lg transition-colors ${isActive ? 'bg-muted' : 'hover:bg-muted/50'}`}>
                        <div className="flex items-center gap-3 w-full p-2 text-left">
                          {track.image ? (
                            <img src={track.image} alt="" className="w-9 h-9 rounded object-cover shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded bg-muted flex items-center justify-center shrink-0">
                              <Music className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className={`text-xs font-medium truncate ${isActive ? 'text-primary' : ''}`}>{track.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{track.artist}</p>
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0 mr-1">
                            {formatDuration(track.duration_ms)}
                          </span>
                      {track.preview_url ? (
                            <button
                              onClick={() => togglePreview(track)}
                              className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${isActive && previewPlaying ? 'bg-primary text-primary-foreground' : 'bg-muted/80 text-foreground hover:bg-primary hover:text-primary-foreground'}`}
                              title="Ouvir preview 30s"
                            >
                              {isActive && previewPlaying ? (
                                <Pause className="h-3 w-3" />
                              ) : (
                                <Play className="h-3 w-3 ml-0.5" />
                              )}
                            </button>
                          ) : (
                            <div className="shrink-0 w-7 h-7 flex items-center justify-center" title="Preview não disponível no Spotify">
                              <VolumeX className="h-3 w-3 text-muted-foreground/50" />
                            </div>
                          )}
                        </div>

                        {/* Mini player bar */}
                        {isActive && (
                          <div className="flex items-center gap-2 px-3 pb-2.5">
                            <button onClick={() => seekPreview(-5)} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                              <SkipBack className="h-3 w-3" />
                            </button>
                            <button onClick={() => togglePreview(track)} className={`p-1 rounded-full transition-colors ${previewPlaying ? 'text-primary' : 'text-foreground'}`}>
                              {previewPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
                            </button>
                            <button onClick={() => seekPreview(5)} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                              <SkipForward className="h-3 w-3" />
                            </button>
                            <div className="flex-1 h-1.5 bg-muted-foreground/20 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all duration-200"
                                style={{ width: `${previewProgress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MusicAISearch;
