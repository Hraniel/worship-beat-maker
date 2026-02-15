export type PadCategory = 'drums' | 'percussion' | 'effects' | 'loops';

export interface PadSound {
  id: string;
  name: string;
  shortName: string;
  category: PadCategory;
  colorVar: string;
  isLoop?: boolean;
  loopPattern?: number[]; // beat subdivisions where sound plays (0-indexed within a bar)
}

export const defaultPads: PadSound[] = [
  // Row 1 - Drums
  { id: 'kick', name: 'Kick', shortName: 'KCK', category: 'drums', colorVar: '--pad-kick' },
  { id: 'snare', name: 'Snare', shortName: 'SNR', category: 'drums', colorVar: '--pad-snare' },
  { id: 'hihat-closed', name: 'Hi-Hat Closed', shortName: 'HHC', category: 'drums', colorVar: '--pad-hihat' },
  { id: 'hihat-open', name: 'Hi-Hat Open', shortName: 'HHO', category: 'drums', colorVar: '--pad-hihat' },
  // Row 2 - More Drums
  { id: 'crash', name: 'Crash', shortName: 'CRS', category: 'drums', colorVar: '--pad-crash' },
  { id: 'ride', name: 'Ride', shortName: 'RDE', category: 'drums', colorVar: '--pad-crash' },
  { id: 'tom-high', name: 'Tom High', shortName: 'TMH', category: 'drums', colorVar: '--pad-tom' },
  { id: 'tom-mid', name: 'Tom Mid', shortName: 'TMM', category: 'drums', colorVar: '--pad-tom' },
  // Row 3 - Percussion
  { id: 'tom-low', name: 'Tom Low', shortName: 'TML', category: 'drums', colorVar: '--pad-tom' },
  { id: 'clap', name: 'Clap', shortName: 'CLP', category: 'percussion', colorVar: '--pad-percussion' },
  { id: 'shaker', name: 'Shaker', shortName: 'SHK', category: 'percussion', colorVar: '--pad-percussion' },
  { id: 'riser', name: 'Riser', shortName: 'RSR', category: 'effects', colorVar: '--pad-effects' },
  // Row 4 - Effects & Loops
  { id: 'swell', name: 'Swell', shortName: 'SWL', category: 'effects', colorVar: '--pad-effects' },
  { id: 'reverse-cymbal', name: 'Rev Cymbal', shortName: 'RVC', category: 'effects', colorVar: '--pad-effects' },
  {
    id: 'loop-rock', name: 'Rock Loop', shortName: 'RCK', category: 'loops', colorVar: '--pad-loops',
    isLoop: true, loopPattern: [0, 0, 4, 0, 8, 0, 12, 0] // kick on 1,3 snare on 2,4
  },
  {
    id: 'loop-ballad', name: 'Ballad Loop', shortName: 'BLD', category: 'loops', colorVar: '--pad-loops',
    isLoop: true, loopPattern: [0, 4, 8, 12]
  },
];

export interface SetlistSong {
  id: string;
  name: string;
  bpm: number;
  timeSignature: string;
  pads: PadSound[];
  padVolumes: Record<string, number>;
}

export interface Setlist {
  id: string;
  name: string;
  songs: SetlistSong[];
}
