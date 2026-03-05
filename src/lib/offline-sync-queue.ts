// Offline sync queue — stores pending Supabase operations and replays them when online

const QUEUE_KEY = 'app_offline_sync_queue';

export interface QueuedOperation {
  id: string;
  table: string;
  action: 'insert' | 'update' | 'delete' | 'upsert';
  payload: Record<string, any>;
  filters?: Record<string, any>; // eq filters for update/delete
  createdAt: number;
}

export function getQueue(): QueuedOperation[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function enqueue(op: Omit<QueuedOperation, 'id' | 'createdAt'>) {
  const queue = getQueue();
  queue.push({ ...op, id: crypto.randomUUID(), createdAt: Date.now() });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function clearQueue() {
  localStorage.removeItem(QUEUE_KEY);
}

export function removeFromQueue(id: string) {
  const queue = getQueue().filter(q => q.id !== id);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function flushQueue(supabase: any): Promise<number> {
  const queue = getQueue();
  if (queue.length === 0) return 0;

  let synced = 0;
  for (const op of queue) {
    try {
      let query: any;
      if (op.action === 'insert') {
        query = supabase.from(op.table).insert(op.payload);
      } else if (op.action === 'update') {
        query = supabase.from(op.table).update(op.payload);
        if (op.filters) {
          for (const [k, v] of Object.entries(op.filters)) {
            query = query.eq(k, v);
          }
        }
      } else if (op.action === 'delete') {
        query = supabase.from(op.table).delete();
        if (op.filters) {
          for (const [k, v] of Object.entries(op.filters)) {
            query = query.eq(k, v);
          }
        }
      }
      const { error } = await query;
      if (error) {
        console.warn('[OFFLINE-SYNC] Failed to sync op:', op.id, error.message);
        continue; // keep in queue
      }
      removeFromQueue(op.id);
      synced++;
    } catch (e) {
      console.warn('[OFFLINE-SYNC] Exception syncing op:', op.id, e);
    }
  }

  if (synced > 0) {
    console.log(`[OFFLINE-SYNC] Synced ${synced}/${queue.length} operations`);
  }
  return synced;
}
