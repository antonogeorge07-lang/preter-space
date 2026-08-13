// Offline message queue — persisted to localStorage
const QUEUE_KEY = 'vivaloca_offline_queue';

export function enqueue(item) {
  const q = getQueue();
  q.push({ ...item, _id: Date.now() + Math.random(), _ts: Date.now() });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

export function getQueue() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch { return []; }
}

export function removeFromQueue(id) {
  const q = getQueue().filter(i => i._id !== id);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

export function clearQueue() {
  localStorage.removeItem(QUEUE_KEY);
}

// Flush pending messages when back online
export async function flushQueue(sendFn) {
  const q = getQueue();
  if (!q.length) return;
  for (const item of q) {
    try {
      await sendFn(item);
      removeFromQueue(item._id);
    } catch {
      break; // stop if still offline
    }
  }
}