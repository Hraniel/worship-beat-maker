// ── MIDI Engine ─────────────────────────────────────────────────────────────
// Centralises MIDI access with dual-mode support:
// 1. Web MIDI API (browsers like Chrome)
// 2. Capacitor native plugin (Android app from Play Store)

import { Capacitor } from '@capacitor/core';

export interface MidiDevice {
  id: string;
  name: string;
  manufacturer: string;
}

export type MidiChannel = 'all' | number; // 1-16

// ── CC Function IDs ─────────────────────────────────────────────────────────
export type CCFunctionId =
  | 'master-volume'
  | 'metronome-volume'
  | 'bpm'
  | 'metronome-toggle'
  | 'prev-song'
  | 'next-song'
  | `pad-volume-${string}`; // e.g. pad-volume-kick

export const CC_FUNCTIONS: { id: CCFunctionId; label: string }[] = [
  { id: 'master-volume', label: 'Volume Master' },
  { id: 'metronome-volume', label: 'Volume do Metrônomo' },
  { id: 'bpm', label: 'BPM (40–240)' },
  { id: 'metronome-toggle', label: 'Play/Pause Metrônomo' },
  { id: 'prev-song', label: 'Música Anterior' },
  { id: 'next-song', label: 'Próxima Música' },
];

// Default General MIDI mapping: note number → pad id
const DEFAULT_MAPPINGS: Record<number, string> = {
  36: 'kick',
  38: 'snare',
  42: 'hihat-closed',
  46: 'hihat-open',
  49: 'crash',
  39: 'clap',
  51: 'ride',
  45: 'loop-worship-1',
  47: 'loop-worship-2',
};

// Default CC mappings: CC number → function id
const DEFAULT_CC_MAPPINGS: Record<number, CCFunctionId> = {
  7: 'master-volume',
  10: 'metronome-volume',
  20: 'bpm',
  21: 'metronome-toggle',
  22: 'prev-song',
  23: 'next-song',
};

const LS_CHANNEL = 'midi-channel';
const LS_CC_CHANNEL = 'midi-cc-channel';
const LS_MAPPINGS = 'midi-mappings';
const LS_CC_MAPPINGS = 'midi-cc-mappings';

// ── Helpers ─────────────────────────────────────────────────────────────────

function loadChannel(): MidiChannel {
  try {
    const raw = localStorage.getItem(LS_CHANNEL);
    if (!raw || raw === 'all') return 'all';
    const n = Number(raw);
    return n >= 1 && n <= 16 ? n : 'all';
  } catch {
    return 'all';
  }
}

function saveChannel(ch: MidiChannel) {
  localStorage.setItem(LS_CHANNEL, String(ch));
}

function loadCCChannel(): MidiChannel {
  try {
    const raw = localStorage.getItem(LS_CC_CHANNEL);
    if (!raw || raw === 'all') return 'all';
    const n = Number(raw);
    return n >= 1 && n <= 16 ? n : 'all';
  } catch {
    return 'all';
  }
}

function saveCCChannel(ch: MidiChannel) {
  localStorage.setItem(LS_CC_CHANNEL, String(ch));
}

function loadMappings(): Record<number, string> {
  try {
    const raw = localStorage.getItem(LS_MAPPINGS);
    if (!raw) return { ...DEFAULT_MAPPINGS };
    return JSON.parse(raw);
  } catch {
    return { ...DEFAULT_MAPPINGS };
  }
}

function saveMappings(m: Record<number, string>) {
  localStorage.setItem(LS_MAPPINGS, JSON.stringify(m));
}

function loadCCMappings(): Record<number, CCFunctionId> {
  try {
    const raw = localStorage.getItem(LS_CC_MAPPINGS);
    if (!raw) return { ...DEFAULT_CC_MAPPINGS };
    return JSON.parse(raw);
  } catch {
    return { ...DEFAULT_CC_MAPPINGS };
  }
}

function saveCCMappings(m: Record<number, CCFunctionId>) {
  localStorage.setItem(LS_CC_MAPPINGS, JSON.stringify(m));
}

export function midiNoteToName(note: number): string {
  if (note >= 1000) return `CC ${note - 1000}`;
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(note / 12) - 1;
  return `${names[note % 12]}${octave}`;
}

// ── Engine singleton ────────────────────────────────────────────────────────

type NoteOnCallback = (padId: string, velocity: number) => void;
type CCCallback = (cc: number, value: number, channel: number) => void;
type DeviceChangeCallback = (devices: MidiDevice[]) => void;
type LearnCallback = (note: number) => void;
type CCLearnCallback = (cc: number) => void;

let midiAccess: MIDIAccess | null = null;
let channel: MidiChannel = loadChannel();
let ccChannel: MidiChannel = loadCCChannel();
let mappings: Record<number, string> = loadMappings();
let ccMappings: Record<number, CCFunctionId> = loadCCMappings();

let noteOnCb: NoteOnCallback | null = null;
let ccCb: CCCallback | null = null;
let deviceChangeCb: DeviceChangeCallback | null = null;

// Note Learn mode
let learnPadId: string | null = null;
let learnCb: LearnCallback | null = null;

// CC Learn mode
let ccLearnFunctionId: CCFunctionId | null = null;
let ccLearnCb: CCLearnCallback | null = null;

// Capacitor native plugin listener cleanup
let nativeListenerCleanup: (() => void) | null = null;

// ── Detect which MIDI backend to use ────────────────────────────────────────

type MidiBackend = 'native' | 'webmidi' | 'none';

function detectBackend(): MidiBackend {
  // On native Android/iOS Capacitor app → use native plugin
  if (Capacitor.isNativePlatform()) {
    return 'native';
  }
  // In browser with Web MIDI support
  if (typeof navigator !== 'undefined' && typeof (navigator as any).requestMIDIAccess === 'function') {
    return 'webmidi';
  }
  return 'none';
}

let activeBackend: MidiBackend = 'none';

// ── Shared message handler (used by both backends) ──────────────────────────

function handleMidiData(status: number, data1: number, data2: number) {
  const msgChannel = (status & 0x0f) + 1; // 1-16
  const type = status & 0xf0;
  const note = data1;
  const velocity = data2;

  // Note On
  if (type === 0x90 && velocity > 0) {
    // Learn mode: capture note regardless of channel
    if (learnPadId) {
      mappings[note] = learnPadId;
      saveMappings(mappings);
      learnCb?.(note);
      learnPadId = null;
      learnCb = null;
      return;
    }

    if (channel !== 'all' && msgChannel !== channel) return;

    const padId = mappings[note];
    if (padId) {
      noteOnCb?.(padId, velocity / 127);
    }
  }

  // CC during note learn → map CC as pseudo-note
  if (type === 0xb0 && learnPadId) {
    const pseudoNote = 1000 + note;
    mappings[pseudoNote] = learnPadId;
    saveMappings(mappings);
    learnCb?.(pseudoNote);
    learnPadId = null;
    learnCb = null;
    return;
  }

  // Control Change (CC)
  if (type === 0xb0 && !learnPadId) {
    if (ccChannel !== 'all' && msgChannel !== ccChannel) return;

    // CC Learn mode
    if (ccLearnFunctionId) {
      for (const [key, val] of Object.entries(ccMappings)) {
        if (val === ccLearnFunctionId) {
          delete ccMappings[Number(key)];
        }
      }
      ccMappings[note] = ccLearnFunctionId;
      saveCCMappings(ccMappings);
      ccLearnCb?.(note);
      ccLearnFunctionId = null;
      ccLearnCb = null;
      return;
    }

    // Check if CC is mapped as pad trigger
    const pseudoNote = 1000 + note;
    const padId = mappings[pseudoNote];
    if (padId && velocity > 0) {
      noteOnCb?.(padId, velocity / 127);
      return;
    }

    ccCb?.(note, velocity, msgChannel);
  }
}

// ── Web MIDI backend ────────────────────────────────────────────────────────

function handleWebMidiMessage(e: MIDIMessageEvent) {
  const data = e.data;
  if (!data || data.length < 3) return;
  handleMidiData(data[0], data[1], data[2]);
}

function collectDevicesWebMidi(): MidiDevice[] {
  if (!midiAccess) return [];
  const devices: MidiDevice[] = [];
  midiAccess.inputs.forEach((input) => {
    devices.push({
      id: input.id,
      name: input.name || 'Unknown',
      manufacturer: input.manufacturer || '',
    });
  });
  return devices;
}

function bindInputs() {
  if (!midiAccess) return;
  midiAccess.inputs.forEach((input) => {
    input.onmidimessage = handleWebMidiMessage;
  });
}

async function initWebMidi(): Promise<boolean> {
  try {
    midiAccess = await navigator.requestMIDIAccess({ sysex: false });
    console.log('MIDI enabled (Web MIDI):', midiAccess);
    bindInputs();

    midiAccess.onstatechange = () => {
      bindInputs();
      deviceChangeCb?.(collectDevicesWebMidi());
    };

    deviceChangeCb?.(collectDevicesWebMidi());
    return true;
  } catch (err) {
    console.error('Web MIDI failed:', err);
    return false;
  }
}

// ── Native Capacitor backend ────────────────────────────────────────────────

async function initNativeMidi(): Promise<boolean> {
  try {
    const { default: CapacitorMidi } = await import('@/plugins/capacitor-midi');

    // Listen for MIDI messages from native
    const msgListener = await CapacitorMidi.addListener('midiMessage', (event) => {
      handleMidiData(event.status, event.data1, event.data2);
    });

    // Listen for device changes
    const devListener = await CapacitorMidi.addListener('deviceChange', (event) => {
      const devices: MidiDevice[] = event.devices || [];
      deviceChangeCb?.(devices);
    });

    // Start native MIDI scanning
    await CapacitorMidi.start();

    // Get initial devices
    const { devices } = await CapacitorMidi.getDevices();
    deviceChangeCb?.(devices || []);

    // Store cleanup
    nativeListenerCleanup = () => {
      msgListener.remove();
      devListener.remove();
      CapacitorMidi.stop();
    };

    console.log('MIDI enabled (Native Capacitor)');
    return true;
  } catch (err) {
    console.error('Native MIDI failed:', err);
    return false;
  }
}

function collectDevicesNative(): MidiDevice[] {
  // For native, devices are pushed via events; return empty for sync call
  // The actual devices are delivered asynchronously via deviceChange listener
  return [];
}

// ── Public API ──────────────────────────────────────────────────────────────

export function isMidiSupported(): boolean {
  return detectBackend() !== 'none';
}

export function getMidiBackend(): MidiBackend {
  return activeBackend;
}

export async function initMidi(): Promise<boolean> {
  const backend = detectBackend();
  if (backend === 'none') {
    console.warn('MIDI not supported on this platform');
    return false;
  }

  activeBackend = backend;

  if (backend === 'native') {
    return initNativeMidi();
  }
  return initWebMidi();
}

export function getConnectedDevices(): MidiDevice[] {
  if (activeBackend === 'webmidi') return collectDevicesWebMidi();
  // Native devices are delivered via events
  return [];
}

export function getChannel(): MidiChannel {
  return channel;
}

export function setChannel(ch: MidiChannel) {
  channel = ch;
  saveChannel(ch);
}

export function getCCChannel(): MidiChannel {
  return ccChannel;
}

export function setCCChannel(ch: MidiChannel) {
  ccChannel = ch;
  saveCCChannel(ch);
}

export function getMappings(): Record<number, string> {
  return { ...mappings };
}

export function setMapping(note: number, padId: string) {
  mappings[note] = padId;
  saveMappings(mappings);
}

export function resetMappings() {
  mappings = { ...DEFAULT_MAPPINGS };
  saveMappings(mappings);
}

/** Bulk-replace all note mappings (used when loading a song) */
export function setAllMappings(m: Record<number, string>) {
  mappings = { ...m };
  saveMappings(mappings);
}

/** Bulk-replace all CC mappings (used when loading a song) */
export function setAllCCMappings(m: Record<number, CCFunctionId>) {
  ccMappings = { ...m };
  saveCCMappings(ccMappings);
}

export function removeMapping(note: number) {
  delete mappings[note];
  saveMappings(mappings);
}

export function removeCCMapping(cc: number) {
  delete ccMappings[cc];
  saveCCMappings(ccMappings);
}

export function getDefaultMappings(): Record<number, string> {
  return { ...DEFAULT_MAPPINGS };
}

// ── CC Mappings ─────────────────────────────────────────────────────────────

export function getCCMappings(): Record<number, CCFunctionId> {
  return { ...ccMappings };
}

export function setCCMapping(cc: number, functionId: CCFunctionId) {
  ccMappings[cc] = functionId;
  saveCCMappings(ccMappings);
}

export function resetCCMappings() {
  ccMappings = { ...DEFAULT_CC_MAPPINGS };
  saveCCMappings(ccMappings);
}

export function getCCFunctionForCC(cc: number): CCFunctionId | undefined {
  return ccMappings[cc];
}

export function findCCForFunction(functionId: CCFunctionId): number | null {
  for (const [cc, id] of Object.entries(ccMappings)) {
    if (id === functionId) return Number(cc);
  }
  return null;
}

// ── Note Learn mode ─────────────────────────────────────────────────────────

export function startLearn(padId: string, callback: LearnCallback) {
  learnPadId = padId;
  learnCb = callback;
}

export function stopLearn() {
  learnPadId = null;
  learnCb = null;
}

export function isLearning(): boolean {
  return learnPadId !== null;
}

export function getLearningPadId(): string | null {
  return learnPadId;
}

// ── CC Learn mode ───────────────────────────────────────────────────────────

export function startCCLearn(functionId: CCFunctionId, callback: CCLearnCallback) {
  ccLearnFunctionId = functionId;
  ccLearnCb = callback;
}

export function stopCCLearn() {
  ccLearnFunctionId = null;
  ccLearnCb = null;
}

export function isCCLearning(): boolean {
  return ccLearnFunctionId !== null;
}

export function getCCLearningFunctionId(): CCFunctionId | null {
  return ccLearnFunctionId;
}

// Callbacks
export function onNoteOn(cb: NoteOnCallback) {
  noteOnCb = cb;
}

export function onDeviceChange(cb: DeviceChangeCallback) {
  deviceChangeCb = cb;
}

export function onCC(cb: CCCallback) {
  ccCb = cb;
}
