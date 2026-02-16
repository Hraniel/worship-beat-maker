// Shared IndexedDB connection for the app
// Single source of truth to avoid version conflicts between stores

const DB_NAME = 'drum-pads-worship';
const DB_VERSION = 2;

let dbPromise: Promise<IDBDatabase> | null = null;

export function getDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('custom-sounds')) {
            db.createObjectStore('custom-sounds');
          }
          if (!db.objectStoreNames.contains('ambient-pads')) {
            db.createObjectStore('ambient-pads');
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => {
          dbPromise = null;
          reject(req.error);
        };
        req.onblocked = () => {
          console.warn('[DB] Database blocked — closing old connections');
          dbPromise = null;
          reject(new Error('IndexedDB blocked'));
        };
      } catch (e) {
        dbPromise = null;
        reject(e);
      }
    });
  }
  return dbPromise;
}

