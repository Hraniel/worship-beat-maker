// Loop engine: schedules loop patterns synchronized to BPM using Web Audio API scheduling

import { getAudioContext, playSound } from './audio-engine';
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

let currentBpm = 120;
let beatsPerBar = 4;

export function setLoopBpm(bpm: number) {
  currentBpm = bpm;
  // If running, restart with new timing
  if (isRunning) {
    stopLoopEngine();
    startLoopEngine();
  }
}

export function setLoopTimeSignature(ts: string) {
  beatsPerBar = parseInt(ts.split('/')[0]);
}

export function setOnSubdivision(cb: ((sub: number) => void) | null) {
  onSubdivisionCallback = cb;
}

export function addLoop(pad: PadSound, volume: number) {
  activeLoops.set(pad.id, { pad, volume });
  if (!isRunning && activeLoops.size > 0) {
    startLoopEngine();
  }
}

export function removeLoop(padId: string) {
  activeLoops.delete(padId);
  if (isRunning && activeLoops.size === 0) {
    stopLoopEngine();
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

function tick() {
  // Fire sounds for this subdivision
  for (const [, loop] of activeLoops) {
    if (!loop.pad.loopSteps) continue;
    for (const [sub, soundId] of loop.pad.loopSteps) {
      if (sub === currentSubdivision) {
        playSound(soundId, loop.volume);
      }
    }
  }

  onSubdivisionCallback?.(currentSubdivision);

  // Advance
  const subsForBar = SUBDIVISIONS_PER_BAR; // always 16 subdivisions regardless of time sig
  currentSubdivision = (currentSubdivision + 1) % subsForBar;
}

function startLoopEngine() {
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

  // Use AudioContext for initial timing reference
  getAudioContext();
  scheduleNext();
}

function stopLoopEngine() {
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
  stopLoopEngine();
}
