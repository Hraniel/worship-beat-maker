// Shared IndexedDB connection for the app
// Single source of truth to avoid version conflicts between stores

const DB_NAME = 'drum-pads-worship';
const DB_VERSION = 2;

let dbPromise: Promise<IDBDatabase> | null = null;

export function getDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      try {
        console.log('[DB] Opening IndexedDB...', DB_NAME, 'v' + DB_VERSION);
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (event) => {
          console.log('[DB] Upgrade needed, oldVersion:', (event as any).oldVersion);
          const db = req.result;
          if (!db.objectStoreNames.contains('custom-sounds')) {
            db.createObjectStore('custom-sounds');
          }
          if (!db.objectStoreNames.contains('ambient-pads')) {
            db.createObjectStore('ambient-pads');
          }
        };
        req.onsuccess = () => {
          console.log('[DB] IndexedDB opened OK');
          resolve(req.result);
        };
        req.onerror = () => {
          console.error('[DB] IndexedDB open error:', req.error);
          dbPromise = null;
          reject(req.error);
        };
        req.onblocked = () => {
          console.warn('[DB] Database blocked — closing old connections');
          dbPromise = null;
          reject(new Error('IndexedDB blocked'));
        };
      } catch (e) {
        console.error('[DB] IndexedDB open exception:', e);
        dbPromise = null;
        reject(e);
      }
    });
  }
  return dbPromise;
}

