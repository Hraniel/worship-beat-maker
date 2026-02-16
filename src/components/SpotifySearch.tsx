import React, { useState, useCallback } from 'react';
import { Search, Music, Loader2, Sparkles, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  album: string;
  image: string;
  duration_ms: number;
}

interface PadConfig {
  volume: number;
  eqLow: number;
  eqMid: number;
  eqHigh: number;
  reverb: number;
  delay: number;
  delayTime: number;
  pan: number;
  pattern?: number[];
}

interface SuggestedConfig {
  bpm: number;
  timeSignature: string;
  recommendedLoop: string;
  description: string;
  patternName?: string;
  pads: Record<string, PadConfig>;
}

interface SpotifySearchProps {
  onApplyConfig: (config: SuggestedConfig) => void;
}

const PAD_LABELS: Record<string, string> = {
  kick: 'Kick',
  snare: 'Snare',
  'hihat-closed': 'HH Closed',
  'hihat-open': 'HH Open',
  crash: 'Crash',
  clap: 'Clap',
  'loop-rock': 'Loop Rock',
  'loop-ballad': 'Loop Ballad',
};


// In-memory cache for AI suggestions keyed by track ID
const suggestionCache = new Map<string, SuggestedConfig>();




const SpotifySearch: React.FC<SpotifySearchProps> = ({ onApplyConfig }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [suggestion, setSuggestion] = useState<SuggestedConfig | null>(null);
  const [analysisStep, setAnalysisStep] = useState('');

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setSearching(true);
    setTracks([]);
    setSelectedTrack(null);
    setSuggestion(null);

    try {
      const { data, error } = await supabase.functions.invoke('spotify-search', {
        body: { query: query.trim() },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setTracks(data.tracks || []);
      if (!data.tracks?.length) toast.info('Nenhuma música encontrada.');
    } catch (e) {
      console.error('Search error:', e);
      toast.error('Erro ao buscar músicas. Verifique as credenciais do Spotify.');
    } finally {
      setSearching(false);
    }
  }, [query]);

  const handleSelectTrack = useCallback(async (track: SpotifyTrack) => {
    setSelectedTrack(track);
    setSuggestion(null);

    // Check cache first
    const cached = suggestionCache.get(track.id);
    if (cached) {
      setSuggestion(cached);
      toast.info('Sugestão carregada do cache');
      return;
    }

    setAnalyzing(true);

    try {
      setAnalysisStep('Obtendo dados de áudio...');
      const { data: featuresData, error: featuresError } = await supabase.functions.invoke('spotify-search', {
        body: { trackId: track.id },
      });
      if (featuresError) throw featuresError;

      setAnalysisStep('IA analisando timbres e efeitos...');
      const { data: aiData, error: aiError } = await supabase.functions.invoke('suggest-pad-config', {
        body: {
          trackName: track.name,
          artist: track.artist,
          features: featuresData?.features,
          analysis: featuresData?.analysis,
        },
      });
      if (aiError) throw aiError;
      if (aiData?.error) throw new Error(aiData.error);

      // Cache the result
      suggestionCache.set(track.id, aiData.config);
      setSuggestion(aiData.config);
    } catch (e) {
      console.error('Analysis error:', e);
      toast.error('Erro ao analisar música. Tente novamente.');
      setSelectedTrack(null);
    } finally {
      setAnalyzing(false);
      setAnalysisStep('');
    }
  }, []);

  const handleApply = useCallback(() => {
    if (!suggestion) return;
    onApplyConfig(suggestion);
    toast.success('Configuração aplicada nos pads!');
    setOpen(false);
    setQuery('');
    setTracks([]);
    setSelectedTrack(null);
    setSuggestion(null);
  }, [suggestion, onApplyConfig]);

  const formatDuration = (ms: number) => {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Music className="h-4 w-4" />
          <span className="hidden sm:inline">Spotify</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Music className="h-5 w-5 text-green-500" />
            Buscar no Spotify
          </SheetTitle>
          <SheetDescription>
            Busque uma música e a IA analisa o áudio real para sugerir efeitos (EQ, reverb, delay, pan) nos pads
          </SheetDescription>
        </SheetHeader>

        {/* Search */}
        <div className="flex gap-2 mt-4">
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

        {/* Results */}
        <div className="flex-1 overflow-y-auto mt-4 space-y-1">
          {!selectedTrack && tracks.map((track) => (
            <button
              key={track.id}
              onClick={() => handleSelectTrack(track)}
              className="flex items-center gap-3 w-full p-2 rounded-md hover:bg-muted transition-colors text-left"
            >
              {track.image ? (
                <img src={track.image} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0">
                  <Music className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{track.name}</p>
                <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {formatDuration(track.duration_ms)}
              </span>
            </button>
          ))}

          {/* Selected track + analysis */}
          {selectedTrack && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                {selectedTrack.image ? (
                  <img src={selectedTrack.image} alt="" className="w-12 h-12 rounded object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                    <Music className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{selectedTrack.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{selectedTrack.artist}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{selectedTrack.album}</p>
                </div>
                <Button
                  variant="ghost" size="icon" className="h-7 w-7 shrink-0"
                  onClick={() => { setSelectedTrack(null); setSuggestion(null); }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>

              {analyzing && (
                <div className="flex flex-col items-center gap-3 py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <div className="text-center">
                    <p className="text-sm font-medium">Analisando música...</p>
                    <p className="text-xs text-muted-foreground">{analysisStep || 'Processando...'}</p>
                  </div>
                </div>
              )}

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

                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-muted/50 rounded-md p-2 text-center">
                      <span className="text-lg font-bold text-foreground">{suggestion.bpm}</span>
                      <p className="text-[10px] text-muted-foreground">BPM</p>
                    </div>
                    <div className="bg-muted/50 rounded-md p-2 text-center">
                      <span className="text-lg font-bold text-foreground">{suggestion.timeSignature}</span>
                      <p className="text-[10px] text-muted-foreground">Compasso</p>
                    </div>
                    <div className="bg-muted/50 rounded-md p-2 text-center">
                      <span className="text-sm font-bold text-foreground">
                        {suggestion.recommendedLoop === 'loop-rock' ? 'Rock' : 'Ballad'}
                      </span>
                      <p className="text-[10px] text-muted-foreground">Loop</p>
                    </div>
                  </div>




                  {/* Pad configs preview */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase">Efeitos dos Pads</span>
                    {suggestion.pads && Object.entries(suggestion.pads).map(([padId, cfg]) => (
                      <div key={padId} className="flex items-center justify-between text-xs bg-muted/30 rounded px-2 py-1">
                        <span className="font-medium">{PAD_LABELS[padId] || padId}</span>
                        <div className="flex gap-2 text-muted-foreground text-[10px]">
                          <span>Vol {Math.round(cfg.volume * 100)}%</span>
                          {cfg.reverb > 0 && <span>Rev {Math.round(cfg.reverb * 100)}%</span>}
                          {cfg.delay > 0 && <span>Del {Math.round(cfg.delay * 100)}%</span>}
                          {cfg.pan !== 0 && <span>{cfg.pan < 0 ? `L${Math.round(Math.abs(cfg.pan)*100)}` : `R${Math.round(cfg.pan*100)}`}</span>}
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
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SpotifySearch;
