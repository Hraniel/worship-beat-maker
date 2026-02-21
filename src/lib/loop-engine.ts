// Unified clock engine: single timing source for loops AND metronome
// Both sync to the same 16th-note subdivision grid
// Uses Web Audio API clock (ctx.currentTime) for drift-free scheduling,
// which keeps running even when the page is in the background / screen locked.

import { getAudioContext, playSound, playMetronomeClick, getPadPanner, hasCustomBuffer } from './audio-engine';
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
}

let isRunning = false;
let activeLoops: Map<string, ActiveLoop> = new Map();
let currentSubdivision = 0;
let timerRef: number | null = null;
let onSubdivisionCallback: ((sub: number) => void) | null = null;
let lastTickTime = 0; // performance.now() of last tick

// Web Audio clock: absolute audio time of the next scheduled tick
// This is the key to background-safe scheduling.
let nextTickAudioTime = 0;

let currentBpm = 120;
let beatsPerBar = 4;
let beatUnit = 4; // denominator of time signature

// Sync (quantization) toggle
let syncEnabled = true;

export function setSyncEnabled(enabled: boolean) {
  syncEnabled = enabled;
}

export function isSyncEnabled(): boolean {
  return syncEnabled;
}

function getSubdivisionsPerBar(): number {
  // 4/4 -> 16 (4 beats x 4 subdivisions), 3/4 -> 12, 6/8 -> 12 (6 beats x 2)
  const subsPerBeat = beatUnit === 8 ? 2 : 4;
  return beatsPerBar * subsPerBeat;
}

function getSubsPerBeat(): number {
  return beatUnit === 8 ? 2 : 4;
}

// Metronome state (driven by the same clock)
let metronomeEnabled = false;
let metronomeVolume = 0.3;
let onMetronomeBeatCallback: ((beat: number) => void) | null = null;

export function setLoopBpm(bpm: number) {
  currentBpm = bpm;
  // If running, restart with new timing; nextTickAudioTime will be reset in startEngine
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
  if (isRunning && activeLoops.size === 0) {
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
  onMetronomeBeatCallback = cb;
}

export function isMetronomeActive() {
  return metronomeEnabled;
}

// --- Loop management ---

export function addLoop(pad: PadSound, volume: number) {
  activeLoops.set(pad.id, { pad, volume });
  if (!isRunning) {
    startEngine();
  }
}

export function removeLoop(padId: string) {
  activeLoops.delete(padId);
  if (isRunning && activeLoops.size === 0 && !metronomeEnabled) {
    stopEngine();
  }
}

export function updateLoopVolume(padId: string, volume: number) {
  const loop = activeLoops.get(padId);
  if (loop) {
    loop.volume = volume;
  }
}

export function isLoopEngineRunning() {
  return isRunning;
}

export function getCurrentBpm(): number {
  return currentBpm;
}

export function getActiveLoopIds(): string[] {
  return Array.from(activeLoops.keys());
}

// --- Unified tick ---

function tick() {
  lastTickTime = performance.now();

  const SUBS = getSubdivisionsPerBar();

  // Fire loop sounds for this subdivision
  for (const [, loop] of activeLoops) {
    // If this loop pad has a custom imported sound, play it once per bar
    // instead of following the native loopSteps pattern
    if (hasCustomBuffer(loop.pad.id)) {
      const totalSubs = SUBS * (loop.pad.loopBars || 1);
      const loopPos = currentSubdivision % totalSubs;
      if (loopPos === 0) {
        const panner = getPadPanner(loop.pad.id);
        playSound(loop.pad.id, loop.volume, panner);
        getEmitter()?.(loop.pad.id);
      }
      continue;
    }
    if (!loop.pad.loopSteps) continue;
    const totalSubs = SUBS * (loop.pad.loopBars || 1);
    const loopPos = currentSubdivision % totalSubs;
    for (const [sub, soundId] of loop.pad.loopSteps) {
      if (sub === loopPos) {
        const panner = getPadPanner(loop.pad.id);
        playSound(soundId, loop.volume, panner);
        getEmitter()?.(loop.pad.id);
      }
    }
  }

  // Fire metronome click on beat subdivisions
  if (metronomeEnabled) {
    const subsPerBeat = getSubsPerBeat();
    const barPos = currentSubdivision % SUBS;
    if (barPos % subsPerBeat === 0) {
      const beatIndex = barPos / subsPerBeat;
      playMetronomeClick(beatIndex === 0, metronomeVolume);
      getEmitter()?.('metronome');
      onMetronomeBeatCallback?.(beatIndex);
    }
  }

  onSubdivisionCallback?.(currentSubdivision % SUBS);

  // Advance – use max loop length across all active loops
  let maxSubs = SUBS;
  for (const [, loop] of activeLoops) {
    const s = SUBS * (loop.pad.loopBars || 1);
    if (s > maxSubs) maxSubs = s;
  }
  currentSubdivision = (currentSubdivision + 1) % maxSubs;
}

function startEngine() {
  if (isRunning) return;
  isRunning = true;
  currentSubdivision = 0;

  const ctx = getAudioContext();
  // Anchor the first tick to the Web Audio clock so scheduling stays
  // accurate even when the page goes to background / screen locks.
  nextTickAudioTime = ctx.currentTime;

  const scheduleNext = () => {
    if (!isRunning) return;

    const ctx = getAudioContext();
    // Resume context if the OS suspended it (screen lock, background)
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    tick();

    // Interval for one 16th note (in seconds)
    const intervalSec = 60 / currentBpm / 4;
    // Advance absolute audio time anchor
    nextTickAudioTime += intervalSec;

    // How many ms to wait until the next tick?
    // Use ctx.currentTime for a drift-free reference.
    const delayMs = (nextTickAudioTime - ctx.currentTime) * 1000;

    timerRef = window.setTimeout(scheduleNext, Math.max(0, delayMs));
  };

  scheduleNext();
}

function stopEngine() {
  isRunning = false;
  if (timerRef !== null) {
    clearTimeout(timerRef);
    timerRef = null;
  }
  currentSubdivision = 0;
  onSubdivisionCallback?.(0);
}

export function stopAllLoops() {
  activeLoops.clear();
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
  // If we're within 40% of the current tick, snap back (no delay)
  // Otherwise snap forward to the next tick
  if (elapsed < subdivisionMs * 0.4) {
    return 0;
  }
  return Math.max(0, remaining / 1000); // convert to seconds
}
