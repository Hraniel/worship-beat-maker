// Per-pad audio effects chain: EQ (3-band), Reverb (convolver), Delay
import { getAudioContext, getMasterGain } from './audio-engine';

export interface PadEffects {
  eqLow: number;   // -12 to 12 dB
  eqMid: number;   // -12 to 12 dB
  eqHigh: number;  // -12 to 12 dB
  reverb: number;   // 0 to 1 (dry/wet)
  delay: number;    // 0 to 1 (dry/wet)
  delayTime: number; // 0.1 to 1.0 seconds
}

export const DEFAULT_EFFECTS: PadEffects = {
  eqLow: 0,
  eqMid: 0,
  eqHigh: 0,
  reverb: 0,
  delay: 0,
  delayTime: 0.3,
};

// Convolver impulse response (synthetic reverb)
let reverbBuffer: AudioBuffer | null = null;

function getReverbBuffer(): AudioBuffer {
  if (reverbBuffer) return reverbBuffer;
  const ctx = getAudioContext();
  const len = ctx.sampleRate * 2; // 2 second reverb
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
    }
  }
  reverbBuffer = buf;
  return buf;
}

// Per-pad effect chains cached
interface EffectChain {
  input: GainNode;
  eqLow: BiquadFilterNode;
  eqMid: BiquadFilterNode;
  eqHigh: BiquadFilterNode;
  dryGain: GainNode;
  reverbSend: GainNode;
  convolver: ConvolverNode;
  reverbGain: GainNode;
  delaySend: GainNode;
  delayNode: DelayNode;
  delayFeedback: GainNode;
  delayGain: GainNode;
}

const chains = new Map<string, EffectChain>();

function createChain(padId: string): EffectChain {
  const ctx = getAudioContext();
  const master = getMasterGain();

  // Input
  const input = ctx.createGain();

  // EQ: low shelf, mid peaking, high shelf
  const eqLow = ctx.createBiquadFilter();
  eqLow.type = 'lowshelf';
  eqLow.frequency.value = 320;
  eqLow.gain.value = 0;

  const eqMid = ctx.createBiquadFilter();
  eqMid.type = 'peaking';
  eqMid.frequency.value = 1000;
  eqMid.Q.value = 1;
  eqMid.gain.value = 0;

  const eqHigh = ctx.createBiquadFilter();
  eqHigh.type = 'highshelf';
  eqHigh.frequency.value = 3200;
  eqHigh.gain.value = 0;

  // Chain EQ
  input.connect(eqLow);
  eqLow.connect(eqMid);
  eqMid.connect(eqHigh);

  // Dry path
  const dryGain = ctx.createGain();
  dryGain.gain.value = 1;
  eqHigh.connect(dryGain);
  dryGain.connect(master);

  // Reverb send
  const reverbSend = ctx.createGain();
  reverbSend.gain.value = 0;
  const convolver = ctx.createConvolver();
  convolver.buffer = getReverbBuffer();
  const reverbGain = ctx.createGain();
  reverbGain.gain.value = 1;
  eqHigh.connect(reverbSend);
  reverbSend.connect(convolver);
  convolver.connect(reverbGain);
  reverbGain.connect(master);

  // Delay send
  const delaySend = ctx.createGain();
  delaySend.gain.value = 0;
  const delayNode = ctx.createDelay(2);
  delayNode.delayTime.value = 0.3;
  const delayFeedback = ctx.createGain();
  delayFeedback.gain.value = 0.35;
  const delayGain = ctx.createGain();
  delayGain.gain.value = 1;

  eqHigh.connect(delaySend);
  delaySend.connect(delayNode);
  delayNode.connect(delayFeedback);
  delayFeedback.connect(delayNode); // feedback loop
  delayNode.connect(delayGain);
  delayGain.connect(master);

  const chain: EffectChain = {
    input, eqLow, eqMid, eqHigh,
    dryGain, reverbSend, convolver, reverbGain,
    delaySend, delayNode, delayFeedback, delayGain,
  };
  chains.set(padId, chain);
  return chain;
}

export function getEffectInput(padId: string): GainNode {
  const chain = chains.get(padId) || createChain(padId);
  return chain.input;
}

export function applyEffects(padId: string, fx: PadEffects) {
  const chain = chains.get(padId) || createChain(padId);
  const ctx = getAudioContext();
  const t = ctx.currentTime;

  chain.eqLow.gain.setValueAtTime(fx.eqLow, t);
  chain.eqMid.gain.setValueAtTime(fx.eqMid, t);
  chain.eqHigh.gain.setValueAtTime(fx.eqHigh, t);

  // Reverb wet/dry
  chain.reverbSend.gain.setValueAtTime(fx.reverb, t);
  chain.dryGain.gain.setValueAtTime(1 - fx.reverb * 0.5, t);

  // Delay wet/dry
  chain.delaySend.gain.setValueAtTime(fx.delay, t);
  chain.delayNode.delayTime.setValueAtTime(fx.delayTime, t);
}

export function hasActiveEffects(fx: PadEffects): boolean {
  return fx.eqLow !== 0 || fx.eqMid !== 0 || fx.eqHigh !== 0 || fx.reverb > 0 || fx.delay > 0;
}

// Persistence
const FX_STORAGE_KEY = 'drum-pads-effects';

export function loadAllEffects(): Record<string, PadEffects> {
  try {
    const data = localStorage.getItem(FX_STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch { return {}; }
}

export function saveAllEffects(all: Record<string, PadEffects>) {
  localStorage.setItem(FX_STORAGE_KEY, JSON.stringify(all));
}
