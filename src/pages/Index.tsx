import React, { useState, useCallback, useEffect, useRef } from 'react';
import PadGrid from '@/components/PadGrid';
import Metronome from '@/components/Metronome';
import VolumeControl from '@/components/VolumeControl';
import SetlistManager from '@/components/SetlistManager';
import SpotifySearch from '@/components/SpotifySearch';
import { setMasterVolume, getAudioContext, loadCustomBuffer, removeCustomBuffer, setMasterPan, setMetronomePan, setPadPan } from '@/lib/audio-engine';
import { defaultPads, type SetlistSong } from '@/lib/sounds';
import { saveCustomSound, getCustomSound, deleteCustomSound, getAllCustomSoundIds } from '@/lib/custom-sound-store';
import { addLoop, removeLoop, setLoopBpm, setLoopTimeSignature, updateLoopVolume, stopAllLoops } from '@/lib/loop-engine';
import { type PadEffects, loadAllEffects, saveAllEffects, applyEffects } from '@/lib/audio-effects';
import { type PadColor } from '@/components/PadColorPicker';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useSetlists } from '@/hooks/useSetlists';
import { LogOut, Crown, ChevronUp, ChevronDown, Minus, Plus, Maximize, Minimize, Play, Pause, Download, MoreVertical, HelpCircle, Menu, RefreshCw, Bell, Settings2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import PanControl from '@/components/PanControl';
import TutorialGuide from '@/components/TutorialGuide';
import { useRegisterSW } from 'virtual:pwa-register/react';

const CUSTOM_NAMES_KEY = 'drum-pads-custom-names';
const PAD_SIZE_KEY = 'drum-pads-pad-size';
const FOCUS_MODE_KEY = 'drum-pads-focus-mode';

function loadCustomNames(): Record<string, string> {
  try {
    const data = localStorage.getItem(CUSTOM_NAMES_KEY);
    return data ? JSON.parse(data) : {};
  } catch {return {};}
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
  const { tier } = useSubscription();
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
  const [metronomeIsPlaying, setMetronomeIsPlaying] = useState(false);
  const [padSize, setPadSize] = useState<PadSize>(loadPadSize);
  const [padEffects, setPadEffects] = useState<Record<string, PadEffects>>(loadAllEffects);
  const [padNames, setPadNames] = useState<Record<string, string>>(() => {
    try {const d = localStorage.getItem('drum-pads-pad-names');return d ? JSON.parse(d) : {};} catch {return {};}
  });
  const [focusMode, setFocusMode] = useState(() => localStorage.getItem(FOCUS_MODE_KEY) === 'true');
  const [padPans, setPadPans] = useState<Record<string, number>>(() => {
    try {const d = localStorage.getItem('drum-pads-pad-pans');return d ? JSON.parse(d) : {};} catch {return {};}
  });
  const [metronomePan, setMetronomePanState] = useState(0);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [padColors, setPadColors] = useState<Record<string, PadColor>>(() => {
    try { const d = localStorage.getItem('drum-pads-pad-colors'); return d ? JSON.parse(d) : {}; } catch { return {}; }
  });
  const startTutorialRef = useRef<(() => void) | null>(null);

  // PWA update detection
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      // Check for updates every 60 seconds
      if (r) {
        setInterval(() => { r.update(); }, 60 * 1000);
      }
    },
  });

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        toast.success('App instalado com sucesso!');
      }
      setInstallPrompt(null);
    } else {
      navigate('/install');
    }
  };

  const changePadSize = useCallback((dir: 1 | -1) => {
    setPadSize((prev) => {
      const idx = PAD_SIZES.indexOf(prev);
      const next = PAD_SIZES[Math.max(0, Math.min(PAD_SIZES.length - 1, idx + dir))];
      localStorage.setItem(PAD_SIZE_KEY, next);
      return next;
    });
  }, []);

  const toggleFocusMode = useCallback(() => {
    setFocusMode((prev) => {
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
    const pad = defaultPads.find((p) => p.id === padId);
    if (!pad) return;

    setActiveLoops((prev) => {
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

      // Reset pad settings to defaults
      setPadVolumes((prev) => { const next = { ...prev }; delete next[padId]; localStorage.setItem('drum-pads-volumes', JSON.stringify(next)); return next; });
      setPadPans((prev) => { const next = { ...prev }; delete next[padId]; localStorage.setItem('drum-pads-pad-pans', JSON.stringify(next)); setPadPan(padId, 0); return next; });
      setPadEffects((prev) => { const next = { ...prev }; delete next[padId]; saveAllEffects(next); return next; });

      toast.success(`Som "${file.name}" importado! Configurações resetadas.`);
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
    setPadVolumes((prev) => ({ ...prev, [padId]: vol }));
    updateLoopVolume(padId, vol);
  }, []);

  const handleEffectsChange = useCallback((padId: string, fx: PadEffects) => {
    setPadEffects((prev) => {
      const next = { ...prev, [padId]: fx };
      saveAllEffects(next);
      applyEffects(padId, fx);
      return next;
    });
  }, []);

  const handleRenamePad = useCallback((padId: string, name: string) => {
    setPadNames((prev) => {
      const next = { ...prev };
      if (name) next[padId] = name;else delete next[padId];
      localStorage.setItem('drum-pads-pad-names', JSON.stringify(next));
      return next;
    });
  }, []);

  const handlePadColorChange = useCallback((padId: string, color: PadColor) => {
    setPadColors((prev) => {
      const next = { ...prev, [padId]: color };
      localStorage.setItem('drum-pads-pad-colors', JSON.stringify(next));
      return next;
    });
  }, []);

  const handlePadPanChange = useCallback((padId: string, pan: number) => {
    setPadPans((prev) => {
      const next = { ...prev, [padId]: pan };
      localStorage.setItem('drum-pads-pad-pans', JSON.stringify(next));
      return next;
    });
    setPadPan(padId, pan);
  }, []);

  const handleApplySpotifyConfig = useCallback((config: any) => {
    // Apply BPM
    if (config.bpm) setBpm(Math.round(config.bpm));
    // Apply time signature
    if (config.timeSignature) setTimeSignature(config.timeSignature);
    // Apply pad configs
    if (config.pads) {
      const newVolumes: Record<string, number> = { ...padVolumes };
      const newPans: Record<string, number> = { ...padPans };
      const newEffects: Record<string, PadEffects> = { ...padEffects };

      for (const [padId, cfg] of Object.entries(config.pads) as [string, any][]) {
        if (cfg.volume != null) newVolumes[padId] = cfg.volume;
        if (cfg.pan != null) {
          newPans[padId] = cfg.pan;
          setPadPan(padId, cfg.pan);
        }
        newEffects[padId] = {
          eqLow: cfg.eqLow ?? 0,
          eqMid: cfg.eqMid ?? 0,
          eqHigh: cfg.eqHigh ?? 0,
          reverb: cfg.reverb ?? 0,
          delay: cfg.delay ?? 0,
          delayTime: cfg.delayTime ?? 0.3,
        };
      }

      setPadVolumes(newVolumes);
      localStorage.setItem('drum-pads-volumes', JSON.stringify(newVolumes));
      setPadPans(newPans);
      localStorage.setItem('drum-pads-pad-pans', JSON.stringify(newPans));
      setPadEffects(newEffects);
      saveAllEffects(newEffects);
    }

  }, [padVolumes, padPans, padEffects]);

  const handleMetronomePanChange = useCallback((pan: number) => {
    setMetronomePanState(pan);
    setMetronomePan(pan);
  }, []);

  // Setlist management — now backed by database
  const songs = setlists.flatMap((sl) =>
  sl.songs.length > 0 ? sl.songs.map((s) => ({ ...s, id: sl.id, _setlistId: sl.id })) : [{
    id: sl.id, name: sl.name, bpm: 120, timeSignature: '4/4',
    pads: defaultPads, padVolumes: {}, padNames: {}, padPans: {}, padEffects: {}, customSounds: {},
    _setlistId: sl.id
  }]
  );

  // Auto-save current song before switching
  const autoSaveCurrentSong = useCallback(async () => {
    if (!currentSongId) return;
    const setlist = setlists.find((s) => s.id === currentSongId);
    if (!setlist) return;
    const updatedSong: SetlistSong = {
      id: setlist.songs[0]?.id || currentSongId,
      name: setlist.name,
      bpm,
      timeSignature,
      pads: defaultPads,
      padVolumes: { ...padVolumes },
      padNames: { ...padNames },
      padPans: { ...padPans },
      padEffects: { ...padEffects },
      customSounds: { ...customSounds },
    };
    await updateSetlist(currentSongId, [updatedSong]);
  }, [currentSongId, bpm, timeSignature, padVolumes, padNames, padPans, padEffects, customSounds, setlists, updateSetlist]);

  const handleSaveSong = useCallback(async (name: string) => {
    const song: SetlistSong = {
      id: Date.now().toString(),
      name,
      bpm,
      timeSignature,
      pads: defaultPads,
      padVolumes: { ...padVolumes },
      padNames: { ...padNames },
      padPans: { ...padPans },
      padEffects: { ...padEffects },
      customSounds: { ...customSounds },
    };
    const result = await createSetlist(name, [song]);
    if (result) setCurrentSongId(result.id);
  }, [bpm, timeSignature, padVolumes, padNames, padPans, padEffects, customSounds, createSetlist]);

  const handleLoadSong = useCallback(async (song: SetlistSong) => {
    // Auto-save current song first
    await autoSaveCurrentSong();
    // Stop metronome when switching songs
    setMetronomeIsPlaying(false);
    // Load the new song
    setBpm(song.bpm);
    setTimeSignature(song.timeSignature);
    setPadVolumes(song.padVolumes || {});
    setCurrentSongId((song as any)._setlistId || song.id);
    stopAllLoops();
    setActiveLoops(new Set());
    // Restore per-pad customizations from the song
    setPadNames(song.padNames || {});
    setPadPans(song.padPans || {});
    setPadEffects(song.padEffects || {});
    setCustomSounds(song.customSounds || {});
    // Apply restored pan and effects to audio engine
    Object.entries(song.padPans || {}).forEach(([id, pan]) => setPadPan(id, pan));
    Object.entries(song.padEffects || {}).forEach(([id, fx]) => applyEffects(id, fx));
  }, [autoSaveCurrentSong]);

  const handleDeleteSong = useCallback(async (id: string) => {
    await deleteSetlist(id);
    if (currentSongId === id) setCurrentSongId(null);
  }, [deleteSetlist, currentSongId]);

  const currentSongName = currentSongId ? setlists.find((s) => s.id === currentSongId)?.name || null : null;

  return (
    <div className="flex flex-col h-[100dvh] bg-background overflow-hidden" onPointerDown={initAudio}>
      {/* Header - hidden in focus mode */}
      {!focusMode &&
      <header className="flex items-center justify-between px-3 py-2 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-2 min-w-0 shrink-0">
            <span className="text-lg font-bold text-primary">🥁</span>
            <h1 className="text-sm font-bold text-foreground tracking-tight hidden sm:block">Drum Pads Worship</h1>
            <h1 className="text-sm font-bold text-foreground tracking-tight sm:hidden">DPW</h1>
          </div>

          {/* Current song name - centered */}
          <div className="flex-1 min-w-0 mx-2 text-center">
            {currentSongName &&
          <span className="text-xs font-medium text-primary truncate block">
                ♪ {currentSongName}
              </span>
          }
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Pad size controls */}
            <div className="flex items-center gap-0.5 mr-1 border border-border rounded-md" data-tutorial="pad-size">
              <button
              onClick={() => changePadSize(-1)}
              disabled={padSize === 'sm'}
              className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
              title="Diminuir pads">
                <Minus className="h-3 w-3" />
              </button>
              <span className="text-[10px] text-muted-foreground w-5 text-center uppercase tabular-nums">{padSize}</span>
              <button
              onClick={() => changePadSize(1)}
              disabled={padSize === 'lg'}
              className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
              title="Aumentar pads">
                <Plus className="h-3 w-3" />
              </button>
            </div>

            <div data-tutorial="setlist">
            <SetlistManager
            songs={songs}
            currentSongId={currentSongId}
            onSaveSong={handleSaveSong}
            onLoadSong={handleLoadSong}
            onDeleteSong={handleDeleteSong}
            onReorder={reorderSetlists} />
            </div>

            <SpotifySearch onApplyConfig={handleApplySpotifyConfig} />

            <button
            onClick={toggleFocusMode}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Modo foco"
            data-tutorial="focus-mode">
              <Maximize className="h-4 w-4" />
            </button>

            {/* Unified menu */}
            <div className="relative">
              <button
                onClick={() => setMobileMenuOpen((p) => !p)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors relative"
                title="Menu">
                <Menu className="h-4 w-4" />
                {needRefresh && (
                  <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
                )}
              </button>
              {mobileMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMobileMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-lg shadow-xl py-1 min-w-[180px]" style={{ backgroundColor: 'hsl(var(--card))' }}>
                    {needRefresh && (
                      <button onClick={() => { updateServiceWorker(true); setMobileMenuOpen(false); }} className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-primary font-medium hover:bg-muted transition-colors">
                        <Bell className="h-4 w-4 text-primary animate-bounce" /> Nova versão disponível!
                      </button>
                    )}
                    <button onClick={() => { handleInstallClick(); setMobileMenuOpen(false); }} className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors">
                      <Download className="h-4 w-4 text-muted-foreground" /> Instalar App
                    </button>
                    <button onClick={() => { setEditMode(p => !p); setMobileMenuOpen(false); }} className={`flex items-center gap-2 w-full px-3 py-2.5 text-sm transition-colors ${editMode ? 'text-primary font-medium bg-primary/10' : 'text-foreground hover:bg-muted'}`}>
                      <Settings2 className="h-4 w-4" /> {editMode ? 'Sair do modo edição' : 'Modo Edição'}
                    </button>
                    <button onClick={() => { navigate('/pricing'); setMobileMenuOpen(false); }} className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors">
                      <Crown className="h-4 w-4 text-muted-foreground" /> Planos
                    </button>
                    <button onClick={() => { if (startTutorialRef.current) startTutorialRef.current(); setMobileMenuOpen(false); }} className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors">
                      <HelpCircle className="h-4 w-4 text-muted-foreground" /> Guia Prático
                    </button>
                    <button onClick={async () => {
                      setMobileMenuOpen(false);
                      if ('caches' in window) {
                        const keys = await caches.keys();
                        await Promise.all(keys.map((k) => caches.delete(k)));
                      }
                      if ('serviceWorker' in navigator) {
                        const regs = await navigator.serviceWorker.getRegistrations();
                        await Promise.all(regs.map((r) => r.unregister()));
                      }
                      toast.success('Cache limpo! Recarregando...');
                      setTimeout(() => window.location.reload(), 500);
                    }} className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors">
                      <RefreshCw className="h-4 w-4 text-muted-foreground" /> Atualizar App
                    </button>
                    <div className="border-t border-border my-1" />
                    <button onClick={() => { signOut(); setMobileMenuOpen(false); }} className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-destructive hover:bg-muted transition-colors">
                      <LogOut className="h-4 w-4" /> Sair
                    </button>
                  </div>
                </>
              )}
            </div>

            <TutorialGuide externalTrigger onStartRef={(fn) => { startTutorialRef.current = fn; }} />
          </div>
        </header>
      }

      {/* Info bar - hidden in focus mode */}
      {!focusMode &&
      <div className="px-3 py-1 text-[10px] text-muted-foreground text-center border-b border-border/50 hidden sm:block">Segure um pad para ajustar volume e importar som.

      </div>
      }

      {/* Pad Grid - Main area */}
      <main className="flex-1 flex items-center justify-center overflow-hidden">
        <div data-tutorial="pad-grid" className="w-full h-full flex items-center justify-center">
        <PadGrid
          isMasterTier={tier === 'master'}
          tier={tier}
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
          padColors={padColors}
          onPadColorChange={handlePadColorChange}
          editMode={editMode} />
        </div>
      </main>

      {/* Bottom controls */}
      <footer className="shrink-0 border-t border-border bg-card/50 backdrop-blur p-2 sm:p-3 space-y-2">
        <div className="max-w-[600px] mx-auto space-y-2">
          {/* Focus mode: show exit button + song name */}
          {focusMode &&
          <div className="flex items-center justify-between">
              {currentSongName &&
            <span className="text-xs font-medium text-primary truncate">♪ {currentSongName}</span>
            }
              <button
              onClick={toggleFocusMode}
              className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors ml-auto"
              title="Sair do modo foco">

                <Minimize className="h-3 w-3" />
                Sair do foco
              </button>
            </div>
          }

          {!focusMode &&
          <div data-tutorial="volume-master">
          <VolumeControl
            volume={masterVolume}
            onVolumeChange={setMasterVol}
            label="Volume Master" />
          </div>
          }

          {/* Metronome */}
          <div className="bg-card rounded-lg border border-border overflow-hidden" data-tutorial="metronome">
            <div className="flex items-center justify-between w-full px-4 py-2 hover:bg-muted/50 transition-colors cursor-pointer"
            onClick={() => setMetronomeOpen((prev) => !prev)}>

              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-foreground tabular-nums">{bpm}</span>
                <span className="text-xs text-muted-foreground">BPM</span>
                <span className="text-xs text-muted-foreground">· {timeSignature}</span>
              </div>
              <div className="flex items-center gap-1">
                {!metronomeOpen &&
                <button
                  type="button"
                  onClick={(e) => {e.stopPropagation();setMetronomeIsPlaying((prev) => !prev);}}
                  className={`p-1.5 rounded-md transition-colors ${
                  metronomeIsPlaying ?
                  'text-destructive hover:bg-destructive/10' :
                  'text-primary hover:bg-primary/10'}`
                  }
                  title={metronomeIsPlaying ? 'Parar metrônomo' : 'Iniciar metrônomo'}>

                    {metronomeIsPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>
                }
                {metronomeOpen ?
                <ChevronDown className="h-4 w-4 text-muted-foreground" /> :

                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                }
              </div>
            </div>
            <div className={metronomeOpen ? 'px-0 pb-0' : 'hidden'}>
              <Metronome
                bpm={bpm}
                onBpmChange={setBpm}
                timeSignature={timeSignature}
                onTimeSignatureChange={setTimeSignature}
                isPlaying={metronomeIsPlaying}
                onTogglePlay={() => setMetronomeIsPlaying((prev) => !prev)} />

              <PanControl
                label="Pan Metrônomo"
                pan={metronomePan}
                onPanChange={handleMetronomePanChange} />

            </div>
          </div>
        </div>
      </footer>
    </div>);

};

export default Index;