const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_MAP: Record<string, string> = {
  'Db': 'C#', 'Eb': 'D#', 'Fb': 'E', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#', 'Cb': 'B',
};
const SHARP_TO_FLAT: Record<string, string> = {
  'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb',
};

/**
 * Transpose a key string by a number of semitones.
 * Supports formats like "C", "C#", "Db", "C major", "Am", "F# minor" etc.
 */
export function transposeKey(key: string, semitones: number): string {
  if (!key || semitones === 0) return key;
  
  // Parse the root note and suffix (e.g. "major", "minor", "m")
  const match = key.match(/^([A-G][#b]?)\s*(.*)/);
  if (!match) return key;
  
  const [, root, suffix] = match;
  const useFlats = root.includes('b');
  
  // Normalize to sharp
  const normalizedRoot = FLAT_MAP[root] || root;
  const idx = NOTES.indexOf(normalizedRoot);
  if (idx === -1) return key;
  
  const newIdx = ((idx + semitones) % 12 + 12) % 12;
  let newRoot = NOTES[newIdx];
  
  // If original used flats, convert back
  if (useFlats && SHARP_TO_FLAT[newRoot]) {
    newRoot = SHARP_TO_FLAT[newRoot];
  }
  
  return suffix ? `${newRoot} ${suffix}` : newRoot;
}
