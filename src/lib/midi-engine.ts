// ── MIDI Engine ─────────────────────────────────────────────────────────────
// Centralises Web MIDI API access, channel filtering, note mapping and Learn mode.

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

function collectDevices(): MidiDevice[] {
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

function handleMidiMessage(e: MIDIMessageEvent) {
  const data = e.data;
  if (!data || data.length < 3) return;

  const status = data[0];
  const msgChannel = (status & 0x0f) + 1; // 1-16
  const type = status & 0xf0;
  const note = data[1];
  const velocity = data[2];

  // Note On: filter by note channel
  if (type === 0x90 && velocity > 0) {
    if (channel !== 'all' && msgChannel !== channel) return;
    // Learn mode: capture note and return
    if (learnPadId) {
      mappings[note] = learnPadId;
      saveMappings(mappings);
      learnCb?.(note);
      learnPadId = null;
      learnCb = null;
      return;
    }

    const padId = mappings[note];
    if (padId) {
      noteOnCb?.(padId, velocity / 127);
    }
  }

  // Control Change (CC): filter by CC channel
  if (type === 0xb0) {
    if (ccChannel !== 'all' && msgChannel !== ccChannel) return;
    // CC Learn mode: capture CC number and return
    if (ccLearnFunctionId) {
      // Remove any existing mapping for this function
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

    ccCb?.(note, velocity, msgChannel); // note = CC number, velocity = CC value
  }
}

function bindInputs() {
  if (!midiAccess) return;
  midiAccess.inputs.forEach((input) => {
    input.onmidimessage = handleMidiMessage;
  });
}

// ── Public API ──────────────────────────────────────────────────────────────

export function isMidiSupported(): boolean {
  try {
    return typeof navigator !== 'undefined' && typeof (navigator as any).requestMIDIAccess === 'function';
  } catch {
    return false;
  }
}

export async function initMidi(): Promise<boolean> {
  if (!isMidiSupported()) {
    console.warn('MIDI not supported in this browser');
    return false;
  }
  try {
    midiAccess = await navigator.requestMIDIAccess({ sysex: false });
    console.log("MIDI enabled:", midiAccess);
    bindInputs();

    midiAccess.onstatechange = () => {
      bindInputs();
      deviceChangeCb?.(collectDevices());
    };

    deviceChangeCb?.(collectDevices());
    return true;
  } catch (err) {
    console.error("MIDI failed:", err);
    return false;
  }
}

export function getConnectedDevices(): MidiDevice[] {
  return collectDevices();
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
