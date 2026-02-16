// IndexedDB storage for custom audio samples

const DB_NAME = 'drum-pads-worship';
const DB_VERSION = 1;
const STORE_NAME = 'custom-sounds';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveCustomSound(padId: string, arrayBuffer: ArrayBuffer, fileName: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({ buffer: arrayBuffer, fileName }, padId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCustomSound(padId: string): Promise<{ buffer: ArrayBuffer; fileName: string } | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(padId);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteCustomSound(padId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(padId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllCustomSoundIds(): Promise<string[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAllKeys();
    req.onsuccess = () => resolve((req.result as string[]).filter(k => !k.startsWith('song:')));
    req.onerror = () => reject(req.error);
  });
}

// --- Song-scoped custom sounds ---

function songKey(songId: string, padId: string): string {
  return `song:${songId}:${padId}`;
}

/** Save all current global custom sounds as song-scoped copies */
export async function saveCustomSoundsForSong(songId: string, padIds: string[]): Promise<void> {
  const db = await openDB();
  for (const padId of padIds) {
    const data = await getCustomSound(padId);
    if (data) {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put({ buffer: data.buffer, fileName: data.fileName }, songKey(songId, padId));
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }
  }
}

/** Load song-scoped custom sounds back into global keys and audio engine */
export async function loadCustomSoundsForSong(songId: string, padIds: string[]): Promise<Record<string, { buffer: ArrayBuffer; fileName: string }>> {
  const db = await openDB();
  const result: Record<string, { buffer: ArrayBuffer; fileName: string }> = {};
  for (const padId of padIds) {
    const data = await new Promise<{ buffer: ArrayBuffer; fileName: string } | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(songKey(songId, padId));
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    if (data) {
      // Also save to global key so audio engine can use it
      await saveCustomSound(padId, data.buffer, data.fileName);
      result[padId] = data;
    }
  }
  return result;
}

/** Delete song-scoped custom sounds */
export async function deleteCustomSoundsForSong(songId: string): Promise<void> {
  const db = await openDB();
  const allKeys = await new Promise<string[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAllKeys();
    req.onsuccess = () => resolve(req.result as string[]);
    req.onerror = () => reject(req.error);
  });
  const prefix = `song:${songId}:`;
  const toDelete = allKeys.filter(k => k.startsWith(prefix));
  for (const key of toDelete) {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}
