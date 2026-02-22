// ── MIDI Engine ─────────────────────────────────────────────────────────────
// Centralises Web MIDI API access, channel filtering, note mapping and Learn mode.

export interface MidiDevice {
  id: string;
  name: string;
  manufacturer: string;
}

export type MidiChannel = 'all' | number; // 1-16

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

const LS_CHANNEL = 'midi-channel';
const LS_MAPPINGS = 'midi-mappings';

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

let midiAccess: MIDIAccess | null = null;
let channel: MidiChannel = loadChannel();
let mappings: Record<number, string> = loadMappings();

let noteOnCb: NoteOnCallback | null = null;
let ccCb: CCCallback | null = null;
let deviceChangeCb: DeviceChangeCallback | null = null;

// Learn mode
let learnPadId: string | null = null;
let learnCb: LearnCallback | null = null;

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

  // Channel filter
  if (channel !== 'all' && msgChannel !== channel) return;

  // Note On (velocity 0 = Note Off)
  if (type === 0x90 && velocity > 0) {
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

  // Control Change (CC)
  if (type === 0xb0) {
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

// Learn mode
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
