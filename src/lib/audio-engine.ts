// Web Audio API sound synthesis engine for drum pads
// Optimized for minimum touch-to-sound latency

let audioCtx: AudioContext | null = null;
let audioUnlocked = false;

export function isAudioUnlocked() { return audioUnlocked; }

function ensureContext(): AudioContext {
  if (!audioCtx) {
    // @ts-ignore - webkitAudioContext for older iOS
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AC({ latencyHint: 'interactive' });
  }
  return audioCtx;
}

export function getAudioContext(): AudioContext {
  const ctx = ensureContext();
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
  return ctx;
}

/**
 * Unlock AudioContext on mobile (iOS/Android).
 * Must be called from a user gesture (touchend/pointerup/click).
 */
export function unlockAudioContext() {
  if (audioUnlocked) return;
  
  const ctx = ensureContext();
  
  // Resume first, then play silent buffer
  const doUnlock = () => {
    try {
      const buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
      audioUnlocked = true;
      console.log('[AudioEngine] Unlocked! state:', ctx.state);
    } catch (e) {
      console.error('[AudioEngine] Unlock failed:', e);
    }
  };

  if (ctx.state === 'suspended') {
    ctx.resume().then(doUnlock).catch(() => doUnlock());
  } else {
    doUnlock();
  }
}

// Global unlock listeners — use ALL event types to maximize compatibility
if (typeof window !== 'undefined') {
  const events = ['touchstart', 'touchend', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'click', 'keydown'];
  const handler = () => {
    unlockAudioContext();
    // Remove all after first successful unlock
    if (audioUnlocked) {
      events.forEach(e => window.removeEventListener(e, handler, true));
    }
  };
  events.forEach(e => window.addEventListener(e, handler, true));
}

// Master gain node
let masterGain: GainNode | null = null;
let masterPanner: StereoPannerNode | null = null;
let masterStereoMode: 'stereo' | 'mono' = 'stereo';

export function getMasterGain(): GainNode {
  const ctx = getAudioContext();
  if (!masterGain) {
    masterGain = ctx.createGain();
    masterPanner = ctx.createStereoPanner();
    masterGain.connect(masterPanner);
    masterPanner.connect(ctx.destination);
  }
  return masterGain;
}

export function setMasterVolume(value: number) {
  getMasterGain().gain.setValueAtTime(value, getAudioContext().currentTime);
}

// --- PAN / STEREO CONTROLS ---

// Per-pad pan nodes
const padPanners = new Map<string, StereoPannerNode>();

export function getPadPanner(padId: string): StereoPannerNode {
  if (padPanners.has(padId)) return padPanners.get(padId)!;
  const ctx = getAudioContext();
  const panner = ctx.createStereoPanner();
  panner.connect(getMasterGain());
  padPanners.set(padId, panner);
  return panner;
}

export function setPadPan(padId: string, pan: number) {
  const panner = getPadPanner(padId);
  panner.pan.setValueAtTime(pan, getAudioContext().currentTime);
}

export function setMasterPan(pan: number) {
  getMasterGain(); // ensure init
  if (masterPanner) {
    masterPanner.pan.setValueAtTime(pan, getAudioContext().currentTime);
  }
}

export function setMasterStereoMode(mode: 'stereo' | 'mono') {
  masterStereoMode = mode;
  getMasterGain(); // ensure init
  if (masterPanner) {
    if (mode === 'mono') {
      // In mono, we merge channels by using a channel merger approach
      // Simple approach: just set pan to 0
      masterPanner.pan.setValueAtTime(0, getAudioContext().currentTime);
    }
  }
}

export function getMasterStereoMode() {
  return masterStereoMode;
}

// Metronome pan
let metronomePanner: StereoPannerNode | null = null;

export function getMetronomePanner(): StereoPannerNode {
  const ctx = getAudioContext();
  if (!metronomePanner) {
    metronomePanner = ctx.createStereoPanner();
    metronomePanner.connect(getMasterGain());
  }
  return metronomePanner;
}

export function setMetronomePan(pan: number) {
  getMetronomePanner().pan.setValueAtTime(pan, getAudioContext().currentTime);
}

// --- DRUM SYNTHESIS ---

export function playKick(volume = 0.8, destination?: AudioNode, startTime?: number) {
  const ctx = getAudioContext();
  const dest = destination || getMasterGain();
  const t = startTime ?? ctx.currentTime;
  const gain = ctx.createGain();
  const osc = ctx.createOscillator();
  gain.connect(dest);
  osc.connect(gain);
  osc.frequency.setValueAtTime(150, t);
  osc.frequency.exponentialRampToValueAtTime(30, t + 0.15);
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
  osc.start(t);
  osc.stop(t + 0.4);
}

export function playSnare(volume = 0.7, destination?: AudioNode, startTime?: number) {
  const ctx = getAudioContext();
  const dest = destination || getMasterGain();
  const t = startTime ?? ctx.currentTime;
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
  noiseGain.connect(dest);
  noiseGain.gain.setValueAtTime(volume, t);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, t + noiseLen);
  noise.start(t);
  noise.stop(t + noiseLen);
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.connect(oscGain);
  oscGain.connect(dest);
  osc.frequency.setValueAtTime(180, t);
  osc.frequency.exponentialRampToValueAtTime(60, t + 0.08);
  oscGain.gain.setValueAtTime(volume * 0.7, t);
  oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  osc.start(t);
  osc.stop(t + 0.1);
}

export function playHiHatClosed(volume = 0.5, destination?: AudioNode, startTime?: number) {
  const ctx = getAudioContext();
  const dest = destination || getMasterGain();
  const t = startTime ?? ctx.currentTime;
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
  gain.connect(dest);
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + len);
  noise.start(t);
  noise.stop(t + len);
}

export function playHiHatOpen(volume = 0.5, destination?: AudioNode, startTime?: number) {
  const ctx = getAudioContext();
  const dest = destination || getMasterGain();
  const t = startTime ?? ctx.currentTime;
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
  gain.connect(dest);
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + len);
  noise.start(t);
  noise.stop(t + len);
}

export function playCrash(volume = 0.6, destination?: AudioNode, startTime?: number) {
  const ctx = getAudioContext();
  const dest = destination || getMasterGain();
  const t = startTime ?? ctx.currentTime;
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
  gain.connect(dest);
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + len);
  noise.start(t);
  noise.stop(t + len);
}

export function playRide(volume = 0.4, destination?: AudioNode, startTime?: number) {
  const ctx = getAudioContext();
  const dest = destination || getMasterGain();
  const t = startTime ?? ctx.currentTime;
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
  gain.connect(dest);
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + len);
  noise.start(t);
  noise.stop(t + len);
}

export function playTom(pitch: 'high' | 'mid' | 'low' = 'mid', volume = 0.7, destination?: AudioNode, startTime?: number) {
  const ctx = getAudioContext();
  const dest = destination || getMasterGain();
  const t = startTime ?? ctx.currentTime;
  const freqs = { high: 220, mid: 150, low: 100 };
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(dest);
  osc.frequency.setValueAtTime(freqs[pitch], t);
  osc.frequency.exponentialRampToValueAtTime(freqs[pitch] * 0.4, t + 0.2);
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  osc.start(t);
  osc.stop(t + 0.3);
}

export function playClap(volume = 0.6, destination?: AudioNode, startTime?: number) {
  const ctx = getAudioContext();
  const dest = destination || getMasterGain();
  const t = startTime ?? ctx.currentTime;
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
    gain.connect(dest);
    gain.gain.setValueAtTime(volume * 0.7, t + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, t + delay + len);
    noise.start(t + delay);
    noise.stop(t + delay + len);
  }
}

export function playShaker(volume = 0.4, destination?: AudioNode, startTime?: number) {
  const ctx = getAudioContext();
  const dest = destination || getMasterGain();
  const t = startTime ?? ctx.currentTime;
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
  gain.connect(dest);
  gain.gain.setValueAtTime(volume, t);
  gain.gain.linearRampToValueAtTime(0, t + len);
  noise.start(t);
  noise.stop(t + len);
}

export function playRiser(volume = 0.5, destination?: AudioNode, startTime?: number) {
  const ctx = getAudioContext();
  const dest = destination || getMasterGain();
  const t = startTime ?? ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.connect(gain);
  gain.connect(dest);
  osc.frequency.setValueAtTime(200, t);
  osc.frequency.exponentialRampToValueAtTime(4000, t + 1.5);
  gain.gain.setValueAtTime(0.001, t);
  gain.gain.linearRampToValueAtTime(volume, t + 1.2);
  gain.gain.linearRampToValueAtTime(0, t + 1.5);
  osc.start(t);
  osc.stop(t + 1.5);
}

export function playSwell(volume = 0.5, destination?: AudioNode, startTime?: number) {
  const ctx = getAudioContext();
  const dest = destination || getMasterGain();
  const t = startTime ?? ctx.currentTime;
  const len = 2;
  const bufferSize = ctx.sampleRate * len;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(200, t);
  filter.frequency.exponentialRampToValueAtTime(8000, t + 1.5);
  const gain = ctx.createGain();
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(dest);
  gain.gain.setValueAtTime(0.001, t);
  gain.gain.linearRampToValueAtTime(volume, t + 1.5);
  gain.gain.linearRampToValueAtTime(0, t + len);
  noise.start(t);
  noise.stop(t + len);
}

export function playReverseCymbal(volume = 0.5, destination?: AudioNode, startTime?: number) {
  const ctx = getAudioContext();
  const dest = destination || getMasterGain();
  const t = startTime ?? ctx.currentTime;
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
  gain.connect(dest);
  gain.gain.setValueAtTime(0.001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + len * 0.9);
  gain.gain.linearRampToValueAtTime(0, t + len);
  noise.start(t);
  noise.stop(t + len);
}

// --- WORSHIP-STYLE SOUNDS ---

export function playFingerSnap(volume = 0.5, destination?: AudioNode, startTime?: number) {
  const ctx = getAudioContext();
  const dest = destination || getMasterGain();
  const t = startTime ?? ctx.currentTime;
  const len = 0.06;
  const bufferSize = ctx.sampleRate * len;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 3500;
  filter.Q.value = 3;
  const gain = ctx.createGain();
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(dest);
  gain.gain.setValueAtTime(volume * 0.9, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + len);
  noise.start(t);
  noise.stop(t + len);
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.connect(oscGain);
  oscGain.connect(dest);
  osc.frequency.setValueAtTime(1800, t);
  osc.frequency.exponentialRampToValueAtTime(800, t + 0.02);
  oscGain.gain.setValueAtTime(volume * 0.4, t);
  oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
  osc.start(t);
  osc.stop(t + 0.03);
}

export function playKickReverb(volume = 0.7, destination?: AudioNode, startTime?: number) {
  const ctx = getAudioContext();
  const dest = destination || getMasterGain();
  const t = startTime ?? ctx.currentTime;
  const convLen = 2.5;
  const convSize = ctx.sampleRate * convLen;
  const convBuffer = ctx.createBuffer(2, convSize, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = convBuffer.getChannelData(ch);
    for (let i = 0; i < convSize; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / convSize, 2.5);
    }
  }
  const convolver = ctx.createConvolver();
  convolver.buffer = convBuffer;
  const dryGain = ctx.createGain();
  const wetGain = ctx.createGain();
  dryGain.gain.value = 0.5;
  wetGain.gain.value = 0.6;
  dryGain.connect(dest);
  convolver.connect(wetGain);
  wetGain.connect(dest);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(dryGain);
  gain.connect(convolver);
  osc.frequency.setValueAtTime(80, t);
  osc.frequency.exponentialRampToValueAtTime(25, t + 0.25);
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
  osc.start(t);
  osc.stop(t + 0.5);
}

export function playSnareReverb(volume = 0.6, destination?: AudioNode, startTime?: number) {
  const ctx = getAudioContext();
  const dest = destination || getMasterGain();
  const t = startTime ?? ctx.currentTime;
  const convLen = 2;
  const convSize = ctx.sampleRate * convLen;
  const convBuffer = ctx.createBuffer(2, convSize, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = convBuffer.getChannelData(ch);
    for (let i = 0; i < convSize; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / convSize, 2);
    }
  }
  const convolver = ctx.createConvolver();
  convolver.buffer = convBuffer;
  const dryGain = ctx.createGain();
  const wetGain = ctx.createGain();
  dryGain.gain.value = 0.4;
  wetGain.gain.value = 0.7;
  dryGain.connect(dest);
  convolver.connect(wetGain);
  wetGain.connect(dest);
  const noiseLen = 0.15;
  const bufferSize = ctx.sampleRate * noiseLen;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 2000;
  filter.Q.value = 0.8;
  const noiseGain = ctx.createGain();
  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(dryGain);
  noiseGain.connect(convolver);
  noiseGain.gain.setValueAtTime(volume, t);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, t + noiseLen);
  noise.start(t);
  noise.stop(t + noiseLen);
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.connect(oscGain);
  oscGain.connect(dryGain);
  oscGain.connect(convolver);
  osc.frequency.setValueAtTime(200, t);
  osc.frequency.exponentialRampToValueAtTime(80, t + 0.06);
  oscGain.gain.setValueAtTime(volume * 0.5, t);
  oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
  osc.start(t);
  osc.stop(t + 0.08);
}


export function playMetronomeClick(accent = false, volume = 0.3, startTime?: number) {
  const ctx = getAudioContext();
  const t = startTime ?? ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(getMetronomePanner());
  osc.frequency.value = accent ? 1200 : 800;
  osc.type = 'sine';
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
  osc.start(t);
  osc.stop(t + 0.05);
}

// Map sound IDs to play functions (with startTime support for precise scheduling)
export const soundMap: Record<string, (volume?: number, destination?: AudioNode, startTime?: number) => void> = {
  kick: playKick,
  snare: playSnare,
  'hihat-closed': playHiHatClosed,
  'hihat-open': playHiHatOpen,
  crash: playCrash,
  ride: playRide,
  'tom-high': (v, d, t) => playTom('high', v, d, t),
  'tom-mid': (v, d, t) => playTom('mid', v, d, t),
  'tom-low': (v, d, t) => playTom('low', v, d, t),
  clap: playClap,
  shaker: playShaker,
  riser: playRiser,
  swell: playSwell,
  'reverse-cymbal': playReverseCymbal,
  'finger-snap': playFingerSnap,
  'kick-reverb': playKickReverb,
  'snare-reverb': playSnareReverb,
  'snare-dry': playSnareReverb,
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

function playCustomBuffer(padId: string, volume = 0.7, destination?: AudioNode, startTime?: number): AudioBufferSourceNode | null {
  const buffer = customBuffers.get(padId);
  if (!buffer) return null;
  const ctx = getAudioContext();
  const t = startTime ?? ctx.currentTime;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.value = volume;
  source.connect(gain);
  if (destination) {
    gain.connect(destination);
  } else {
    gain.connect(getPadPanner(padId));
  }
  source.start(t);
  return source;
}

/**
 * Play a sound, optionally routing through a custom destination node (e.g. effects chain).
 */
export function playSound(id: string, volume = 0.7, destination?: AudioNode, startTime?: number): AudioBufferSourceNode | null {
  if (customBuffers.has(id)) {
    return playCustomBuffer(id, volume, destination, startTime);
  }
  const fn = soundMap[id];
  if (fn) fn(volume, destination, startTime);
  return null;
}

// --- AUDIO OUTPUT DEVICE SELECTION ---

const OUTPUT_DEVICE_KEY = 'drum-pads-output-device';

export function isOutputSelectionSupported(): boolean {
  try {
    return typeof AudioContext !== 'undefined' && 'setSinkId' in AudioContext.prototype;
  } catch {
    return false;
  }
}

export async function getAudioOutputDevices(): Promise<MediaDeviceInfo[]> {
  try {
    // Request permission first (needed for device labels)
    await navigator.mediaDevices.getUserMedia({ audio: true }).then(s => s.getTracks().forEach(t => t.stop())).catch(() => {});
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(d => d.kind === 'audiooutput');
  } catch {
    return [];
  }
}

export function getSavedOutputDeviceId(): string | null {
  return localStorage.getItem(OUTPUT_DEVICE_KEY);
}

export async function setAudioOutputDevice(deviceId: string): Promise<boolean> {
  try {
    const ctx = getAudioContext();
    if ('setSinkId' in ctx) {
      await (ctx as any).setSinkId(deviceId === 'default' ? '' : deviceId);
      localStorage.setItem(OUTPUT_DEVICE_KEY, deviceId);
      return true;
    }
    return false;
  } catch (e) {
    console.error('[AudioEngine] setSinkId failed:', e);
    return false;
  }
}

// Restore saved output device on init
if (typeof window !== 'undefined') {
  const savedDevice = localStorage.getItem(OUTPUT_DEVICE_KEY);
  if (savedDevice && isOutputSelectionSupported()) {
    // Defer until audio context is created
    const origGetCtx = getAudioContext;
    let restored = false;
    const tryRestore = () => {
      if (restored) return;
      restored = true;
      setTimeout(() => {
        setAudioOutputDevice(savedDevice).catch(() => {});
      }, 500);
    };
    window.addEventListener('pointerdown', tryRestore, { once: true });
  }
}

// ── Background audio keep-alive ─────────────────────────────────────────────
// On mobile browsers (especially iOS Safari and some Android browsers),
// the AudioContext gets suspended when the app goes to background.
// We use a longer silent audio buffer + Media Session API to keep the
// OS from killing our audio pipeline.

let keepAliveAudio: HTMLAudioElement | null = null;
let keepAliveInterval: ReturnType<typeof setInterval> | null = null;
let keepAliveOscillator: OscillatorNode | null = null;
let keepAliveOscGain: GainNode | null = null;
let webLockAbort: AbortController | null = null;

function createSilentWav(): string {
  // 10-second silent WAV — longer buffers are less likely to be killed by iOS
  const sampleRate = 8000;
  const numSamples = sampleRate * 10; // 10 seconds
  const dataSize = numSamples * 2; // 16-bit = 2 bytes
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);  // PCM
  view.setUint16(22, 1, true);  // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);
  // samples are all zero (silence)

  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

/** Start a silent oscillator connected to AudioContext.destination to keep the audio graph alive */
function startKeepAliveOscillator() {
  stopKeepAliveOscillator();
  try {
    const ctx = ensureContext();
    keepAliveOscGain = ctx.createGain();
    keepAliveOscGain.gain.value = 0.0001; // near-zero but not zero
    keepAliveOscGain.connect(ctx.destination);
    keepAliveOscillator = ctx.createOscillator();
    keepAliveOscillator.frequency.value = 0; // DC — inaudible
    keepAliveOscillator.connect(keepAliveOscGain);
    keepAliveOscillator.start();
  } catch (e) {
    console.warn('[AudioEngine] Oscillator keep-alive failed:', e);
  }
}

function stopKeepAliveOscillator() {
  if (keepAliveOscillator) {
    try { keepAliveOscillator.stop(); } catch { /* already stopped */ }
    try { keepAliveOscillator.disconnect(); } catch {}
    keepAliveOscillator = null;
  }
  if (keepAliveOscGain) {
    try { keepAliveOscGain.disconnect(); } catch {}
    keepAliveOscGain = null;
  }
}

/** Acquire a Web Lock that never resolves — prevents page from being frozen */
function acquireWebLock() {
  releaseWebLock();
  if (typeof navigator !== 'undefined' && 'locks' in navigator) {
    webLockAbort = new AbortController();
    navigator.locks.request(
      'glory-audio-keep-alive',
      { signal: webLockAbort.signal },
      () => new Promise<void>(() => { /* never resolves — keeps lock held */ }),
    ).catch(() => { /* aborted or unsupported */ });
  }
}

function releaseWebLock() {
  if (webLockAbort) {
    webLockAbort.abort();
    webLockAbort = null;
  }
}

export function startBackgroundKeepAlive() {
  if (keepAliveAudio) return;
  try {
    // 1. Silent HTMLAudioElement (10s WAV loop)
    keepAliveAudio = new Audio();
    keepAliveAudio.src = createSilentWav();
    keepAliveAudio.loop = true;
    keepAliveAudio.volume = 0.001; // near-silent but not zero

    keepAliveAudio.play().catch(() => {
      console.warn('[AudioEngine] Keep-alive play failed — will retry on next interaction');
      keepAliveAudio = null;
    });

    // 2. Silent oscillator keep-alive via Web Audio graph
    startKeepAliveOscillator();

    // 3. Media Session metadata so the OS treats us as a real media app
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: 'Glory Pads',
        artist: 'Glory Pads',
        album: 'Live Session',
      });
      navigator.mediaSession.playbackState = 'playing';
    }

    // 4. Web Locks API — prevent page freeze
    acquireWebLock();

    // 5. Aggressive watchdog (1s) — resume AudioContext + oscillator + audio element
    if (!keepAliveInterval) {
      keepAliveInterval = setInterval(() => {
        if (audioCtx && audioCtx.state === 'suspended') {
          audioCtx.resume().catch(() => {});
        }
        // Re-ensure oscillator is alive
        if (!keepAliveOscillator && audioCtx) {
          startKeepAliveOscillator();
        }
        // Ensure the keep-alive audio element is still playing
        if (keepAliveAudio && keepAliveAudio.paused) {
          keepAliveAudio.play().catch(() => {});
        }
      }, 1000);
    }

    console.log('[AudioEngine] Background keep-alive started (10s buffer + oscillator + Web Locks + 1s watchdog)');
  } catch (e) {
    console.warn('[AudioEngine] Keep-alive setup failed:', e);
    keepAliveAudio = null;
  }
}

export function stopBackgroundKeepAlive() {
  if (keepAliveAudio) {
    keepAliveAudio.pause();
    keepAliveAudio.src = '';
    keepAliveAudio = null;
  }
  stopKeepAliveOscillator();
  releaseWebLock();
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
  console.log('[AudioEngine] Background keep-alive stopped');
}

// ── Pre-render loop patterns into AudioBuffers ──────────────────────────────
// Uses OfflineAudioContext to capture synthesized drum hits into a single buffer
// that can be played with AudioBufferSourceNode.loop = true (OS-level looping,
// no JS timer needed — survives iOS background suspension).

/**
 * Render a loop pattern (loopSteps) into a single AudioBuffer using OfflineAudioContext.
 * For pads with custom imported audio, returns the existing buffer directly.
 */
export async function renderLoopToBuffer(
  padId: string,
  loopSteps: [number, string][],
  bpm: number,
  beatsPerBar: number,
  beatUnit: number,
  loopBars: number,
): Promise<AudioBuffer> {
  // For custom-imported audio buffers, return them directly
  if (customBuffers.has(padId)) {
    return customBuffers.get(padId)!;
  }

  const subsPerBeat = beatUnit === 8 ? 2 : 4;
  const totalSubs = beatsPerBar * subsPerBeat * loopBars;
  const subDuration = 60 / bpm / subsPerBeat; // duration of one subdivision in seconds
  const totalDuration = totalSubs * subDuration;

  // Add a tail so reverb/decay sounds don't clip at the loop boundary
  const tailSeconds = 0.5;
  const renderDuration = totalDuration + tailSeconds;

  const sampleRate = 44100;
  const offline = new OfflineAudioContext(2, Math.ceil(renderDuration * sampleRate), sampleRate);

  // Schedule each hit into the offline context
  for (const [subIndex, soundId] of loopSteps) {
    const hitTime = subIndex * subDuration;
    const fn = soundMap[soundId];
    if (fn) {
      // Route through offline destination
      fn(0.8, offline.destination, hitTime);
    }
  }

  const rendered = await offline.startRendering();

  // Trim to exact loop duration (remove the tail from the loopable region)
  // The caller will use source.loopEnd = totalDuration to handle this
  // We store the full buffer (with tail) so the last hit's decay is audible
  // but the loop point wraps cleanly.

  // Attach metadata so the caller knows the clean loop length
  (rendered as any).__loopDuration = totalDuration;

  return rendered;
}

/**
 * Get the custom AudioBuffer for a pad (if any). Used by loop-engine for
 * custom-imported audio loops.
 */
export function getCustomBuffer(padId: string): AudioBuffer | undefined {
  return customBuffers.get(padId);
}
