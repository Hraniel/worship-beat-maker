// Unified clock engine: single timing source for loops AND metronome
// Both sync to the same 16th-note subdivision grid
// Uses a "lookahead scheduler" pattern (Chris Wilson's "A Tale of Two Clocks")
// to pre-schedule audio events via the Web Audio clock, making timing resilient
// to main-thread jank caused by external programs (e.g. MainStage, DAWs).

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

// Sync (quantization) toggle
let syncEnabled = true;

export function setSyncEnabled(enabled: boolean) {
  syncEnabled = enabled;
}

export function isSyncEnabled(): boolean {
  return syncEnabled;
}

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
let onMetronomeBeatCallback: ((beat: number) => void) | null = null;

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

// --- Schedule a single subdivision's audio at a precise audio time ---

function scheduleSubdivision(subdivision: number, audioTime: number) {
  const SUBS = getSubdivisionsPerBar();

  // Fire loop sounds for this subdivision
  for (const [, loop] of activeLoops) {
    if (hasCustomBuffer(loop.pad.id)) {
      const totalSubs = SUBS * (loop.pad.loopBars || 1);
      const loopPos = subdivision % totalSubs;
      if (loopPos === 0) {
        const panner = getPadPanner(loop.pad.id);
        playSound(loop.pad.id, loop.volume, panner, audioTime);
        getEmitter()?.(loop.pad.id);
      }
      continue;
    }
    if (!loop.pad.loopSteps) continue;
    const totalSubs = SUBS * (loop.pad.loopBars || 1);
    const loopPos = subdivision % totalSubs;
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
      playMetronomeClick(beatIndex === 0, metronomeVolume, audioTime);
      getEmitter()?.('metronome');
      onMetronomeBeatCallback?.(beatIndex);
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

  // Compute max loop length for wrapping
  const SUBS = getSubdivisionsPerBar();
  let maxSubs = SUBS;
  for (const [, loop] of activeLoops) {
    const s = SUBS * (loop.pad.loopBars || 1);
    if (s > maxSubs) maxSubs = s;
  }

  // Schedule all subdivisions that fall within the lookahead window
  while (nextTickAudioTime < ctx.currentTime + SCHEDULE_AHEAD_TIME) {
    scheduleSubdivision(currentSubdivision, nextTickAudioTime);
    lastTickTime = performance.now();

    // Advance
    nextTickAudioTime += intervalSec;
    currentSubdivision = (currentSubdivision + 1) % maxSubs;
  }
}

function startEngine() {
  if (isRunning) return;
  isRunning = true;
  currentSubdivision = 0;

  const ctx = getAudioContext();
  // Anchor the first tick slightly in the future to allow pre-scheduling
  nextTickAudioTime = ctx.currentTime + 0.005;

  // Use setInterval for the scheduler wake-up — it's lightweight and
  // doesn't need to be precise since audio timing comes from ctx.currentTime
  timerRef = window.setInterval(schedulerTick, SCHEDULER_INTERVAL);

  // Run immediately once to schedule the first batch
  schedulerTick();
}

function stopEngine() {
  isRunning = false;
  if (timerRef !== null) {
    clearInterval(timerRef);
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
  if (elapsed < subdivisionMs * 0.4) {
    return 0;
  }
  return Math.max(0, remaining / 1000);
}
