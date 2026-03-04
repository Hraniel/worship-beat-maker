// Unified clock engine: single timing source for loops AND metronome
// Custom-imported audio loops use AudioBufferSourceNode.loop = true (OS-level, survives iOS bg)
// Synthesized pattern loops still use the timer-based scheduler (can't pre-render cross-context)

import { getAudioContext, playSound, playMetronomeClick, getPadPanner, hasCustomBuffer, getCustomBuffer, getMasterGain } from './audio-engine';
import { startWorkerTimer, stopWorkerTimer } from './timer-worker';
import type { PadSound } from './sounds';

// Lazy import to avoid circular deps
let emitPadHit: ((id: string) => void) | null = null;
function getEmitter() {
  if (!emitPadHit) {
    import('../components/MixerStrip').then(m => { emitPadHit = m.emitPadHit; });
  }
  return emitPadHit;
}

interface ActiveLoop {
  pad: PadSound;
  volume: number;
  startSubdivision: number;
}

// ── Native loop playback for custom-imported audio ──
const nativeLoopSources = new Map<string, AudioBufferSourceNode>();
const nativeLoopGains = new Map<string, GainNode>();

// Loops queued to start on next beat 1 (when forceLoopBeat1 is enabled)
let pendingLoops: Map<string, ActiveLoop> = new Map();
let pendingActivateAtSub = 0;

let isRunning = false;
let activeLoops: Map<string, ActiveLoop> = new Map();
let currentSubdivision = 0;
let onSubdivisionCallback: ((sub: number) => void) | null = null;
let lastTickTime = 0;

const SCHEDULE_AHEAD_TIME = 0.1;
const SCHEDULER_INTERVAL = 25;

let nextTickAudioTime = 0;

let currentBpm = 120;
let beatsPerBar = 4;
let beatUnit = 4;

let syncEnabled = true;
let forceLoopBeat1 = false;
let metronomeAccentEnabled = true;

export function setSyncEnabled(enabled: boolean) {
  syncEnabled = enabled;
  localStorage.setItem('drum-pads-sync-enabled', String(enabled));
}
export function isSyncEnabled(): boolean { return syncEnabled; }

export function setForceLoopBeat1(enabled: boolean) {
  forceLoopBeat1 = enabled;
  localStorage.setItem('glory-force-loop-beat1', String(enabled));
}
export function isForceLoopBeat1(): boolean { return forceLoopBeat1; }

export function setMetronomeAccent(enabled: boolean) {
  metronomeAccentEnabled = enabled;
  localStorage.setItem('glory-metronome-accent', String(enabled));
}
export function isMetronomeAccent(): boolean { return metronomeAccentEnabled; }

export function setCountIn(_enabled: boolean) {}
export function isCountIn(): boolean { return false; }

// Load persisted settings
try {
  const syncStored = localStorage.getItem('drum-pads-sync-enabled');
  if (syncStored !== null) syncEnabled = syncStored === 'true';
  const b1 = localStorage.getItem('glory-force-loop-beat1');
  if (b1 !== null) forceLoopBeat1 = b1 === 'true';
  const acc = localStorage.getItem('glory-metronome-accent');
  if (acc !== null) metronomeAccentEnabled = acc === 'true';
} catch {}

function getSubdivisionsPerBar(): number {
  const subsPerBeat = beatUnit === 8 ? 2 : 4;
  return beatsPerBar * subsPerBeat;
}

function getSubsPerBeat(): number {
  return beatUnit === 8 ? 2 : 4;
}

// Metronome state
let metronomeEnabled = false;
let metronomeVolume = 0.3;
const metronomeBeatListeners = new Set<(beat: number) => void>();

export function setLoopBpm(bpm: number) {
  const oldBpm = currentBpm;
  currentBpm = bpm;
  if (isRunning) {
    stopEngine();
    startEngine();
  }
  // Adjust playbackRate of native loops to match new BPM
  if (oldBpm > 0 && bpm !== oldBpm) {
    for (const [padId, loop] of activeLoops) {
      const src = nativeLoopSources.get(padId);
      if (src) {
        const loopBpm = loop.pad.loopBpm || oldBpm;
        src.playbackRate.value = bpm / loopBpm;
      }
    }
  }
}

export function setLoopTimeSignature(ts: string) {
  const parts = ts.split('/');
  beatsPerBar = parseInt(parts[0]);
  beatUnit = parseInt(parts[1]) || 4;
  if (isRunning) {
    stopEngine();
    startEngine();
  }
}

export function setOnSubdivision(cb: ((sub: number) => void) | null) {
  onSubdivisionCallback = cb;
}

// --- Metronome integration ---

export function enableMetronome(volume: number = 0.3) {
  metronomeEnabled = true;
  metronomeVolume = volume;
  if (!isRunning) startEngine();
}

export function disableMetronome() {
  metronomeEnabled = false;
  if (isRunning && activeLoops.size === 0 && pendingLoops.size === 0) stopEngine();
}

export function setMetronomeVolume(vol: number) { metronomeVolume = vol; }
export function getMetronomeVolume() { return metronomeVolume; }

export function onMetronomeBeat(cb: ((beat: number) => void) | null) {
  if (!cb) return () => {};
  metronomeBeatListeners.add(cb);
  return () => { metronomeBeatListeners.delete(cb); };
}

export function isMetronomeActive() { return metronomeEnabled; }

// ── Native loop helpers (custom-imported audio only) ────────────────────────

function startNativeLoop(pad: PadSound, volume: number) {
  stopNativeLoop(pad.id);

  const buffer = getCustomBuffer(pad.id);
  if (!buffer) return; // Only for custom buffers

  const ctx = getAudioContext();
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.loopStart = 0;
  source.loopEnd = buffer.duration;

  const gainNode = ctx.createGain();
  gainNode.gain.value = volume;

  const panner = getPadPanner(pad.id);
  source.connect(gainNode);
  gainNode.connect(panner);

  source.start(0);

  nativeLoopSources.set(pad.id, source);
  nativeLoopGains.set(pad.id, gainNode);

  console.log(`[LoopEngine] Native loop started: ${pad.id} (duration=${buffer.duration.toFixed(2)}s)`);
}

function stopNativeLoop(padId: string) {
  const src = nativeLoopSources.get(padId);
  if (src) {
    try { src.stop(); } catch {}
    try { src.disconnect(); } catch {}
    nativeLoopSources.delete(padId);
  }
  const gain = nativeLoopGains.get(padId);
  if (gain) {
    try { gain.disconnect(); } catch {}
    nativeLoopGains.delete(padId);
  }
}

// Track active timer-based loop sources (for synthesized pattern loops)
const activeLoopSources = new Map<string, AudioBufferSourceNode>();

// --- Loop management ---

export function addLoop(pad: PadSound, volume: number) {
  const isCustom = hasCustomBuffer(pad.id);

  if (!isRunning) {
    activeLoops.set(pad.id, { pad, volume, startSubdivision: 0 });
    startEngine();
    if (isCustom) startNativeLoop(pad, volume);
  } else if (forceLoopBeat1) {
    const SUBS = getSubdivisionsPerBar();
    const nextBar = (Math.floor(currentSubdivision / SUBS) + 1) * SUBS;
    if (pendingLoops.size === 0 || nextBar > pendingActivateAtSub) {
      pendingActivateAtSub = nextBar;
    }
    pendingLoops.set(pad.id, { pad, volume, startSubdivision: nextBar });
  } else {
    activeLoops.set(pad.id, { pad, volume, startSubdivision: currentSubdivision + 1 });
    if (isCustom) startNativeLoop(pad, volume);
  }
}

export function removeLoop(padId: string) {
  activeLoops.delete(padId);
  pendingLoops.delete(padId);
  // Stop native loop (custom audio)
  stopNativeLoop(padId);
  // Stop timer-based source
  const src = activeLoopSources.get(padId);
  if (src) { try { src.stop(); } catch {} activeLoopSources.delete(padId); }
  if (isRunning && activeLoops.size === 0 && pendingLoops.size === 0 && !metronomeEnabled) {
    stopEngine();
  }
}

export function updateLoopVolume(padId: string, volume: number) {
  const loop = activeLoops.get(padId);
  if (loop) loop.volume = volume;
  const pending = pendingLoops.get(padId);
  if (pending) pending.volume = volume;
  // Update native loop gain in real-time
  const gainNode = nativeLoopGains.get(padId);
  if (gainNode) {
    gainNode.gain.setValueAtTime(volume, getAudioContext().currentTime);
  }
}

export function isLoopEngineRunning() { return isRunning; }
export function getCurrentBpm(): number { return currentBpm; }

export function getActiveLoopIds(): string[] {
  return [...activeLoops.keys(), ...pendingLoops.keys()];
}

// --- Schedule a single subdivision ---

function scheduleSubdivision(subdivision: number, audioTime: number) {
  const SUBS = getSubdivisionsPerBar();

  // Move pending loops to active on bar beat 1
  if (pendingLoops.size > 0 && subdivision >= pendingActivateAtSub && (subdivision % SUBS) === 0) {
    for (const [id, loop] of pendingLoops) {
      activeLoops.set(id, loop);
      if (hasCustomBuffer(loop.pad.id)) {
        startNativeLoop(loop.pad, loop.volume);
      }
    }
    pendingLoops.clear();
  }

  // Fire loop sounds for synthesized patterns (custom audio uses native looping)
  for (const [, loop] of activeLoops) {
    if (hasCustomBuffer(loop.pad.id)) {
      // Custom audio: native loop handles playback, just emit visual feedback
      const totalSubs = SUBS * (loop.pad.loopBars || 1);
      const loopPos = ((subdivision - loop.startSubdivision) % totalSubs + totalSubs) % totalSubs;
      if (loopPos === 0) {
        getEmitter()?.(loop.pad.id);
      }
      continue;
    }
    // Synthesized pattern loops — schedule via timer as before
    if (!loop.pad.loopSteps) continue;
    const totalSubs = SUBS * (loop.pad.loopBars || 1);
    const loopPos = ((subdivision - loop.startSubdivision) % totalSubs + totalSubs) % totalSubs;
    for (const [sub, soundId] of loop.pad.loopSteps) {
      if (sub === loopPos) {
        const panner = getPadPanner(loop.pad.id);
        playSound(soundId, loop.volume, panner, audioTime);
        getEmitter()?.(loop.pad.id);
      }
    }
  }

  // Metronome click
  if (metronomeEnabled) {
    const subsPerBeat = getSubsPerBeat();
    const barPos = subdivision % SUBS;
    if (barPos % subsPerBeat === 0) {
      const beatIndex = barPos / subsPerBeat;
      playMetronomeClick(metronomeAccentEnabled && beatIndex === 0, metronomeVolume, audioTime);
      getEmitter()?.('metronome');
      for (const listener of metronomeBeatListeners) listener(beatIndex);
    }
  }

  onSubdivisionCallback?.(subdivision % SUBS);
}

// --- Lookahead scheduler ---

function schedulerTick() {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});

  const intervalSec = 60 / currentBpm / 4;
  const SUBS = getSubdivisionsPerBar();

  // Gap recovery
  const gap = ctx.currentTime - nextTickAudioTime;
  if (gap > 0.5) {
    const missedSubs = Math.floor(gap / intervalSec);
    currentSubdivision = (currentSubdivision + missedSubs) % (SUBS * 256);
    nextTickAudioTime = ctx.currentTime + 0.005;
    console.log(`[LoopEngine] Gap recovery: skipped ${missedSubs} subs (${gap.toFixed(2)}s behind)`);
  }

  let scheduled = 0;
  while (nextTickAudioTime < ctx.currentTime + SCHEDULE_AHEAD_TIME && scheduled < 8) {
    scheduleSubdivision(currentSubdivision, nextTickAudioTime);
    lastTickTime = performance.now();
    nextTickAudioTime += intervalSec;
    currentSubdivision = currentSubdivision + 1;
    if (currentSubdivision >= SUBS * 256) currentSubdivision = 0;
    scheduled++;
  }
}

function startEngine() {
  if (isRunning) return;
  isRunning = true;
  currentSubdivision = 0;
  const ctx = getAudioContext();
  nextTickAudioTime = ctx.currentTime + 0.005;
  startWorkerTimer(schedulerTick, SCHEDULER_INTERVAL);
  schedulerTick();
}

function stopEngine() {
  isRunning = false;
  stopWorkerTimer();
  currentSubdivision = 0;
  onSubdivisionCallback?.(0);
}

export function resyncEngine() {
  if (!isRunning) return;
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  nextTickAudioTime = ctx.currentTime + 0.005;
  stopWorkerTimer();
  startWorkerTimer(schedulerTick, SCHEDULER_INTERVAL);
  schedulerTick();
  console.log('[LoopEngine] Resynced after visibility change');
}

export function stopAllLoops() {
  for (const [id] of activeLoops) stopNativeLoop(id);
  for (const [id] of pendingLoops) stopNativeLoop(id);
  activeLoops.clear();
  pendingLoops.clear();
  if (!metronomeEnabled) stopEngine();
}

export function getQuantizeDelay(): number {
  if (!isRunning || !syncEnabled) return 0;
  const subdivisionMs = (60 / currentBpm / 4) * 1000;
  const elapsed = performance.now() - lastTickTime;
  const remaining = subdivisionMs - elapsed;
  if (elapsed < subdivisionMs * 0.4) return 0;
  return Math.max(0, remaining / 1000);
}
