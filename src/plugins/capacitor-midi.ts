import { registerPlugin } from '@capacitor/core';

export interface MidiDeviceInfo {
  id: string;
  name: string;
  manufacturer: string;
}

export interface MidiMessageEvent {
  /** MIDI status byte */
  status: number;
  /** First data byte (note number or CC number) */
  data1: number;
  /** Second data byte (velocity or CC value) */
  data2: number;
  /** MIDI channel 1-16 */
  channel: number;
}

export interface CapacitorMidiPlugin {
  /** Start scanning and listening for MIDI devices */
  start(): Promise<void>;
  /** Stop listening */
  stop(): Promise<void>;
  /** Get currently connected MIDI devices */
  getDevices(): Promise<{ devices: MidiDeviceInfo[] }>;
  /** Add listener for MIDI messages */
  addListener(
    eventName: 'midiMessage',
    listener: (event: MidiMessageEvent) => void
  ): Promise<{ remove: () => void }>;
  /** Add listener for device connection changes */
  addListener(
    eventName: 'deviceChange',
    listener: (event: { devices: MidiDeviceInfo[] }) => void
  ): Promise<{ remove: () => void }>;
}

const CapacitorMidi = registerPlugin<CapacitorMidiPlugin>('CapacitorMidi');

export default CapacitorMidi;
