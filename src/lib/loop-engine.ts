// Unified clock engine: single timing source for loops AND metronome
// Both sync to the same 16th-note subdivision grid

import { getAudioContext, playSound, playMetronomeClick } from './audio-engine';
import type { PadSound } from './sounds';

const SUBDIVISIONS_PER_BAR = 16; // 16th-note grid

interface ActiveLoop {
  pad: PadSound;
  volume: number;
}

let isRunning = false;
let activeLoops: Map<string, ActiveLoop> = new Map();
let currentSubdivision = 0;
let timerRef: number | null = null;
let onSubdivisionCallback: ((sub: number) => void) | null = null;
let lastTickTime = 0; // timestamp of last tick

let currentBpm = 120;
let beatsPerBar = 4;

// Metronome state (driven by the same clock)
let metronomeEnabled = false;
let metronomeVolume = 0.3;
let onMetronomeBeatCallback: ((beat: number) => void) | null = null;

export function setLoopBpm(bpm: number) {
  currentBpm = bpm;
  // If running, restart with new timing
  if (isRunning) {
    stopEngine();
    startEngine();
  }
}

export function setLoopTimeSignature(ts: string) {
  beatsPerBar = parseInt(ts.split('/')[0]);
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

export function getActiveLoopIds(): string[] {
  return Array.from(activeLoops.keys());
}

// --- Unified tick ---

function tick() {
  lastTickTime = performance.now();

  // Fire loop sounds for this subdivision
  for (const [, loop] of activeLoops) {
    if (!loop.pad.loopSteps) continue;
    for (const [sub, soundId] of loop.pad.loopSteps) {
      if (sub === currentSubdivision) {
        playSound(soundId, loop.volume);
      }
    }
  }

  // Fire metronome click on quarter-note subdivisions
  if (metronomeEnabled) {
    const subsPerBeat = SUBDIVISIONS_PER_BAR / beatsPerBar;
    if (currentSubdivision % subsPerBeat === 0) {
      const beatIndex = currentSubdivision / subsPerBeat;
      playMetronomeClick(beatIndex === 0, metronomeVolume);
      onMetronomeBeatCallback?.(beatIndex);
    }
  }

  onSubdivisionCallback?.(currentSubdivision);

  // Advance
  currentSubdivision = (currentSubdivision + 1) % SUBDIVISIONS_PER_BAR;
}

function startEngine() {
  if (isRunning) return;
  isRunning = true;
  currentSubdivision = 0;

  const scheduleNext = () => {
    if (!isRunning) return;
    tick();
    // Interval for one 16th note: (60/bpm) / 4 seconds
    const intervalMs = (60 / currentBpm / 4) * 1000;
    timerRef = window.setTimeout(scheduleNext, intervalMs);
  };

  getAudioContext();
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
  if (!isRunning) return 0;
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
