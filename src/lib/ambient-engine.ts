// Ambient Pad Synth Engine
// Generates sustained pad chords for each of the 12 chromatic notes
// Uses layered oscillators with slow attack/release for smooth ambient textures

import { getAudioContext, getMasterGain } from './audio-engine';

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
export type NoteName = typeof NOTES[number];
export const ALL_NOTES = [...NOTES];

// Base frequencies for octave 3 (middle range for pads)
const BASE_FREQS: Record<NoteName, number> = {
  C: 130.81, 'C#': 138.59, D: 146.83, 'D#': 155.56,
  E: 164.81, F: 174.61, 'F#': 185.0, G: 196.0,
  'G#': 207.65, A: 220.0, 'A#': 233.08, B: 246.94,
};

interface AmbientVoice {
  oscillators: OscillatorNode[];
  gains: GainNode[];
  masterGain: GainNode;
  filterNode: BiquadFilterNode;
}

const activeVoices = new Map<NoteName, AmbientVoice>();
let ambientVolume = 0.4;

const ATTACK = 1.5;  // seconds fade in
const RELEASE = 2.0; // seconds fade out

export function setAmbientVolume(vol: number) {
  ambientVolume = vol;
  for (const [, voice] of activeVoices) {
    voice.masterGain.gain.setTargetAtTime(vol, getAudioContext().currentTime, 0.1);
  }
}

export function getAmbientVolume() {
  return ambientVolume;
}

export function startAmbientNote(note: NoteName) {
  if (activeVoices.has(note)) return; // already playing

  const ctx = getAudioContext();
  const master = getMasterGain();
  const freq = BASE_FREQS[note];
  const t = ctx.currentTime;

  // Master gain for this voice
  const voiceGain = ctx.createGain();
  voiceGain.gain.setValueAtTime(0, t);
  voiceGain.gain.linearRampToValueAtTime(ambientVolume, t + ATTACK);

  // Low-pass filter for warmth
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 2000;
  filter.Q.value = 0.5;
  filter.connect(voiceGain);
  voiceGain.connect(master);

  const oscillators: OscillatorNode[] = [];
  const gains: GainNode[] = [];

  // Layer 1: Root (sub octave) — sine
  const osc1 = ctx.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.value = freq;
  const g1 = ctx.createGain();
  g1.gain.value = 0.4;
  osc1.connect(g1);
  g1.connect(filter);
  oscillators.push(osc1);
  gains.push(g1);

  // Layer 2: Root + octave — triangle (warmth)
  const osc2 = ctx.createOscillator();
  osc2.type = 'triangle';
  osc2.frequency.value = freq * 2;
  const g2 = ctx.createGain();
  g2.gain.value = 0.25;
  osc2.connect(g2);
  g2.connect(filter);
  oscillators.push(osc2);
  gains.push(g2);

  // Layer 3: Fifth — sine (adds richness)
  const osc3 = ctx.createOscillator();
  osc3.type = 'sine';
  osc3.frequency.value = freq * 1.5;
  const g3 = ctx.createGain();
  g3.gain.value = 0.15;
  osc3.connect(g3);
  g3.connect(filter);
  oscillators.push(osc3);
  gains.push(g3);

  // Layer 4: Slight detune for chorus effect
  const osc4 = ctx.createOscillator();
  osc4.type = 'sine';
  osc4.frequency.value = freq * 2.005; // slight detune
  const g4 = ctx.createGain();
  g4.gain.value = 0.15;
  osc4.connect(g4);
  g4.connect(filter);
  oscillators.push(osc4);
  gains.push(g4);

  // Start all
  for (const osc of oscillators) osc.start(t);

  activeVoices.set(note, {
    oscillators,
    gains,
    masterGain: voiceGain,
    filterNode: filter,
  });
}

export function stopAmbientNote(note: NoteName) {
  const voice = activeVoices.get(note);
  if (!voice) return;

  const ctx = getAudioContext();
  const t = ctx.currentTime;

  // Fade out
  voice.masterGain.gain.cancelScheduledValues(t);
  voice.masterGain.gain.setValueAtTime(voice.masterGain.gain.value, t);
  voice.masterGain.gain.linearRampToValueAtTime(0, t + RELEASE);

  // Stop oscillators after release
  for (const osc of voice.oscillators) {
    osc.stop(t + RELEASE + 0.1);
  }

  activeVoices.delete(note);
}

export function toggleAmbientNote(note: NoteName): boolean {
  if (activeVoices.has(note)) {
    stopAmbientNote(note);
    return false;
  } else {
    startAmbientNote(note);
    return true;
  }
}

export function stopAllAmbient() {
  for (const note of [...activeVoices.keys()]) {
    stopAmbientNote(note);
  }
}

export function getActiveAmbientNotes(): NoteName[] {
  return [...activeVoices.keys()];
}

export function isAmbientNoteActive(note: NoteName): boolean {
  return activeVoices.has(note);
}
