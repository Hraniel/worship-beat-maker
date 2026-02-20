import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import logoDark from '@/assets/logo-dark.png';
import logoLight from '@/assets/logo-light.png';
import { Slider } from '@/components/ui/slider';
import PadGrid from '@/components/PadGrid';
import Metronome from '@/components/Metronome';
import MixerStrip from '@/components/MixerStrip';
import ToolsPanel from '@/components/ToolsPanel';
import SetlistManager from '@/components/SetlistManager';
import MusicAISearch from '@/components/MusicAISearch';
import AmbientPads from '@/components/AmbientPads';
import LandscapeSwipePanels from '@/components/LandscapeSwipePanels';
import { useIsLandscape, useIsTablet, useIsDesktop } from '@/hooks/use-mobile';
import { setMasterVolume, getAudioContext, loadCustomBuffer, removeCustomBuffer, setMasterPan, setMetronomePan, setPadPan } from '@/lib/audio-engine';
import { defaultPads, type SetlistSong } from '@/lib/sounds';
import { saveCustomSound, getCustomSound, deleteCustomSound, getAllCustomSoundIds, saveCustomSoundsForSong, loadCustomSoundsForSong, deleteCustomSoundsForSong } from '@/lib/custom-sound-store';
import { addLoop, removeLoop, setLoopBpm, setLoopTimeSignature, updateLoopVolume, stopAllLoops, setMetronomeVolume, getMetronomeVolume } from '@/lib/loop-engine';

import { getAmbientVolume, setAmbientVolume } from '@/lib/ambient-engine';
import { type PadEffects, loadAllEffects, saveAllEffects, applyEffects, calcBpmDelayTime } from '@/lib/audio-effects';
import { type PadColor } from '@/components/PadColorPicker';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useSetlists } from '@/hooks/useSetlists';
import { useFeatureGates } from '@/hooks/useFeatureGates';
import UpgradeGateModal, { type UpgradeGatePayload } from '@/components/UpgradeGateModal';
import { LogOut, ChevronUp, ChevronDown, Minus, Plus, Maximize, Minimize, Play, Pause, Download, MoreVertical, Menu, RefreshCw, Bell, Settings2, ListMusic, X, Check, Lock, Music, Sliders, Sparkles, MonitorPlay, Drum, Store, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import PanControl from '@/components/PanControl';
import TutorialGuide from '@/components/TutorialGuide';
import SettingsDialog, { loadAudioSettings, type AudioSettings } from '@/components/SettingsDialog';
import UpdateBanner from '@/components/UpdateBanner';
import OfflineBanner from '@/components/OfflineBanner';
import NotificationBanner from '@/components/NotificationBanner';
import NotificationPromptBanner from '@/components/NotificationPromptBanner';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import PerformanceMode from '@/components/PerformanceMode';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useUserNotifications } from '@/hooks/useUserNotifications';
import { useNotificationPrompt } from '@/hooks/useNotificationPrompt';
import { usePresenceTracker } from '@/hooks/usePresenceTracker';
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

// Pad size: numeric scale 30–100 (percentage of max grid width)
const PAD_SIZE_MIN = 30;
const PAD_SIZE_MAX = 100;
const PAD_SIZE_DEFAULT = 65;

function loadPadSize(): number {
  const v = Number(localStorage.getItem(PAD_SIZE_KEY));
  if (v >= PAD_SIZE_MIN && v <= PAD_SIZE_MAX) return v;
  return PAD_SIZE_DEFAULT;
}

function padSizeToTextSize(size: number): 'sm' | 'md' | 'lg' {
  if (size < 45) return 'sm';
  if (size < 75) return 'md';
  return 'lg';
}

const Index = () => {
  const { signOut, user } = useAuth();
  const { tier } = useSubscription();
  const { canAccess } = useFeatureGates();
  usePresenceTracker(user?.id);
  const isOnline = useOnlineStatus();
  const isLandscape = useIsLandscape();
  const isTablet = useIsTablet();
  const isDesktop = useIsDesktop();
  const { setlists, createSetlist, updateSetlist, deleteSetlist, reorderSetlists } = useSetlists();
  const navigate = useNavigate();
  const [masterVolume, setMasterVol] = useState(0.7);
  const [metronomeVol, setMetronomeVol] = useState(getMetronomeVolume);
  const [ambientVol, setAmbientVol] = useState(getAmbientVolume);
  const [bpm, setBpm] = useState(120);
  const [timeSignature, setTimeSignature] = useState('4/4');
  const [activeLoops, setActiveLoops] = useState<Set<string>>(new Set());
  const [padVolumes, setPadVolumes] = useState<Record<string, number>>({});
  const [currentSongId, setCurrentSongId] = useState<string | null>(null);
  const [audioReady, setAudioReady] = useState(false);
  const [customSounds, setCustomSounds] = useState<Record<string, string>>(loadCustomNames);
  const [metronomeOpen, setMetronomeOpen] = useState(true);
  const [metronomeIsPlaying, setMetronomeIsPlaying] = useState(false);
  const [spotifyTrackName, setSpotifyTrackName] = useState<string | null>(null);
  const [spotifyKey, setSpotifyKey] = useState<string | null>(null);
  const [editingHeaderBpm, setEditingHeaderBpm] = useState(false);
  const [headerBpmValue, setHeaderBpmValue] = useState('');
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [spotifySongName, setSpotifySongName] = useState('');
  const [padSize, setPadSize] = useState<number>(loadPadSize);
  const [padEffects, setPadEffects] = useState<Record<string, PadEffects>>(loadAllEffects);
  const [padNames, setPadNames] = useState<Record<string, string>>(() => {
    try {const d = localStorage.getItem('drum-pads-pad-names');return d ? JSON.parse(d) : {};} catch {return {};}
  });
  const [focusMode, setFocusMode] = useState(false);
  const [padPans, setPadPans] = useState<Record<string, number>>(() => {
    try {const d = localStorage.getItem('drum-pads-pad-pans');return d ? JSON.parse(d) : {};} catch {return {};}
  });
  const [metronomePan, setMetronomePanState] = useState(0);
  const [masterPanState, setMasterPanState] = useState(0);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [performanceModeOpen, setPerformanceModeOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [footerPage, setFooterPage] = useState(0);
  const [faderPage, setFaderPage] = useState(0);
  const [spotifySheetOpen, setSpotifySheetOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [upgradeGate, setUpgradeGate] = useState<UpgradeGatePayload | null>(null);
  const [openSetlistFromBanner, setOpenSetlistFromBanner] = useState(false);

  // Mixer gate check
  const mixerFaderAccess = canAccess('mixer_faders');
  const showMixerLocked = !mixerFaderAccess.allowed;

  const openMixerGate = useCallback(() => {
    const g = mixerFaderAccess.gate;
    if (g) {
      setUpgradeGate({
        gateKey: g.gate_key,
        gateLabel: g.gate_label,
        requiredTier: g.required_tier,
        description: g.description,
      });
    } else {
      setUpgradeGate({ gateKey: 'mixer_faders', gateLabel: 'Mixer de faders', requiredTier: 'pro', description: 'Controle individual de volume por fader' });
    }
  }, [mixerFaderAccess]);


  const tryAccess = useCallback((gateKey: string): boolean => {
    const result = canAccess(gateKey);
    if (!result.allowed && result.gate) {
      setUpgradeGate({
        gateKey: result.gate.gate_key,
        gateLabel: result.gate.gate_label,
        requiredTier: result.gate.required_tier,
        description: result.gate.description,
      });
    }
    return result.allowed;
  }, [canAccess]);
  
  const [padColors, setPadColors] = useState<Record<string, PadColor>>(() => {
    try { const d = localStorage.getItem('drum-pads-pad-colors'); return d ? JSON.parse(d) : {}; } catch { return {}; }
  });
  const startTutorialRef = useRef<((sectionId?: string) => void) | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<string | undefined>(undefined);
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(loadAudioSettings);

  // Reopen settings when returning from /pricing
  useEffect(() => {
    const flag = sessionStorage.getItem('settings-return-tab');
    if (flag) {
      sessionStorage.removeItem('settings-return-tab');
      setSettingsTab(flag);
      setSettingsOpen(true);
    }
    const openSettings = sessionStorage.getItem('open-settings');
    if (openSettings) {
      sessionStorage.removeItem('open-settings');
      setSettingsTab(undefined);
      setSettingsOpen(true);
    }
    // Restore previously selected song when returning from /pricing (upgrade gate flow)
    const restoredSongId = sessionStorage.getItem('restore-song-id');
    if (restoredSongId) {
      sessionStorage.removeItem('restore-song-id');
      setCurrentSongId(restoredSongId);
    }
  }, []);

  // Swipe-back / browser back gesture: fecha o painel aberto em vez de navegar
  useEffect(() => {
    const hasOpenPanel =
      mobileMenuOpen || settingsOpen || spotifySheetOpen || performanceModeOpen || !!upgradeGate || editMode;

    if (hasOpenPanel) {
      window.history.pushState(null, '', window.location.href);
    }

    const handlePopState = () => {
      if (mobileMenuOpen) { setMobileMenuOpen(false); return; }
      if (settingsOpen) { setSettingsOpen(false); return; }
      if (spotifySheetOpen) { setSpotifySheetOpen(false); return; }
      if (performanceModeOpen) { setPerformanceModeOpen(false); return; }
      if (upgradeGate) { setUpgradeGate(null); return; }
      if (editMode) { setEditMode(false); return; }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [mobileMenuOpen, settingsOpen, spotifySheetOpen, performanceModeOpen, upgradeGate, editMode]);


  const handleAudioSettingsChange = useCallback((settings: AudioSettings) => {
    setAudioSettings(settings);

    // Pads: auto-set all pad pans
    if (settings.padsStereo === 'mono') {
      // Reset all pad pans to center
      const resetPans: Record<string, number> = {};
      Object.keys(padPans).forEach(id => { resetPans[id] = 0; setPadPan(id, 0); });
      setPadPans(resetPans);
      localStorage.setItem('drum-pads-pad-pans', JSON.stringify(resetPans));
    } else if (settings.padsSide) {
      const panVal = settings.padsSide === 'left' ? -1 : 1;
      const newPans: Record<string, number> = {};
      defaultPads.forEach(p => { newPans[p.id] = panVal; setPadPan(p.id, panVal); });
      setPadPans(newPans);
      localStorage.setItem('drum-pads-pad-pans', JSON.stringify(newPans));
    }

    // Metronome
    if (settings.metronomeStereo === 'mono') {
      setMetronomePanState(0);
      setMetronomePan(0);
    } else if (settings.metronomeSide) {
      const panVal = settings.metronomeSide === 'left' ? -1 : 1;
      setMetronomePanState(panVal);
      setMetronomePan(panVal);
    }

    // Master pan (for ambient - handled via event)
    if (settings.ambientStereo === 'mono') {
      window.dispatchEvent(new CustomEvent('settings:ambient-pan', { detail: { pan: 0, disabled: true } }));
    } else if (settings.ambientSide) {
      const panVal = settings.ambientSide === 'left' ? -1 : 1;
      window.dispatchEvent(new CustomEvent('settings:ambient-pan', { detail: { pan: panVal, disabled: false } }));
    }
  }, [padPans, defaultPads]);

  // Import from Glory Store
  const handleImportStoreSound = useCallback(async (padId: string, soundName: string, arrayBuffer: ArrayBuffer) => {
    try {
      await loadCustomBuffer(padId, arrayBuffer);
      await saveCustomSound(padId, arrayBuffer, soundName);
      const updated = { ...customSounds, [padId]: soundName };
      setCustomSounds(updated);
      saveCustomNames(updated);

      setPadVolumes((prev) => { const next = { ...prev }; delete next[padId]; localStorage.setItem('drum-pads-volumes', JSON.stringify(next)); return next; });
      setPadPans((prev) => { const next = { ...prev }; delete next[padId]; localStorage.setItem('drum-pads-pad-pans', JSON.stringify(next)); setPadPan(padId, 0); return next; });
      setPadEffects((prev) => { const next = { ...prev }; delete next[padId]; saveAllEffects(next); return next; });

      toast.success(`Som "${soundName}" importado da Glory Store!`);
    } catch (e) {
      console.error('Error importing store sound:', e);
      toast.error('Erro ao importar som da loja.');
    }
  }, [customSounds]);


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

  const { notifications: adminNotifications, markAsRead: markNotifAsRead, markAllAsRead: markAllNotifsAsRead } = useUserNotifications();
  const { shouldShow: showNotifPrompt, dismiss: dismissNotifPrompt } = useNotificationPrompt(!!user);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Tutorial auto-expand listeners
  useEffect(() => {
    const expandMetronome = () => setMetronomeOpen(true);
    window.addEventListener('tutorial:expand-metronome', expandMetronome);
    return () => window.removeEventListener('tutorial:expand-metronome', expandMetronome);
  }, []);

  // Sync audio settings from external changes (e.g. ambient pan reset)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) setAudioSettings(detail);
    };
    window.addEventListener('settings:audio-changed', handler);
    return () => window.removeEventListener('settings:audio-changed', handler);
  }, []);

  // Media Session API: tells the OS this is a media app so it keeps audio
  // alive when the screen locks or the user switches to another app.
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: 'Worship Beat Maker',
      artist: 'Beat ao vivo',
      album: 'Metrônomo',
    });
    // Prevent the OS from pausing us when the screen locks
    navigator.mediaSession.setActionHandler('play', () => {
      getAudioContext().resume().catch(() => {});
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      // Do nothing – we keep playing
    });
    navigator.mediaSession.playbackState = 'playing';
  }, []);

  // Visibility change: resume AudioContext if OS suspended it
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        getAudioContext().resume().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
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

  const handlePadSizeChange = useCallback((value: number) => {
    const clamped = Math.max(PAD_SIZE_MIN, Math.min(PAD_SIZE_MAX, value));
    setPadSize(clamped);
    localStorage.setItem(PAD_SIZE_KEY, String(clamped));
  }, []);

  const toggleFocusMode = useCallback(() => {
    setFocusMode((prev) => !prev);
  }, []);

  // Keep loop engine in sync with BPM/time signature
  const bpmRef = useRef(bpm);
  const tsRef = useRef(timeSignature);

  useEffect(() => {
    bpmRef.current = bpm;
    setLoopBpm(bpm);
    // Resync all pads that have BPM-synced delay active
    setPadEffects((prev) => {
      const updated: Record<string, typeof prev[string]> = {};
      let changed = false;
      Object.entries(prev).forEach(([padId, fx]) => {
        if (fx.delaySyncBpm && fx.delay > 0) {
          const newDelayTime = calcBpmDelayTime(bpm, fx.delaySubdivision);
          updated[padId] = { ...fx, delayTime: newDelayTime };
          applyEffects(padId, { ...fx, delayTime: newDelayTime });
          changed = true;
        } else {
          updated[padId] = fx;
        }
      });
      if (!changed) return prev;
      saveAllEffects(updated);
      return updated;
    });
  }, [bpm]);

  useEffect(() => {
    tsRef.current = timeSignature;
    setLoopTimeSignature(timeSignature);
  }, [timeSignature]);

  // Cleanup loops on unmount
  useEffect(() => {
    return () => stopAllLoops();
  }, []);

  // Auto-save key to current song whenever spotifyKey changes
  const autoSaveKeyRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaveCurrentSongRef = useRef<(() => Promise<void>) | null>(null);


  // Load custom sounds from IndexedDB
  const customSoundsLoadedRef = useRef(false);
  const loadCustomSounds = useCallback(async () => {
    if (customSoundsLoadedRef.current) return;
    customSoundsLoadedRef.current = true;
    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') await ctx.resume();
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
    } catch (e) {
      console.warn('Failed to load custom sounds:', e);
      customSoundsLoadedRef.current = false; // allow retry
    }
  }, []);

  // Init audio on first interaction
  const initAudio = useCallback(() => {
    if (!audioReady) {
      getAudioContext();
      setAudioReady(true);
      loadCustomSounds();
    }
  }, [audioReady, loadCustomSounds]);

  useEffect(() => {
    const handler = () => initAudio();
    document.addEventListener('pointerdown', handler, { once: true });
    return () => document.removeEventListener('pointerdown', handler);
  }, [initAudio]);

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
      const next = { ...prev };
      if (color) {
        next[padId] = color;
      } else {
        delete next[padId];
      }
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
    // Clear side selection if pan moved to center
    if (pan === 0) {
      setAudioSettings(prev => {
        if (prev.padsSide) {
          const next = { ...prev, padsSide: null as 'left' | 'right' | null };
          localStorage.setItem('drum-pads-audio-settings', JSON.stringify(next));
          return next;
        }
        return prev;
      });
    }
  }, []);

  const handleResetPad = useCallback((padId: string) => {
    // Reset volume
    setPadVolumes((prev) => { const next = { ...prev }; delete next[padId]; localStorage.setItem('drum-pads-volumes', JSON.stringify(next)); return next; });
    // Reset pan
    setPadPans((prev) => { const next = { ...prev }; delete next[padId]; localStorage.setItem('drum-pads-pad-pans', JSON.stringify(next)); setPadPan(padId, 0); return next; });
    // Reset effects
    setPadEffects((prev) => { const next = { ...prev }; delete next[padId]; saveAllEffects(next); return next; });
    // Reset name
    setPadNames((prev) => { const next = { ...prev }; delete next[padId]; localStorage.setItem('drum-pads-pad-names', JSON.stringify(next)); return next; });
    // Reset color
    setPadColors((prev) => { const next = { ...prev }; delete next[padId]; localStorage.setItem('drum-pads-pad-colors', JSON.stringify(next)); return next; });
    // Remove custom sound
    removeCustomBuffer(padId);
    deleteCustomSound(padId);
    setCustomSounds((prev) => { const next = { ...prev }; delete next[padId]; saveCustomNames(next); return next; });
    toast.success('Pad redefinido!');
  }, []);

  const handleResetAllPads = useCallback(() => {
    defaultPads.forEach(p => {
      removeCustomBuffer(p.id);
      deleteCustomSound(p.id);
      setPadPan(p.id, 0);
    });
    setPadVolumes({});
    localStorage.setItem('drum-pads-volumes', '{}');
    setPadPans({});
    localStorage.setItem('drum-pads-pad-pans', '{}');
    setPadEffects({});
    saveAllEffects({});
    setPadNames({});
    localStorage.setItem('drum-pads-pad-names', '{}');
    setPadColors({});
    localStorage.setItem('drum-pads-pad-colors', '{}');
    setCustomSounds({});
    saveCustomNames({});
    toast.success('Todos os pads redefinidos!');
  }, []);

  // Set of native pad IDs (not custom sounds) - only apply AI config to these
  const nativePadIds = new Set(defaultPads.map((p) => p.id));

  const handleApplySpotifyConfig = useCallback((config: any) => {
    // Save track name and key
    if (config.trackName) {
      setSpotifyTrackName(config.trackName);
      const songOnly = config.trackName.split(' - ')[0] || config.trackName;
      setSpotifySongName(songOnly);
      setShowSavePrompt(true);
    }
    if (config.key) setSpotifyKey(config.key);
    // Apply BPM
    if (config.bpm) setBpm(Math.round(config.bpm));
    // Apply time signature
    if (config.timeSignature) setTimeSignature(config.timeSignature);
    // Apply pad configs — only to native pads (not custom imported sounds)
    if (config.pads) {
      const newVolumes: Record<string, number> = { ...padVolumes };
      const newPans: Record<string, number> = { ...padPans };
      const newEffects: Record<string, PadEffects> = { ...padEffects };

      for (const [padId, cfg] of Object.entries(config.pads) as [string, any][]) {
        // Skip if this pad has a custom imported sound
        if (!nativePadIds.has(padId)) continue;
        if (customSounds[padId]) continue;
        if (cfg.volume != null) newVolumes[padId] = cfg.volume;
        newPans[padId] = 0;
        setPadPan(padId, 0);
        newEffects[padId] = {
          eqLow: cfg.eqLow ?? 0,
          eqMid: cfg.eqMid ?? 0,
          eqHigh: cfg.eqHigh ?? 0,
          reverb: cfg.reverb ?? 0,
          delay: cfg.delay ?? 0,
          delayTime: cfg.delayTime ?? 0.3,
          delaySyncBpm: false,
          delaySubdivision: '1/4',
        };
      }

      setPadVolumes(newVolumes);
      localStorage.setItem('drum-pads-volumes', JSON.stringify(newVolumes));
      setPadPans(newPans);
      localStorage.setItem('drum-pads-pad-pans', JSON.stringify(newPans));
      setPadEffects(newEffects);
      saveAllEffects(newEffects);
    }

  }, [padVolumes, padPans, padEffects, customSounds]);

  // Add song from Music AI to setlist directly (without AI pad config)
  const handleMusicAIAddToSetlist = useCallback(async (song: { name: string; artist: string }, bpm: number, key: string | null) => {
    const name = song.name;
    if (key) setSpotifyKey(key);
    setBpm(bpm);
    const newSong: import('@/lib/sounds').SetlistSong = {
      id: Date.now().toString(),
      name,
      bpm,
      timeSignature,
      key: key || null,
      pads: defaultPads,
      padVolumes: {},
      padNames: {},
      padPans: {},
      padEffects: {},
      customSounds: {},
    };
    const result = await createSetlist(name, [newSong]);
    if (result) {
      setCurrentSongId(result.id);
      setSpotifyTrackName(`${song.name} - ${song.artist}`);
    }
  }, [timeSignature, createSetlist]);

  const handleMetronomePanChange = useCallback((pan: number) => {
    setMetronomePanState(pan);
    setMetronomePan(pan);
    // Clear side selection if pan moved to center
    if (pan === 0) {
      setAudioSettings(prev => {
        if (prev.metronomeSide) {
          const next = { ...prev, metronomeSide: null as 'left' | 'right' | null };
          localStorage.setItem('drum-pads-audio-settings', JSON.stringify(next));
          return next;
        }
        return prev;
      });
    }
  }, []);

  const handleMetronomeVolChange = useCallback((v: number) => {
    setMetronomeVol(v);
    setMetronomeVolume(v);
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
      key: spotifyKey,
      pads: defaultPads,
      padVolumes: { ...padVolumes },
      padNames: { ...padNames },
      padPans: { ...padPans },
      padEffects: { ...padEffects },
      customSounds: { ...customSounds },
    };
    // Save audio buffers for this song
    const customPadIds = Object.keys(customSounds);
    if (customPadIds.length > 0) {
      await saveCustomSoundsForSong(currentSongId, customPadIds);
    }
    await updateSetlist(currentSongId, [updatedSong]);
  }, [currentSongId, bpm, timeSignature, spotifyKey, padVolumes, padNames, padPans, padEffects, customSounds, setlists, updateSetlist]);

  // Keep ref updated so key-change effect calls the latest closure
  useEffect(() => { autoSaveCurrentSongRef.current = autoSaveCurrentSong; }, [autoSaveCurrentSong]);

  // When key changes and there's an active song, debounce-save it
  useEffect(() => {
    if (!currentSongId) return;
    if (autoSaveKeyRef.current) clearTimeout(autoSaveKeyRef.current);
    autoSaveKeyRef.current = setTimeout(() => {
      autoSaveCurrentSongRef.current?.();
    }, 600);
    return () => { if (autoSaveKeyRef.current) clearTimeout(autoSaveKeyRef.current); };
  }, [spotifyKey, currentSongId]);

  const handleSaveSong = useCallback(async (name: string) => {
    const song: SetlistSong = {
      id: Date.now().toString(),
      name,
      bpm,
      timeSignature,
      key: spotifyKey,
      pads: defaultPads,
      padVolumes: { ...padVolumes },
      padNames: { ...padNames },
      padPans: { ...padPans },
      padEffects: { ...padEffects },
      customSounds: { ...customSounds },
    };
    const result = await createSetlist(name, [song]);
    if (result) {
      // Save audio buffers for this song
      const customPadIds = Object.keys(customSounds);
      if (customPadIds.length > 0) {
        await saveCustomSoundsForSong(result.id, customPadIds);
      }
      setCurrentSongId(result.id);
    }
  }, [bpm, timeSignature, spotifyKey, padVolumes, padNames, padPans, padEffects, customSounds, createSetlist]);

  const handleLoadSong = useCallback(async (song: SetlistSong) => {
    // Auto-save current song first
    await autoSaveCurrentSong();
    // Stop metronome when switching songs
    setMetronomeIsPlaying(false);
    const songSetlistId = (song as any)._setlistId || song.id;
    // Load the new song
    setBpm(song.bpm);
    setTimeSignature(song.timeSignature);
    setSpotifyKey(song.key ?? null);
    setSpotifyTrackName(song.key ? `${song.name} · ${song.key}` : song.name);
    setPadVolumes(song.padVolumes || {});
    setCurrentSongId(songSetlistId);
    stopAllLoops();
    setActiveLoops(new Set());
    // Restore per-pad customizations from the song
    setPadNames(song.padNames || {});
    setPadPans(song.padPans || {});
    setPadEffects(song.padEffects || {});

    // Remove all current custom buffers first
    const currentCustomIds = Object.keys(customSounds);
    for (const id of currentCustomIds) {
      removeCustomBuffer(id);
    }

    // Restore song-specific custom sounds from IndexedDB
    const songCustomSounds = song.customSounds || {};
    const songCustomPadIds = Object.keys(songCustomSounds);
    if (songCustomPadIds.length > 0) {
      const loaded = await loadCustomSoundsForSong(songSetlistId, songCustomPadIds);
      // Load audio buffers into engine
      for (const [padId, data] of Object.entries(loaded)) {
        try {
          await loadCustomBuffer(padId, data.buffer);
        } catch (e) {
          console.warn('Failed to load custom sound for pad:', padId, e);
        }
      }
    }
    setCustomSounds(songCustomSounds);

    // Apply restored pan and effects to audio engine
    Object.entries(song.padPans || {}).forEach(([id, pan]) => setPadPan(id, pan));
    Object.entries(song.padEffects || {}).forEach(([id, fx]) => applyEffects(id, fx));
  }, [autoSaveCurrentSong, customSounds]);

  const handleDeleteSong = useCallback(async (id: string) => {
    await deleteCustomSoundsForSong(id);
    await deleteSetlist(id);
    if (currentSongId === id) setCurrentSongId(null);
  }, [deleteSetlist, currentSongId]);

  const currentSongName = currentSongId ? setlists.find((s) => s.id === currentSongId)?.name || null : null;

  return (
    <div className="flex flex-col bg-background overflow-hidden" style={{ height: 'calc(100dvh + env(safe-area-inset-bottom, 0px))', paddingTop: 'env(safe-area-inset-top, 0px)', paddingLeft: 'env(safe-area-inset-left, 0px)', paddingRight: 'env(safe-area-inset-right, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)', boxSizing: 'border-box' }} onPointerDown={initAudio}>
      {/* Performance Mode overlay */}
      {performanceModeOpen && (
        <PerformanceMode
          songs={songs}
          currentSongId={currentSongId}
          bpm={bpm}
          spotifyKey={spotifyKey}
          metronomeIsPlaying={metronomeIsPlaying}
          onTogglePlay={() => setMetronomeIsPlaying(p => !p)}
          onLoadSong={handleLoadSong}
          onClose={() => setPerformanceModeOpen(false)}
        />
      )}
      <NotificationBanner
        notifications={adminNotifications}
        onMarkAsRead={markNotifAsRead}
        onMarkAllAsRead={markAllNotifsAsRead}
      />
      <UpdateBanner show={needRefresh} onUpdate={async () => { await updateServiceWorker(true); window.location.reload(); }} />
      <OfflineBanner isOffline={!isOnline} />
      {showNotifPrompt && (
        <NotificationPromptBanner onDismiss={dismissNotifPrompt} />
      )}
      {/* Header */}
      {!focusMode ? (
      <header className="flex items-center justify-between px-2 sm:px-3 py-1 sm:py-2 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-1.5 min-w-0 shrink-0">
            <img src={document.documentElement.classList.contains('dark') ? logoLight : logoDark} alt="DPW" className="h-5 w-5 sm:h-6 sm:w-6" />
            <h1 className="text-sm font-bold text-foreground tracking-tight hidden sm:block">Glory Pads</h1>
          </div>

          {/* Current song name - centered */}
          <div className="flex-1 min-w-0 mx-1 sm:mx-2 text-center">
            {currentSongName &&
          <span className="text-[11px] sm:text-xs font-medium text-primary truncate block">
                ♪ {currentSongName}
              </span>
          }
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Pad size controls - always visible when song selected */}
            {currentSongId && (
            <div className="flex items-center gap-0.5 sm:gap-1 mr-0.5 sm:mr-1 border border-border rounded-md px-1 sm:px-2 py-0.5 sm:py-1" data-tutorial="pad-size">
              <Minus className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground shrink-0" />
              <Slider
                value={[padSize]}
                onValueChange={([v]) => handlePadSizeChange(v)}
                min={PAD_SIZE_MIN}
                max={PAD_SIZE_MAX}
                step={5}
                className="w-14 sm:w-28"
              />
              <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground shrink-0" />
              <span className="text-[10px] text-muted-foreground w-7 text-right tabular-nums hidden sm:inline">{padSize}%</span>
            </div>
            )}

            {/* Repertório - hidden in edit mode or when no song selected */}
            {!editMode && currentSongId && (
            <div data-tutorial="setlist">
            <SetlistManager
            songs={songs}
            currentSongId={currentSongId}
            onSaveSong={handleSaveSong}
            onLoadSong={handleLoadSong}
            onDeleteSong={handleDeleteSong}
            onReorder={reorderSetlists}
            setlists={setlists}
            activeSetlistId={currentSongId}
            onOpenMusicAI={() => setSpotifySheetOpen(true)} />
            </div>
            )}

            {/* Unified menu */}
            <div className="relative">
              <button
                onClick={() => setMobileMenuOpen((p) => !p)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors relative"
                title="Menu">
                <Menu className="h-4 w-4" />
              </button>
              {mobileMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => { setMobileMenuOpen(false); }} />
                  <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-lg shadow-xl py-1 min-w-[180px]" style={{ backgroundColor: 'hsl(var(--card))' }}>
                    <button onClick={() => { handleInstallClick(); setMobileMenuOpen(false); }} className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors">
                      <Download className="h-4 w-4 text-muted-foreground" /> Instalar App
                    </button>
                    {currentSongId && songs.length > 0 && (
                      <button onClick={() => {
                        setMobileMenuOpen(false);
                        if (!tryAccess('performance_mode')) return;
                        setPerformanceModeOpen(true);
                      }} className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors">
                        <MonitorPlay className="h-4 w-4 text-muted-foreground" /> Modo Performance
                      </button>
                    )}
                    <button onClick={() => { setEditMode(p => !p); setMobileMenuOpen(false); }} className={`flex items-center gap-2 w-full px-3 py-2.5 text-sm transition-colors ${editMode ? 'text-primary font-medium bg-primary/10' : 'text-foreground hover:bg-muted'}`}>
                      <Settings2 className="h-4 w-4" /> {editMode ? 'Sair do modo edição' : 'Modo Edição'}
                    </button>
                    <button
                      className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        if (!tryAccess('spotify_ai')) return;
                        setTimeout(() => setSpotifySheetOpen(true), 150);
                      }}
                    >
                      <Sparkles className="h-4 w-4 text-muted-foreground" />
                      Music AI
                    </button>
                    <button onClick={() => { setSettingsTab(undefined); setSettingsOpen(true); setMobileMenuOpen(false); }} className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors">
                      <Sliders className="h-4 w-4 text-muted-foreground" /> Configurações
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

            <TutorialGuide externalTrigger onStartRef={(fn) => { startTutorialRef.current = fn; }} onClose={() => { setSettingsTab('guide'); setSettingsOpen(true); }} />
          </div>
        </header>
      ) : (
        /* Focus mode header: only repertoire */
        <header className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {currentSongName && <span className="text-xs font-medium text-primary truncate max-w-[200px]">♪ {currentSongName}</span>}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {/* Pad size controls in focus mode */}
            {currentSongId && (
              <div className="flex items-center gap-1 mr-1 border border-border rounded-md px-2 py-1" data-tutorial="pad-size">
                <Minus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <Slider
                  value={[padSize]}
                  onValueChange={([v]) => handlePadSizeChange(v)}
                  min={PAD_SIZE_MIN}
                  max={PAD_SIZE_MAX}
                  step={5}
                  className="w-20 sm:w-28"
                />
                <Plus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </div>
            )}
            {currentSongId && (
              <div data-tutorial="setlist">
                <SetlistManager
                  songs={songs}
                  currentSongId={currentSongId}
                  onSaveSong={handleSaveSong}
                  onLoadSong={handleLoadSong}
                  onDeleteSong={handleDeleteSong}
                  onReorder={reorderSetlists}
                  setlists={setlists}
                  activeSetlistId={currentSongId}
                  onOpenMusicAI={() => setSpotifySheetOpen(true)} />
              </div>
            )}
          </div>
        </header>
      )}

      {/* Song selection banner - shown when no song is active */}
      {!focusMode && !currentSongId && (
        <div className="px-3 py-2.5 bg-primary/10 border-b border-primary/20 flex items-center justify-center gap-2">
          <Music className="h-4 w-4 text-primary shrink-0" />
          <span className="text-xs font-medium text-primary">
            {songs.length === 0 ? 'Crie uma música para começar' : 'Selecione uma música do repertório'}
          </span>
          {songs.length === 0 ? (
            <Button
              size="sm"
              variant="default"
              className="h-7 text-xs gap-1 ml-1"
              onClick={() => setOpenSetlistFromBanner(true)}
            >
              <Plus className="h-3 w-3" />
              Criar
            </Button>
          ) : (
            <div className="ml-1">
              <SetlistManager
                songs={songs}
                currentSongId={currentSongId}
                onSaveSong={handleSaveSong}
                onLoadSong={handleLoadSong}
                onDeleteSong={handleDeleteSong}
                onReorder={reorderSetlists}
                setlists={setlists}
                activeSetlistId={currentSongId}
                onOpenMusicAI={() => setSpotifySheetOpen(true)}
              />
            </div>
          )}
        </div>
      )}
      {/* Hidden SetlistManager to open from banner when songs.length === 0 */}
      {!currentSongId && songs.length === 0 && (
        <div className="hidden">
          <SetlistManager
            songs={songs}
            currentSongId={currentSongId}
            onSaveSong={handleSaveSong}
            onLoadSong={handleLoadSong}
            onDeleteSong={handleDeleteSong}
            onReorder={reorderSetlists}
            setlists={setlists}
            activeSetlistId={currentSongId}
            onOpenMusicAI={() => setSpotifySheetOpen(true)}
            forceOpen={openSetlistFromBanner}
            onForceOpenChange={() => setOpenSetlistFromBanner(false)}
          />
        </div>
      )}

      {/* Info bar - hidden in focus mode */}
      {!focusMode && currentSongId &&
      <div className="px-3 py-1 text-[10px] text-muted-foreground text-center border-b border-border/50 hidden sm:block">Segure um pad para ajustar volume e importar som.
      </div>
      }
      {/* Focus mode exit button - fixed above continuous pads */}

      {/* Main content area - side by side on lg+ */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
      {/* Pad Grid + Continuous Pads - swipeable in landscape mobile */}
      <main className="flex-1 flex flex-col overflow-hidden min-h-0 lg:min-h-0">
        <LandscapeSwipePanels
          focusMode={focusMode}
          bpm={bpm}
          onBpmChange={setBpm}
          timeSignature={timeSignature}
          onTimeSignatureChange={setTimeSignature}
          metronomeIsPlaying={metronomeIsPlaying}
          onTogglePlay={() => setMetronomeIsPlaying((prev) => !prev)}
          spotifyKey={spotifyKey}
          onKeyChange={setSpotifyKey}
          metronomePan={metronomePan}
          onMetronomePanChange={handleMetronomePanChange}
          metronomePanDisabled={audioSettings.metronomeStereo === 'mono'}
          spotifyTrackName={spotifyTrackName}
          padGrid={
            <div data-tutorial="pad-grid" className="w-full h-full flex items-center justify-center min-w-0 min-h-0 overflow-hidden">
              <PadGrid
                isMasterTier={tier === 'master'}
                tier={tier}
                pads={defaultPads}
                padVolumes={padVolumes}
                activeLoops={activeLoops}
                customSounds={customSounds}
                padSize={padSizeToTextSize(isTablet ? Math.max(padSize, 90) : padSize)}
                padScale={isTablet ? Math.max(padSize, 90) : padSize}
                padEffects={padEffects}
                bpm={bpm}
                padPans={padPans}
                onToggleLoop={toggleLoop}
                onImportSound={handleImportSound}
                onImportStoreSound={handleImportStoreSound}
                onRemoveCustomSound={handleRemoveCustomSound}
                onPadVolumeChange={handlePadVolumeChange}
                onEffectsChange={handleEffectsChange}
                onPadPanChange={handlePadPanChange}
                padNames={padNames}
                onRenamePad={handleRenamePad}
                padColors={padColors}
                onPadColorChange={handlePadColorChange}
                editMode={editMode}
                panDisabled={audioSettings.padsStereo === 'mono'}
                disabled={!currentSongId}
                focusMode={focusMode}
                onResetPad={handleResetPad}
                onResetAllPads={handleResetAllPads}
                onGateBlocked={(gateKey) => {
                  const result = canAccess(gateKey);
                  if (!result.allowed && result.gate) {
                    setUpgradeGate({
                      gateKey: result.gate.gate_key,
                      gateLabel: result.gate.gate_label,
                      requiredTier: result.gate.required_tier,
                      description: result.gate.description,
                    });
                  }
                }}
              />
            </div>
          }
          ambientPads={
            <div data-tutorial="ambient-pads" className="w-full flex flex-col items-center gap-1">
              {/* Focus mode button — only on mobile portrait */}
              {!isTablet && !isDesktop && !isLandscape && currentSongId && !editMode && (
                <button
                  onClick={toggleFocusMode}
                  className="flex items-center gap-1 px-3 py-1 text-xs text-muted-foreground hover:text-foreground bg-card/80 backdrop-blur border border-border rounded-full transition-colors"
                  title={focusMode ? 'Sair do modo foco' : 'Modo foco'}
                  data-tutorial="focus-mode"
                >
                  {focusMode ? <Minimize className="h-3 w-3" /> : <Maximize className="h-3 w-3" />}
                  {focusMode ? 'Sair' : 'Foco'}
                </button>
              )}
              <AmbientPads panDisabled={audioSettings.ambientStereo === 'mono'} />
            </div>
          }
          mixer={
            !focusMode ? (
              <div data-tutorial="volume-master" className="flex flex-col gap-1">
                {/* Fader page buttons 1 / 2 */}
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-muted-foreground mr-auto">Mix</span>
                  {([0, 1, 2] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setFaderPage(p)}
                      className={`w-5 h-5 rounded text-[9px] font-bold transition-colors flex items-center justify-center ${
                        faderPage === p
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {p + 1}
                    </button>
                  ))}
                </div>
                {showMixerLocked ? (
                  <button
                    onClick={openMixerGate}
                    className="w-full flex flex-col items-center justify-center gap-1.5 py-4 bg-card rounded-lg border border-border/50 text-muted-foreground hover:bg-muted/40 transition-colors"
                  >
                    <Lock className="h-4 w-4" />
                    <span className="text-[10px]">Mixer — Plano Pro</span>
                  </button>
                ) : (
                <MixerStrip
                  controlledPage={faderPage}
                  onControlledPageChange={setFaderPage}
                  channels={[
                  { id: 'metronome', label: 'Metrônomo', shortLabel: 'Metrônomo', volume: metronomeVol, onChange: handleMetronomeVolChange },
                  { id: 'ambient', label: 'Continuous', shortLabel: 'PAD', volume: ambientVol, onChange: (v) => { setAmbientVol(v); setAmbientVolume(v); } },
                  ...defaultPads.slice(0, 9).map((pad) => ({
                    id: pad.id,
                    label: padNames[pad.id] || pad.name,
                    shortLabel: padNames[pad.id] || pad.name,
                    volume: padVolumes[pad.id] ?? 0.7,
                    onChange: (v: number) => handlePadVolumeChange(pad.id, v),
                  })),
                  { id: 'master', label: 'Master', shortLabel: 'Master', volume: masterVolume, onChange: setMasterVol },
                ]} />
                )}
              </div>
            ) : undefined
          }

          metronome={
            <div className="bg-card rounded-lg border border-border overflow-hidden" data-tutorial="metronome">
              <div className="flex items-center justify-between w-full px-3 py-1.5 hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => setMetronomeOpen((prev) => !prev)}>
                <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                  {spotifyTrackName && (
                    <span className="text-xs font-medium text-primary whitespace-nowrap animate-marquee">
                      ♪ {spotifyTrackName}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    className="text-sm font-bold text-foreground tabular-nums hover:bg-muted rounded px-1 transition-colors"
                    onClick={(e) => { e.stopPropagation(); }}
                    title="Editar BPM no metrônomo abaixo"
                  >{bpm}</button>
                  <span className="text-[10px] text-muted-foreground">BPM</span>
                  {spotifyKey && (
                    <span className="text-[10px] font-semibold text-primary">· {spotifyKey}</span>
                  )}
                  <span className="text-[10px] text-muted-foreground">· {timeSignature}</span>
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
                  <ChevronUp className="h-4 w-4 text-muted-foreground" /> :
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
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
                  onTogglePlay={() => setMetronomeIsPlaying((prev) => !prev)}
                  songKey={spotifyKey}
                  onKeyChange={setSpotifyKey} />
                <div data-tutorial="pan-metronome">
                <PanControl
                  label="Pan Metrônomo"
                  pan={metronomePan}
                  onPanChange={handleMetronomePanChange}
                  disabled={audioSettings.metronomeStereo === 'mono'} />
                </div>
              </div>
            </div>
          }
        />
      </main>

      {/* Footer - hidden in landscape since mixer/metronome are in side panel */}
      {!isLandscape && (
      <footer className={`shrink-0 lg:w-[320px] xl:w-[360px] lg:border-l lg:border-t-0 border-t border-border bg-card/50 backdrop-blur lg:overflow-y-auto ${focusMode ? 'p-1 max-h-[20vh] md:max-h-none lg:max-h-none focus-footer' : 'p-0 lg:p-3 md:max-h-none lg:max-h-none overflow-visible'}`} style={{ paddingBottom: isTablet || typeof window !== 'undefined' && window.innerWidth >= 1024 ? 'env(safe-area-inset-bottom, 0px)' : undefined }}>
        {/* Desktop: stacked layout */}
        <div className="hidden lg:block max-w-none mx-auto space-y-1.5">
          {/* Focus mode: show exit button + song name */}
          {focusMode &&
          <div className="flex items-center justify-center gap-2 py-1">
              {currentSongName &&
            <span className="text-xs font-medium text-primary truncate max-w-[200px]">♪ {currentSongName}</span>
            }
              <button
              onClick={toggleFocusMode}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground bg-muted/60 backdrop-blur-sm rounded-full transition-colors"
              title="Sair do modo foco">
                <Minimize className="h-3 w-3" />
                Sair
              </button>
            </div>
          }

          {/* Mixer Strip */}
          {!focusMode &&
          <div data-tutorial="volume-master">
            {/* Fader page buttons */}
            <div className="flex items-center gap-1 mb-1">
              {([0, 1, 2] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setFaderPage(p)}
                  className={`w-5 h-5 rounded text-[9px] font-bold transition-colors flex items-center justify-center ${
                    faderPage === p
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {p + 1}
                </button>
              ))}
            </div>
            {showMixerLocked ? (
              <button
                onClick={openMixerGate}
                className="w-full flex flex-col items-center justify-center gap-1.5 py-4 bg-card rounded-lg border border-border/50 text-muted-foreground hover:bg-muted/40 transition-colors"
              >
                <Lock className="h-4 w-4" />
                <span className="text-[10px]">Mixer — Plano Pro</span>
              </button>
            ) : (
            <MixerStrip
              controlledPage={faderPage}
              onControlledPageChange={setFaderPage}
              channels={[
              { id: 'metronome', label: 'Metrônomo', shortLabel: 'Metrônomo', volume: metronomeVol, onChange: handleMetronomeVolChange },
              { id: 'ambient', label: 'Continuous', shortLabel: 'PAD', volume: ambientVol, onChange: (v) => { setAmbientVol(v); setAmbientVolume(v); } },
              ...defaultPads.slice(0, 9).map((pad) => ({
                id: pad.id,
                label: padNames[pad.id] || pad.name,
                shortLabel: padNames[pad.id] || pad.name,
                volume: padVolumes[pad.id] ?? 0.7,
                onChange: (v: number) => handlePadVolumeChange(pad.id, v),
              })),
              { id: 'master', label: 'Master', shortLabel: 'Master', volume: masterVolume, onChange: setMasterVol },
            ]} />
            )}
          </div>
          }

          {/* Metronome — below faders, always expanded */}
          <div className="bg-card rounded-lg border border-border overflow-hidden" data-tutorial="metronome">
            {spotifyTrackName && (
              <div className="px-3 py-1 border-b border-border/50">
                <span className="text-xs font-medium text-primary whitespace-nowrap animate-marquee">♪ {spotifyTrackName}</span>
              </div>
            )}
            <Metronome bpm={bpm} onBpmChange={setBpm} timeSignature={timeSignature} onTimeSignatureChange={setTimeSignature} isPlaying={metronomeIsPlaying} onTogglePlay={() => setMetronomeIsPlaying((prev) => !prev)} songKey={spotifyKey} onKeyChange={setSpotifyKey} />
            <div data-tutorial="pan-metronome">
              <PanControl label="Pan Metrônomo" pan={metronomePan} onPanChange={handleMetronomePanChange} disabled={audioSettings.metronomeStereo === 'mono'} />
            </div>
          </div>

          {/* Continuous Pads: now rendered beside the PadGrid in the main area (padGrid prop) */}
        </div>

        {/* Tablet: Faders → Metrônomo → Continuous Pads (sem botões Mix/Met) */}
        {isTablet && !focusMode && (
          <div className="hidden md:block lg:hidden p-1.5 space-y-1.5 overflow-y-auto">
            {/* Faders with page buttons */}
            <div className="w-full" data-tutorial="volume-master">
              <div className="flex items-center gap-1 mb-1">
                {([0, 1, 2] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setFaderPage(p)}
                    className={`w-5 h-5 rounded text-[9px] font-bold transition-colors flex items-center justify-center ${
                      faderPage === p
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {p + 1}
                  </button>
                ))}
              </div>
              {showMixerLocked ? (
                <button
                  onClick={openMixerGate}
                  className="w-full flex flex-col items-center justify-center gap-1.5 py-4 bg-card rounded-lg border border-border/50 text-muted-foreground hover:bg-muted/40 transition-colors"
                >
                  <Lock className="h-4 w-4" />
                  <span className="text-[10px]">Mixer — Plano Pro</span>
                </button>
              ) : (
              <MixerStrip
                controlledPage={faderPage}
                onControlledPageChange={setFaderPage}
                compactFaderHeight={80}
                channels={[
                  { id: 'metronome', label: 'Metrônomo', shortLabel: 'MET', volume: metronomeVol, onChange: handleMetronomeVolChange },
                  { id: 'ambient', label: 'Continuous', shortLabel: 'PAD', volume: ambientVol, onChange: (v) => { setAmbientVol(v); setAmbientVolume(v); } },
                  ...defaultPads.slice(0, 9).map((pad) => ({
                    id: pad.id,
                    label: padNames[pad.id] || pad.name,
                    shortLabel: (padNames[pad.id] || pad.name).slice(0, 3),
                    volume: padVolumes[pad.id] ?? 0.7,
                    onChange: (v: number) => handlePadVolumeChange(pad.id, v),
                  })),
                  { id: 'master', label: 'Master', shortLabel: 'MST', volume: masterVolume, onChange: setMasterVol },
                ]}
              />
              )}
            </div>
            {/* Metronome — below faders */}
            <div className="bg-card rounded-lg border border-border overflow-hidden" data-tutorial="metronome">
              <div className="flex items-center justify-between px-3 py-1 border-b border-border/50">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-foreground tabular-nums">{bpm}</span>
                  <span className="text-[10px] text-muted-foreground">BPM</span>
                  {spotifyKey && <span className="text-[10px] font-semibold text-primary">· {spotifyKey}</span>}
                  <span className="text-[10px] text-muted-foreground">· {timeSignature}</span>
                </div>
                {spotifyTrackName && (
                  <span className="text-xs font-medium text-primary truncate max-w-[150px]">♪ {spotifyTrackName}</span>
                )}
              </div>
              <Metronome bpm={bpm} onBpmChange={setBpm} timeSignature={timeSignature} onTimeSignatureChange={setTimeSignature} isPlaying={metronomeIsPlaying} onTogglePlay={() => setMetronomeIsPlaying((prev) => !prev)} songKey={spotifyKey} onKeyChange={setSpotifyKey} />
              <div data-tutorial="pan-metronome">
                <PanControl label="Pan Metrônomo" pan={metronomePan} onPanChange={handleMetronomePanChange} disabled={audioSettings.metronomeStereo === 'mono'} />
              </div>
            </div>
            {/* Continuous Pads: now rendered beside the PadGrid in the main area */}
          </div>
        )}
        {isTablet && focusMode && (
          <div className="hidden md:flex lg:hidden flex-col px-3 py-1.5 gap-1">
            {/* Hidden metronome to keep audio alive */}
            <div className="hidden">
              <Metronome bpm={bpm} onBpmChange={setBpm} timeSignature={timeSignature} onTimeSignatureChange={setTimeSignature} isPlaying={metronomeIsPlaying} onTogglePlay={() => setMetronomeIsPlaying((prev) => !prev)} songKey={spotifyKey} onKeyChange={setSpotifyKey} />
            </div>
            <div className="flex items-center justify-center gap-3">
              <span className="text-sm font-bold text-foreground tabular-nums">{bpm}</span>
              <span className="text-[10px] text-muted-foreground">BPM</span>
              <span className="text-[10px] text-muted-foreground">· {timeSignature}</span>
              <button
                type="button"
                onClick={() => setMetronomeIsPlaying((prev) => !prev)}
                className={`p-1.5 rounded-md transition-colors ${metronomeIsPlaying ? 'text-destructive hover:bg-destructive/10' : 'text-primary hover:bg-primary/10'}`}
              >
                {metronomeIsPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
            </div>
            {/* Continuous Pads: now rendered beside the PadGrid in the main area */}
          </div>
        )}

        {/* Mobile (non-tablet): tab buttons + page content */}
        <div className={`${isTablet ? 'hidden' : 'lg:hidden'} h-full relative flex flex-col`}>

          {/* Metronome always mounted (hidden) to keep audio alive in focus mode */}
          <div className="hidden">
            <Metronome bpm={bpm} onBpmChange={setBpm} timeSignature={timeSignature} onTimeSignatureChange={setTimeSignature} isPlaying={metronomeIsPlaying} onTogglePlay={() => setMetronomeIsPlaying((prev) => !prev)} songKey={spotifyKey} onKeyChange={setSpotifyKey} />
          </div>

          {focusMode ? (
            /* Focus mode: minimized bar with BPM + key + play/pause only */
            <div className="flex items-center justify-center gap-3 px-3 py-1.5">
              <span className="text-sm font-bold text-foreground tabular-nums">{bpm}</span>
              <span className="text-[10px] text-muted-foreground">BPM</span>
              {spotifyKey && <span className="text-[10px] font-semibold text-primary">· {spotifyKey}</span>}
              <span className="text-[10px] text-muted-foreground">· {timeSignature}</span>
              <button
                type="button"
                onClick={() => setMetronomeIsPlaying((prev) => !prev)}
                className={`p-1.5 rounded-md transition-colors ${metronomeIsPlaying ? 'text-destructive hover:bg-destructive/10' : 'text-primary hover:bg-primary/10'}`}
                title={metronomeIsPlaying ? 'Parar metrônomo' : 'Iniciar metrônomo'}
              >
                {metronomeIsPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
            </div>
          ) : (
            <>
              {/* Tab bar: Mix | Met   |   1 | 2 (fader pages, only on Mix) */}
              <div className="flex items-center gap-1 px-2 pt-1 pb-0 shrink-0">
                {/* Mix / Met tabs */}
                {(['Mix', 'Met', 'Tools'] as const).map((label, i) => (
                  <button
                    key={i}
                    onClick={() => setFooterPage(i)}
                    className={`relative px-2 h-5 rounded text-[9px] font-bold transition-colors flex items-center gap-1 ${
                      footerPage === i
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {label}
                    {label === 'Met' && metronomeIsPlaying && (
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" style={{ backgroundColor: 'hsl(142 71% 45%)' }} />
                    )}
                  </button>
                ))}

                {/* Spacer */}
                <div className="flex-1" />

                {/* Fader page buttons — only visible when Mix tab is active */}
                {footerPage === 0 && ([0, 1, 2] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setFaderPage(p)}
                    className={`relative w-5 h-5 rounded text-[9px] font-bold transition-colors flex items-center justify-center ${
                      faderPage === p
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {p + 1}
                  </button>
                ))}
              </div>

              {/* Page content — Metronome always mounted to keep audio alive */}
              <div className="flex-1 overflow-visible">

                {/* === MIX PAGE === */}
                <div className={footerPage === 0 ? 'h-full flex flex-col' : 'hidden'}>
                  {/* Faders */}
                  <div className="flex items-end pb-0 px-1.5 pt-0.5">
                    <div className="w-full" data-tutorial="volume-master">
                      {showMixerLocked ? (
                        <button
                          onClick={openMixerGate}
                          className="w-full flex flex-col items-center justify-center gap-1.5 py-4 bg-card rounded-lg border border-border/50 text-muted-foreground hover:bg-muted/40 transition-colors"
                        >
                          <Lock className="h-4 w-4" />
                          <span className="text-[10px]">Mixer — Plano Pro</span>
                        </button>
                      ) : (
                      <MixerStrip
                        controlledPage={faderPage}
                        onControlledPageChange={setFaderPage}
                        channels={[
                        { id: 'metronome', label: 'Metrônomo', shortLabel: 'Metrônomo', volume: metronomeVol, onChange: handleMetronomeVolChange },
                        { id: 'ambient', label: 'Continuous', shortLabel: 'PAD', volume: ambientVol, onChange: (v) => { setAmbientVol(v); setAmbientVolume(v); } },
                        ...defaultPads.slice(0, 9).map((pad) => ({
                          id: pad.id,
                          label: padNames[pad.id] || pad.name,
                          shortLabel: padNames[pad.id] || pad.name,
                          volume: padVolumes[pad.id] ?? 0.7,
                          onChange: (v: number) => handlePadVolumeChange(pad.id, v),
                        })),
                        { id: 'master', label: 'Master', shortLabel: 'Master', volume: masterVolume, onChange: setMasterVol },
                      ]} />
                      )}
                    </div>
                  </div>
                </div>

                {/* === MET PAGE === always mounted but hidden when on Mix */}
                <div className={footerPage === 1 ? 'h-full flex items-center p-1.5' : 'hidden'}>
                  <div className="w-full bg-card rounded-lg border border-border overflow-hidden" data-tutorial="metronome">
                    <div className="flex items-center justify-between w-full px-3 py-1.5 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setMetronomeOpen((prev) => !prev)}>
                      <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                        {spotifyTrackName && <span className="text-xs font-medium text-primary whitespace-nowrap animate-marquee">♪ {spotifyTrackName}</span>}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {editingHeaderBpm ? (
                          <input
                            type="number"
                            min={40}
                            max={240}
                            value={headerBpmValue}
                            onChange={(e) => setHeaderBpmValue(e.target.value)}
                            onBlur={() => { setEditingHeaderBpm(false); const v = parseInt(headerBpmValue); if (!isNaN(v) && v >= 40 && v <= 240) setBpm(v); }}
                            onKeyDown={(e) => { if (e.key === 'Enter') { setEditingHeaderBpm(false); const v = parseInt(headerBpmValue); if (!isNaN(v) && v >= 40 && v <= 240) setBpm(v); } if (e.key === 'Escape') setEditingHeaderBpm(false); }}
                            className="w-12 h-6 text-center text-xs font-bold bg-muted border border-border rounded px-1 text-foreground"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <button className="text-sm font-bold text-foreground tabular-nums hover:bg-muted rounded px-1 transition-colors" onClick={(e) => { e.stopPropagation(); setEditingHeaderBpm(true); setHeaderBpmValue(String(bpm)); }} title="Editar BPM">{bpm}</button>
                        )}
                        <span className="text-[10px] text-muted-foreground">BPM</span>
                        {spotifyKey && <span className="text-[10px] font-semibold text-primary">· {spotifyKey}</span>}
                        <span className="text-[10px] text-muted-foreground">· {timeSignature}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {!metronomeOpen &&
                        <button type="button" onClick={(e) => {e.stopPropagation();setMetronomeIsPlaying((prev) => !prev);}} className={`p-1.5 rounded-md transition-colors ${metronomeIsPlaying ? 'text-destructive hover:bg-destructive/10' : 'text-primary hover:bg-primary/10'}`} title={metronomeIsPlaying ? 'Parar metrônomo' : 'Iniciar metrônomo'}>
                            {metronomeIsPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </button>
                        }
                        {metronomeOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </div>
                    <div className={metronomeOpen ? 'px-0 pb-0' : 'hidden'}>
                      <Metronome bpm={bpm} onBpmChange={setBpm} timeSignature={timeSignature} onTimeSignatureChange={setTimeSignature} isPlaying={metronomeIsPlaying} onTogglePlay={() => setMetronomeIsPlaying((prev) => !prev)} songKey={spotifyKey} onKeyChange={setSpotifyKey} />
                      <div data-tutorial="pan-metronome">
                      <PanControl label="Pan Metrônomo" pan={metronomePan} onPanChange={handleMetronomePanChange} disabled={audioSettings.metronomeStereo === 'mono'} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* === TOOLS PAGE === */}
                <div className={footerPage === 2 ? 'h-full flex items-center p-1.5' : 'hidden'}>
                  <div className="w-full bg-card rounded-lg border border-border overflow-hidden">
                    <ToolsPanel bpm={bpm} onBpmChange={setBpm} />
                  </div>
                </div>

              </div>

              {/* Persistent metronome mini-bar — always visible */}
              <div className="flex items-center justify-between gap-2 px-3 py-1 shrink-0 border-t border-border/40 bg-card/80 backdrop-blur-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-bold text-foreground tabular-nums">{bpm}</span>
                  <span className="text-[9px] text-muted-foreground uppercase tracking-wide">BPM</span>
                  {spotifyKey && <span className="text-[10px] font-semibold text-primary">· {spotifyKey}</span>}
                  <span className="text-[9px] text-muted-foreground">· {timeSignature}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMetronomeIsPlaying((prev) => !prev)}
                  className={`p-1.5 rounded-full transition-all ${metronomeIsPlaying ? 'bg-destructive/15 text-destructive' : 'bg-primary/15 text-primary'}`}
                  title={metronomeIsPlaying ? 'Parar metrônomo' : 'Iniciar metrônomo'}
                >
                  {metronomeIsPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                </button>
              </div>

            </>
          )}
        </div>

      </footer>
      )}
      </div>

      {/* Safe-area shortcut bar — OUTSIDE overflow-hidden container so it's never clipped */}
      {!isLandscape && (
        <div
          className="bg-card/80 backdrop-blur-sm border-t border-border/30 shrink-0 lg:hidden"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="flex items-center justify-around" style={{ paddingTop: focusMode ? '0px' : '4px' }}>
          {!focusMode && (
            <>
              <button
                onClick={() => { setFooterPage(1); }}
                className="flex flex-col items-center gap-0.5 px-3 py-1 text-muted-foreground hover:text-primary transition-colors"
                title="Metrônomo"
              >
                <Activity className="h-4 w-4" />
                <span className="text-[8px] font-medium">Metrônomo</span>
              </button>
              <button
                onClick={() => { setFooterPage(2); }}
                className="flex flex-col items-center gap-0.5 px-3 py-1 text-muted-foreground hover:text-primary transition-colors"
                title="Afinador"
              >
                <Drum className="h-4 w-4" />
                <span className="text-[8px] font-medium">Afinador</span>
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="flex flex-col items-center gap-0.5 px-3 py-1 text-muted-foreground hover:text-primary transition-colors"
                title="Loja"
              >
                <Store className="h-4 w-4" />
                <span className="text-[8px] font-medium">Loja</span>
              </button>
            </>
          )}
          </div>
        </div>
      )}
      {/* Save to repertoire prompt */}
      {showSavePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-lg shadow-lg p-5 space-y-4 w-full max-w-sm animate-fade-in-up" style={{ transform: 'none' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListMusic className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Salvar no Repertório?</span>
              </div>
              <button onClick={() => setShowSavePrompt(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <input
              type="text"
              value={spotifySongName}
              onChange={(e) => setSpotifySongName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md bg-background border border-input text-foreground"
              placeholder="Nome da música..."
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 gap-1.5"
                onClick={() => {
                  if (spotifySongName.trim()) {
                    handleSaveSong(spotifySongName.trim());
                    setShowSavePrompt(false);
                    toast.success('Música salva no repertório!');
                  }
                }}
                disabled={!spotifySongName.trim()}
              >
                <Check className="h-3.5 w-3.5" />
                Salvar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowSavePrompt(false)}
              >
                Depois
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Music AI Search Sheet (outside menu to persist) */}
      <MusicAISearch
        onApplyConfig={handleApplySpotifyConfig}
        onAddToSetlist={handleMusicAIAddToSetlist}
        locked={!canAccess('spotify_ai').allowed}
        externalOpen={spotifySheetOpen}
        onExternalOpenChange={setSpotifySheetOpen}
      />

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onAudioSettingsChange={handleAudioSettingsChange}
        onStartTutorial={(sectionId) => { if (startTutorialRef.current) startTutorialRef.current(sectionId); }}
        initialTab={settingsTab}
      />

      {/* Feature Gate Upgrade Modal */}
      <UpgradeGateModal
        payload={upgradeGate}
        onClose={() => setUpgradeGate(null)}
        onNavigateToPricing={() => {
          if (currentSongId) {
            sessionStorage.setItem('restore-song-id', currentSongId);
          }
          navigate('/pricing');
        }}
      />
    </div>);

};

export default Index;