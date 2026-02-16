export type PadCategory = 'drums' | 'percussion' | 'effects' | 'loops';

export interface PadSound {
  id: string;
  name: string;
  shortName: string;
  category: PadCategory;
  colorVar: string;
  isLoop?: boolean;
  /** Each entry: [subdivisionIndex, soundId] — subdivision 0-15 in a 16th-note grid per bar (or 0-31 for 2-bar patterns) */
  loopSteps?: [number, string][];
  /** Number of bars in this loop pattern (default 1) */
  loopBars?: number;
}

export const defaultPads: PadSound[] = [
  // Row 1 - Drums (one-shots)
  { id: 'kick', name: 'Kick', shortName: 'KCK', category: 'drums', colorVar: '--pad-kick' },
  { id: 'snare', name: 'Snare', shortName: 'SNR', category: 'drums', colorVar: '--pad-snare' },
  { id: 'hihat-closed', name: 'Hi-Hat Closed', shortName: 'HHC', category: 'drums', colorVar: '--pad-hihat' },
  { id: 'hihat-open', name: 'Hi-Hat Open', shortName: 'HHO', category: 'drums', colorVar: '--pad-hihat' },
  // Row 2 - More drums + 2 loops no final
  { id: 'crash', name: 'Crash', shortName: 'CRS', category: 'drums', colorVar: '--pad-crash' },
  { id: 'clap', name: 'Clap', shortName: 'CLP', category: 'percussion', colorVar: '--pad-percussion' },
  {
    id: 'loop-worship-1', name: 'Worship Snap', shortName: 'WSP', category: 'loops', colorVar: '--pad-loops',
    isLoop: true,
    loopBars: 2,
    loopSteps: [
      // Bar 1: 3 kicks only
      [0, 'kick-reverb'], [6, 'kick-reverb'], [12, 'kick-reverb'],
      // Bar 2: 3 kicks + snare on beat 3
      [16, 'kick-reverb'], [22, 'kick-reverb'], [28, 'kick-reverb'],
      [24, 'snare-dry'],
    ],
  },
  {
    id: 'loop-worship-2', name: 'Worship Flow', shortName: 'WFL', category: 'loops', colorVar: '--pad-loops',
    isLoop: true,
    loopSteps: [
      [0, 'kick-reverb'], [6, 'kick-reverb'], [12, 'kick-reverb'],
      [4, 'snare-reverb'], [12, 'snare-reverb'],
      [0, 'shaker'], [2, 'shaker'], [4, 'shaker'], [6, 'shaker'],
      [8, 'shaker'], [10, 'shaker'], [12, 'shaker'], [14, 'shaker'],
      [0, 'finger-snap'], [8, 'finger-snap'],
    ],
  },
  // Pads extras (desbloqueáveis)
  { id: 'ride', name: 'Ride', shortName: 'RDE', category: 'drums', colorVar: '--pad-crash' },
  { id: 'tom-high', name: 'Tom High', shortName: 'TMH', category: 'drums', colorVar: '--pad-tom' },
  { id: 'tom-mid', name: 'Tom Mid', shortName: 'TMM', category: 'drums', colorVar: '--pad-tom' },
  { id: 'tom-low', name: 'Tom Low', shortName: 'TML', category: 'drums', colorVar: '--pad-tom' },
  { id: 'shaker', name: 'Shaker', shortName: 'SHK', category: 'percussion', colorVar: '--pad-percussion' },
  { id: 'finger-snap', name: 'Finger Snap', shortName: 'SNP', category: 'percussion', colorVar: '--pad-percussion' },
  { id: 'kick-reverb', name: 'Kick Reverb', shortName: 'KRV', category: 'drums', colorVar: '--pad-kick' },
  { id: 'snare-reverb', name: 'Snare Reverb', shortName: 'SRV', category: 'drums', colorVar: '--pad-snare' },
  { id: 'riser', name: 'Riser', shortName: 'RSR', category: 'effects', colorVar: '--pad-effects' },
  { id: 'swell', name: 'Swell', shortName: 'SWL', category: 'effects', colorVar: '--pad-effects' },
  { id: 'reverse-cymbal', name: 'Rev Cymbal', shortName: 'RVC', category: 'effects', colorVar: '--pad-effects' },
];

export interface SetlistSong {
  id: string;
  name: string;
  bpm: number;
  timeSignature: string;
  pads: PadSound[];
  padVolumes: Record<string, number>;
  padNames?: Record<string, string>;
  padPans?: Record<string, number>;
  padEffects?: Record<string, any>;
  customSounds?: Record<string, string>;
}

export interface Setlist {
  id: string;
  name: string;
  songs: SetlistSong[];
}
