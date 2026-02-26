// Unified clock engine: single timing source for loops AND metronome
// Both sync to the same 16th-note subdivision grid
// Uses a "lookahead scheduler" pattern (Chris Wilson's "A Tale of Two Clocks")
// to pre-schedule audio events via the Web Audio clock, making timing resilient
// to main-thread jank caused by external programs (e.g. MainStage, DAWs).

import { getAudioContext, playSound, playMetronomeClick, getPadPanner, hasCustomBuffer } from './audio-engine';
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
  /** Absolute subdivision where this loop's phase starts (its step 0 / kick) */
  startSubdivision: number;
}

// Loops queued to start on next beat 1 (when forceLoopBeat1 is enabled)
let pendingLoops: Map<string, ActiveLoop> = new Map();
// The earliest subdivision at which pending loops may activate (always the NEXT bar's beat 1)
let pendingActivateAtSub = 0;

let isRunning = false;
let activeLoops: Map<string, ActiveLoop> = new Map();
let currentSubdivision = 0;
// timerRef removed — now using Web Worker timer via timer-worker.ts
let onSubdivisionCallback: ((sub: number) => void) | null = null;
let lastTickTime = 0; // performance.now() of last tick

// --- Lookahead scheduler parameters ---
// How far ahead (in seconds) we schedule audio events
const SCHEDULE_AHEAD_TIME = 0.1; // 100ms lookahead
// How often (in ms) the scheduler wakes up to schedule events
const SCHEDULER_INTERVAL = 25; // 25ms – wakes up frequently but does very little work

// Web Audio clock: absolute audio time of the next subdivision to schedule
let nextTickAudioTime = 0;

let currentBpm = 120;
let beatsPerBar = 4;
let beatUnit = 4; // denominator of time signature

// Sync (quantization) toggle — persisted in localStorage
let syncEnabled = true;

// Force loops to start on beat 1 — only when user enables in settings
let forceLoopBeat1 = false;

// Disable metronome downbeat accent
let metronomeAccentEnabled = true;

// Count-in removed

export function setSyncEnabled(enabled: boolean) {
  syncEnabled = enabled;
  localStorage.setItem('drum-pads-sync-enabled', String(enabled));
}

export function isSyncEnabled(): boolean {
  return syncEnabled;
}

export function setForceLoopBeat1(enabled: boolean) {
  forceLoopBeat1 = enabled;
  localStorage.setItem('glory-force-loop-beat1', String(enabled));
}

export function isForceLoopBeat1(): boolean {
  return forceLoopBeat1;
}

export function setMetronomeAccent(enabled: boolean) {
  metronomeAccentEnabled = enabled;
  localStorage.setItem('glory-metronome-accent', String(enabled));
}

export function isMetronomeAccent(): boolean {
  return metronomeAccentEnabled;
}

export function setCountIn(_enabled: boolean) {
  // no-op — count-in removed
}

export function isCountIn(): boolean {
  return false;
}

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

// Metronome state (driven by the same clock)
let metronomeEnabled = false;
let metronomeVolume = 0.3;
const metronomeBeatListeners = new Set<(beat: number) => void>();

export function setLoopBpm(bpm: number) {
  currentBpm = bpm;
  if (isRunning) {
    stopEngine();
    startEngine();
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
  if (!isRunning) {
    startEngine();
  }
}

export function disableMetronome() {
  metronomeEnabled = false;
  if (isRunning && activeLoops.size === 0 && pendingLoops.size === 0) {
    stopEngine();
  }
}

export function setMetronomeVolume(vol: number) {
  metronomeVolume = vol;
}

export function getMetronomeVolume() {
  return metronomeVolume;
}

export function onMetronomeBeat(cb: ((beat: number) => void) | null) {
  if (!cb) return () => {};
  metronomeBeatListeners.add(cb);
  return () => {
    metronomeBeatListeners.delete(cb);
  };
}

export function isMetronomeActive() {
  return metronomeEnabled;
}

// --- Loop management ---

export function addLoop(pad: PadSound, volume: number) {
  if (!isRunning) {
    activeLoops.set(pad.id, { pad, volume, startSubdivision: 0 });
    startEngine();
  } else if (forceLoopBeat1) {
    // Queue — loop will activate at the NEXT bar's beat 1 and begin at step 0 (kick)
    const SUBS = getSubdivisionsPerBar();
    const nextBar = (Math.floor(currentSubdivision / SUBS) + 1) * SUBS;
    // Only push the activation point forward if this is a new batch or further out
    if (pendingLoops.size === 0 || nextBar > pendingActivateAtSub) {
      pendingActivateAtSub = nextBar;
    }
    pendingLoops.set(pad.id, { pad, volume, startSubdivision: nextBar });
  } else {
    // Immediate start aligned to next scheduler subdivision
    activeLoops.set(pad.id, { pad, volume, startSubdivision: currentSubdivision + 1 });
  }
}

export function removeLoop(padId: string) {
  activeLoops.delete(padId);
  pendingLoops.delete(padId);
  // Stop any playing custom buffer source
  const src = activeLoopSources.get(padId);
  if (src) { try { src.stop(); } catch { /* already stopped */ } activeLoopSources.delete(padId); }
  if (isRunning && activeLoops.size === 0 && pendingLoops.size === 0 && !metronomeEnabled) {
    stopEngine();
  }
}

export function updateLoopVolume(padId: string, volume: number) {
  const loop = activeLoops.get(padId);
  if (loop) {
    loop.volume = volume;
  }
  const pending = pendingLoops.get(padId);
  if (pending) {
    pending.volume = volume;
  }
}

export function isLoopEngineRunning() {
  return isRunning;
}

export function getCurrentBpm(): number {
  return currentBpm;
}

export function getActiveLoopIds(): string[] {
  return [...activeLoops.keys(), ...pendingLoops.keys()];
}

// --- Schedule a single subdivision's audio at a precise audio time ---

// Track active loop sources so we can stop them before restarting
const activeLoopSources = new Map<string, AudioBufferSourceNode>();

function scheduleSubdivision(subdivision: number, audioTime: number) {
  const SUBS = getSubdivisionsPerBar();

  // Move pending loops to active on the NEXT bar's beat 1
  if (pendingLoops.size > 0 && subdivision >= pendingActivateAtSub && (subdivision % SUBS) === 0) {
    for (const [id, loop] of pendingLoops) {
      activeLoops.set(id, loop);
    }
    pendingLoops.clear();
  }

  // Fire loop sounds for this subdivision
  for (const [, loop] of activeLoops) {
    if (hasCustomBuffer(loop.pad.id)) {
      const totalSubs = SUBS * (loop.pad.loopBars || 1);
      const loopPos = ((subdivision - loop.startSubdivision) % totalSubs + totalSubs) % totalSubs;
      if (loopPos === 0) {
        // Stop previous source to avoid overlap/cutting artifacts
        const prevSource = activeLoopSources.get(loop.pad.id);
        if (prevSource) {
          try { prevSource.stop(audioTime); } catch { /* already stopped */ }
        }
        const panner = getPadPanner(loop.pad.id);
        const source = playSound(loop.pad.id, loop.volume, panner, audioTime);
        if (source) activeLoopSources.set(loop.pad.id, source);
        getEmitter()?.(loop.pad.id);
      }
      continue;
    }
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

  // Fire metronome click on beat subdivisions
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
// Wakes up periodically and schedules all subdivisions that fall within
// the lookahead window. This decouples timing accuracy from main-thread latency.

function schedulerTick() {
  const ctx = getAudioContext();

  // Resume context if the OS suspended it (screen lock, background)
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  const intervalSec = 60 / currentBpm / 4; // duration of one 16th note
  const SUBS = getSubdivisionsPerBar();

  // --- Gap recovery: if nextTickAudioTime fell too far behind (e.g. timer frozen
  // in background), skip ahead to present instead of scheduling hundreds of late events
  const gap = ctx.currentTime - nextTickAudioTime;
  if (gap > 0.5) {
    // Calculate how many subdivisions we missed
    const missedSubs = Math.floor(gap / intervalSec);
    // Advance currentSubdivision, keeping bar alignment
    currentSubdivision = (currentSubdivision + missedSubs) % (SUBS * 256);
    // Re-anchor to now
    nextTickAudioTime = ctx.currentTime + 0.005;
    console.log(`[LoopEngine] Gap recovery: skipped ${missedSubs} subs (${gap.toFixed(2)}s behind)`);
  }

  // Schedule all subdivisions within the lookahead window (max 8 per tick to avoid jank)
  let scheduled = 0;
  while (nextTickAudioTime < ctx.currentTime + SCHEDULE_AHEAD_TIME && scheduled < 8) {
    scheduleSubdivision(currentSubdivision, nextTickAudioTime);
    lastTickTime = performance.now();

    // Advance — wrap at bar boundary only (keeps metronome & loops aligned)
    nextTickAudioTime += intervalSec;
    currentSubdivision = currentSubdivision + 1;
    if (currentSubdivision >= SUBS * 256) {
      currentSubdivision = 0;
    }
    scheduled++;
  }
}

function startEngine() {
  if (isRunning) return;
  isRunning = true;
  currentSubdivision = 0;

  const ctx = getAudioContext();
  // Anchor the first tick slightly in the future to allow pre-scheduling
  nextTickAudioTime = ctx.currentTime + 0.005;

  // Use Web Worker timer — significantly less throttled in background on iOS
  startWorkerTimer(schedulerTick, SCHEDULER_INTERVAL);

  // Run immediately once to schedule the first batch
  schedulerTick();
}

function stopEngine() {
  isRunning = false;
  stopWorkerTimer();
  currentSubdivision = 0;
  onSubdivisionCallback?.(0);
}

/** Force re-anchor the scheduler to ctx.currentTime. Call after returning from background. */
export function resyncEngine() {
  if (!isRunning) return;
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  nextTickAudioTime = ctx.currentTime + 0.005;
  // Restart worker timer in case it was killed
  stopWorkerTimer();
  startWorkerTimer(schedulerTick, SCHEDULER_INTERVAL);
  schedulerTick();
  console.log('[LoopEngine] Resynced after visibility change');
}

export function stopAllLoops() {
  activeLoops.clear();
  pendingLoops.clear();
  if (!metronomeEnabled) {
    stopEngine();
  }
}

/**
 * Returns the delay in seconds to quantize a pad hit to the nearest 16th-note subdivision.
 * If the engine is not running, returns 0 (play immediately).
 */
export function getQuantizeDelay(): number {
  if (!isRunning || !syncEnabled) return 0;
  const subdivisionMs = (60 / currentBpm / 4) * 1000;
  const elapsed = performance.now() - lastTickTime;
  const remaining = subdivisionMs - elapsed;
  if (elapsed < subdivisionMs * 0.4) {
    return 0;
  }
  return Math.max(0, remaining / 1000);
}
