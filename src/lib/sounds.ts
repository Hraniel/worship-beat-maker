export type PadCategory = 'drums' | 'percussion' | 'effects' | 'loops';

export interface PadSound {
  id: string;
  name: string;
  shortName: string;
  category: PadCategory;
  colorVar: string;
  isLoop?: boolean;
  /** Each entry: [subdivisionIndex, soundId] — subdivision 0-15 in a 16th-note grid per bar */
  loopSteps?: [number, string][];
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
    id: 'loop-rock', name: 'Rock Beat', shortName: 'RCK', category: 'loops', colorVar: '--pad-loops',
    isLoop: true,
    loopSteps: [
      [0, 'kick'], [8, 'kick'],
      [4, 'snare'], [12, 'snare'],
      [0, 'hihat-closed'], [2, 'hihat-closed'], [4, 'hihat-closed'], [6, 'hihat-closed'],
      [8, 'hihat-closed'], [10, 'hihat-closed'], [12, 'hihat-closed'], [14, 'hihat-closed'],
    ],
  },
  {
    id: 'loop-ballad', name: 'Ballad', shortName: 'BLD', category: 'loops', colorVar: '--pad-loops',
    isLoop: true,
    loopSteps: [
      [0, 'kick'], [10, 'kick'],
      [8, 'snare'],
      [0, 'shaker'], [2, 'shaker'], [4, 'shaker'], [6, 'shaker'],
      [8, 'shaker'], [10, 'shaker'], [12, 'shaker'], [14, 'shaker'],
    ],
  },
  // Pads extras (desbloqueáveis)
  { id: 'ride', name: 'Ride', shortName: 'RDE', category: 'drums', colorVar: '--pad-crash' },
  { id: 'tom-high', name: 'Tom High', shortName: 'TMH', category: 'drums', colorVar: '--pad-tom' },
  { id: 'tom-mid', name: 'Tom Mid', shortName: 'TMM', category: 'drums', colorVar: '--pad-tom' },
  { id: 'tom-low', name: 'Tom Low', shortName: 'TML', category: 'drums', colorVar: '--pad-tom' },
  { id: 'shaker', name: 'Shaker', shortName: 'SHK', category: 'percussion', colorVar: '--pad-percussion' },
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
