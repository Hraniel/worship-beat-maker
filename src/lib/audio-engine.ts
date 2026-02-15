// Web Audio API sound synthesis engine for drum pads

let audioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Master gain node
let masterGain: GainNode | null = null;

export function getMasterGain(): GainNode {
  const ctx = getAudioContext();
  if (!masterGain) {
    masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);
  }
  return masterGain;
}

export function setMasterVolume(value: number) {
  getMasterGain().gain.setValueAtTime(value, getAudioContext().currentTime);
}

// --- DRUM SYNTHESIS ---

export function playKick(volume = 0.8) {
  const ctx = getAudioContext();
  const gain = ctx.createGain();
  const osc = ctx.createOscillator();
  gain.connect(getMasterGain());
  osc.connect(gain);
  osc.frequency.setValueAtTime(150, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.15);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.4);
}

export function playSnare(volume = 0.7) {
  const ctx = getAudioContext();
  // Noise burst
  const noiseLen = 0.2;
  const bufferSize = ctx.sampleRate * noiseLen;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const noiseGain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 1000;
  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(getMasterGain());
  noiseGain.gain.setValueAtTime(volume, ctx.currentTime);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + noiseLen);
  noise.start(ctx.currentTime);
  noise.stop(ctx.currentTime + noiseLen);
  // Tone body
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.connect(oscGain);
  oscGain.connect(getMasterGain());
  osc.frequency.setValueAtTime(180, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.08);
  oscGain.gain.setValueAtTime(volume * 0.7, ctx.currentTime);
  oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.1);
}

export function playHiHatClosed(volume = 0.5) {
  const ctx = getAudioContext();
  const len = 0.08;
  const bufferSize = ctx.sampleRate * len;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 6000;
  const gain = ctx.createGain();
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(getMasterGain());
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + len);
  noise.start(ctx.currentTime);
  noise.stop(ctx.currentTime + len);
}

export function playHiHatOpen(volume = 0.5) {
  const ctx = getAudioContext();
  const len = 0.3;
  const bufferSize = ctx.sampleRate * len;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 5000;
  const gain = ctx.createGain();
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(getMasterGain());
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + len);
  noise.start(ctx.currentTime);
  noise.stop(ctx.currentTime + len);
}

export function playCrash(volume = 0.6) {
  const ctx = getAudioContext();
  const len = 1.2;
  const bufferSize = ctx.sampleRate * len;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 3000;
  const gain = ctx.createGain();
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(getMasterGain());
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + len);
  noise.start(ctx.currentTime);
  noise.stop(ctx.currentTime + len);
}

export function playRide(volume = 0.4) {
  const ctx = getAudioContext();
  const len = 0.8;
  const bufferSize = ctx.sampleRate * len;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 8000;
  filter.Q.value = 2;
  const gain = ctx.createGain();
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(getMasterGain());
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + len);
  noise.start(ctx.currentTime);
  noise.stop(ctx.currentTime + len);
}

export function playTom(pitch: 'high' | 'mid' | 'low' = 'mid', volume = 0.7) {
  const ctx = getAudioContext();
  const freqs = { high: 220, mid: 150, low: 100 };
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(getMasterGain());
  osc.frequency.setValueAtTime(freqs[pitch], ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(freqs[pitch] * 0.4, ctx.currentTime + 0.2);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.3);
}

export function playClap(volume = 0.6) {
  const ctx = getAudioContext();
  for (let i = 0; i < 3; i++) {
    const delay = i * 0.01;
    const len = 0.1;
    const bufferSize = ctx.sampleRate * len;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let j = 0; j < bufferSize; j++) data[j] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2500;
    const gain = ctx.createGain();
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(getMasterGain());
    gain.gain.setValueAtTime(volume * 0.7, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + len);
    noise.start(ctx.currentTime + delay);
    noise.stop(ctx.currentTime + delay + len);
  }
}

export function playShaker(volume = 0.4) {
  const ctx = getAudioContext();
  const len = 0.1;
  const bufferSize = ctx.sampleRate * len;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 8000;
  const gain = ctx.createGain();
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(getMasterGain());
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + len);
  noise.start(ctx.currentTime);
  noise.stop(ctx.currentTime + len);
}

export function playRiser(volume = 0.5) {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.connect(gain);
  gain.connect(getMasterGain());
  osc.frequency.setValueAtTime(200, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(4000, ctx.currentTime + 1.5);
  gain.gain.setValueAtTime(0.001, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 1.2);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 1.5);
}

export function playSwell(volume = 0.5) {
  const ctx = getAudioContext();
  const len = 2;
  const bufferSize = ctx.sampleRate * len;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(200, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(8000, ctx.currentTime + 1.5);
  const gain = ctx.createGain();
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(getMasterGain());
  gain.gain.setValueAtTime(0.001, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 1.5);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + len);
  noise.start(ctx.currentTime);
  noise.stop(ctx.currentTime + len);
}

export function playReverseCymbal(volume = 0.5) {
  const ctx = getAudioContext();
  const len = 1;
  const bufferSize = ctx.sampleRate * len;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 4000;
  const gain = ctx.createGain();
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(getMasterGain());
  gain.gain.setValueAtTime(0.001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + len * 0.9);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + len);
  noise.start(ctx.currentTime);
  noise.stop(ctx.currentTime + len);
}

export function playMetronomeClick(accent = false, volume = 0.3) {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(getMasterGain());
  osc.frequency.value = accent ? 1200 : 800;
  osc.type = 'sine';
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.05);
}

// Map sound IDs to play functions
export const soundMap: Record<string, (volume?: number) => void> = {
  kick: playKick,
  snare: playSnare,
  'hihat-closed': playHiHatClosed,
  'hihat-open': playHiHatOpen,
  crash: playCrash,
  ride: playRide,
  'tom-high': (v) => playTom('high', v),
  'tom-mid': (v) => playTom('mid', v),
  'tom-low': (v) => playTom('low', v),
  clap: playClap,
  shaker: playShaker,
  riser: playRiser,
  swell: playSwell,
  'reverse-cymbal': playReverseCymbal,
};

// Custom sound buffer cache
const customBuffers: Map<string, AudioBuffer> = new Map();

export async function loadCustomBuffer(padId: string, arrayBuffer: ArrayBuffer): Promise<void> {
  const ctx = getAudioContext();
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
  customBuffers.set(padId, audioBuffer);
}

export function removeCustomBuffer(padId: string) {
  customBuffers.delete(padId);
}

export function hasCustomBuffer(padId: string): boolean {
  return customBuffers.has(padId);
}

function playCustomBuffer(padId: string, volume = 0.7, destination?: AudioNode) {
  const buffer = customBuffers.get(padId);
  if (!buffer) return;
  const ctx = getAudioContext();
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.value = volume;
  source.connect(gain);
  gain.connect(destination || getMasterGain());
  source.start(0);
}

/**
 * Play a sound, optionally routing through a custom destination node (e.g. effects chain).
 */
export function playSound(id: string, volume = 0.7, destination?: AudioNode) {
  if (customBuffers.has(id)) {
    playCustomBuffer(id, volume, destination);
    return;
  }
  // For synth sounds with a destination, we need to reroute — but synth functions
  // connect directly to master. For simplicity, synth sounds always go through master.
  // Effects chain will only work on custom buffers for now, synth sounds pass through.
  const fn = soundMap[id];
  if (fn) fn(volume);
}
