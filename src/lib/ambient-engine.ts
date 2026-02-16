// Ambient Pad Engine
// Supports both synthesized pads and imported audio samples per note
// Uses layered oscillators OR looping AudioBufferSource for smooth ambient textures

import { getAudioContext, getMasterGain } from './audio-engine';
import { getAmbientSound } from './ambient-sound-store';

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
export type NoteName = typeof NOTES[number];
export const ALL_NOTES = [...NOTES];

// Base frequencies for octave 4
const BASE_FREQS: Record<NoteName, number> = {
  C: 261.63, 'C#': 277.18, D: 293.66, 'D#': 311.13,
  E: 329.63, F: 349.23, 'F#': 369.99, G: 392.0,
  'G#': 415.30, A: 440.0, 'A#': 466.16, B: 493.88,
};

// Native MP3 pad file paths (bundled in public/pads/)
const NATIVE_PAD_FILES: Record<NoteName, string> = {
  C: '/pads/C.mp3', 'C#': '/pads/Cs.mp3', D: '/pads/D.mp3', 'D#': '/pads/Ds.mp3',
  E: '/pads/E.mp3', F: '/pads/F.mp3', 'F#': '/pads/Fs.mp3', G: '/pads/G.mp3',
  'G#': '/pads/Gs.mp3', A: '/pads/A.mp3', 'A#': '/pads/As.mp3', B: '/pads/B.mp3',
};

interface SynthVoice {
  type: 'synth';
  oscillators: OscillatorNode[];
  gains: GainNode[];
  masterGain: GainNode;
  filterNode: BiquadFilterNode;
}

interface SampleVoice {
  type: 'sample';
  source: AudioBufferSourceNode;
  masterGain: GainNode;
}

type AmbientVoice = SynthVoice | SampleVoice;

const activeVoices = new Map<NoteName, AmbientVoice>();
const fadingVoices = new Set<AmbientVoice>(); // track voices during fade-out for cleanup
const decodedBuffers = new Map<NoteName, AudioBuffer>();
let ambientVolume = 0.4;
let ambientPan = 0;
let ambientPanner: StereoPannerNode | null = null;
let samplesInitialized = false;

function getAmbientPanner(): StereoPannerNode {
  if (!ambientPanner) {
    const ctx = getAudioContext();
    ambientPanner = ctx.createStereoPanner();
    ambientPanner.pan.value = ambientPan;
    ambientPanner.connect(getMasterGain());
  }
  return ambientPanner;
}

const ATTACK = 3.0;
const RELEASE = 4.0;

export function setAmbientVolume(vol: number) {
  ambientVolume = vol;
  for (const [, voice] of activeVoices) {
    voice.masterGain.gain.setTargetAtTime(vol, getAudioContext().currentTime, 0.1);
  }
}

export function getAmbientVolume() {
  return ambientVolume;
}

export function setAmbientPan(pan: number) {
  ambientPan = pan;
  if (ambientPanner) {
    ambientPanner.pan.setValueAtTime(pan, getAudioContext().currentTime);
  }
}

export function getAmbientPan() {
  return ambientPan;
}

// Pre-decode and cache a sample buffer for a note
export async function loadAmbientSample(note: NoteName): Promise<boolean> {
  const data = await getAmbientSound(note);
  if (!data) {
    decodedBuffers.delete(note);
    return false;
  }
  const ctx = getAudioContext();
  const buffer = await ctx.decodeAudioData(data.buffer.slice(0));
  decodedBuffers.set(note, buffer);
  return true;
}

// Check if a note has a custom sample loaded
export function hasCustomSample(note: NoteName): boolean {
  return decodedBuffers.has(note);
}

// Load native MP3 pads from public/pads/, then override with user custom samples
export async function initAmbientSamples() {
  if (samplesInitialized) return;

  const ctx = getAudioContext();
  if (ctx.state === 'suspended') await ctx.resume();

  // 1. Load native bundled MP3s
  await Promise.all(
    ALL_NOTES.map(async (note) => {
      try {
        const resp = await fetch(NATIVE_PAD_FILES[note]);
        if (!resp.ok) return;
        const arrayBuf = await resp.arrayBuffer();
        const buffer = await ctx.decodeAudioData(arrayBuf);
        decodedBuffers.set(note, buffer);
      } catch (e) {
        console.warn(`Failed to load native pad for ${note}`, e);
      }
    })
  );

  // 2. Override with user-imported custom samples (from IndexedDB)
  const { getAllAmbientSoundNotes } = await import('./ambient-sound-store');
  const customNotes = await getAllAmbientSoundNotes();
  await Promise.all(customNotes.map(n => loadAmbientSample(n as NoteName)));

  samplesInitialized = true;
}

function startSampleNote(note: NoteName, buffer: AudioBuffer) {
  const ctx = getAudioContext();
  const panner = getAmbientPanner();
  const t = ctx.currentTime;

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const voiceGain = ctx.createGain();
  voiceGain.gain.setValueAtTime(0, t);
  voiceGain.gain.linearRampToValueAtTime(ambientVolume, t + ATTACK);

  source.connect(voiceGain);
  voiceGain.connect(panner);
  source.start(t);

  activeVoices.set(note, { type: 'sample', source, masterGain: voiceGain });
}

function startSynthNote(note: NoteName) {
  const ctx = getAudioContext();
  const panner = getAmbientPanner();
  const freq = BASE_FREQS[note];
  const t = ctx.currentTime;

  const voiceGain = ctx.createGain();
  voiceGain.gain.setValueAtTime(0, t);
  voiceGain.gain.linearRampToValueAtTime(ambientVolume, t + ATTACK);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 800;
  filter.Q.value = 0.3;

  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.08;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 300;
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);
  lfo.start(t);

  filter.connect(voiceGain);
  voiceGain.connect(panner);

  const oscillators: OscillatorNode[] = [];
  const gains: GainNode[] = [];

  // Layer 1: Deep root
  const osc1 = ctx.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.value = freq * 0.5;
  const g1 = ctx.createGain();
  g1.gain.value = 0.3;
  osc1.connect(g1); g1.connect(filter);
  oscillators.push(osc1); gains.push(g1);

  // Layer 2: Root
  const osc2 = ctx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.value = freq;
  const g2 = ctx.createGain();
  g2.gain.value = 0.35;
  osc2.connect(g2); g2.connect(filter);
  oscillators.push(osc2); gains.push(g2);

  // Layer 3: Fifth
  const osc3 = ctx.createOscillator();
  osc3.type = 'triangle';
  osc3.frequency.value = freq * 1.498;
  const g3 = ctx.createGain();
  g3.gain.value = 0.12;
  osc3.connect(g3); g3.connect(filter);
  oscillators.push(osc3); gains.push(g3);

  // Layer 4: Octave detuned
  const osc4 = ctx.createOscillator();
  osc4.type = 'sine';
  osc4.frequency.value = freq * 2.002;
  const g4 = ctx.createGain();
  g4.gain.value = 0.08;
  osc4.connect(g4); g4.connect(filter);
  oscillators.push(osc4); gains.push(g4);

  for (const osc of oscillators) osc.start(t);

  activeVoices.set(note, {
    type: 'synth',
    oscillators,
    gains,
    masterGain: voiceGain,
    filterNode: filter,
  });
}

export function startAmbientNote(note: NoteName) {
  if (activeVoices.has(note)) return;

  const buffer = decodedBuffers.get(note);
  if (buffer) {
    startSampleNote(note, buffer);
  } else {
    startSynthNote(note);
  }
}

export function stopAmbientNote(note: NoteName) {
  const voice = activeVoices.get(note);
  if (!voice) return;

  const ctx = getAudioContext();
  const t = ctx.currentTime;

  voice.masterGain.gain.cancelScheduledValues(t);
  voice.masterGain.gain.setValueAtTime(voice.masterGain.gain.value, t);
  voice.masterGain.gain.linearRampToValueAtTime(0, t + RELEASE);

  // Track for cleanup
  fadingVoices.add(voice);
  activeVoices.delete(note);

  // Schedule full cleanup after fade-out completes
  const cleanupMs = (RELEASE + 0.2) * 1000;
  setTimeout(() => {
    try {
      if (voice.type === 'synth') {
        for (const osc of voice.oscillators) {
          osc.stop();
          osc.disconnect();
        }
        for (const g of voice.gains) g.disconnect();
        voice.filterNode.disconnect();
      } else {
        voice.source.stop();
        voice.source.disconnect();
      }
      voice.masterGain.disconnect();
    } catch {
      // Already stopped/disconnected — safe to ignore
    }
    fadingVoices.delete(voice);
  }, cleanupMs);
}

export function toggleAmbientNote(note: NoteName): boolean {
  if (activeVoices.has(note)) {
    // Same note → stop it
    stopAmbientNote(note);
    return false;
  } else {
    // Different note → stop all others first, then start this one
    for (const activeNote of [...activeVoices.keys()]) {
      stopAmbientNote(activeNote);
    }
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
