// modules/storage.js
import { categoryKeyFromValue } from './i18n.js';

const EVENTS_KEY = 'tplEvents';
const PENDING_KEY = 'tplPending';

// read events saved locally
export function readLocal() {
  try {
    return JSON.parse(localStorage.getItem(EVENTS_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

// write events local
export function writeLocal(events) {
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events || []));
}

// push to pending queue for sync
export function pushPending(action, payload) {
  const q = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
  q.push({ action, payload, ts: Date.now() });
  localStorage.setItem(PENDING_KEY, JSON.stringify(q));
}

// read pending
export function readPending() {
  return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
}

// clear pending after send
export function clearPending() {
  localStorage.removeItem(PENDING_KEY);
}

/**
 * Sync pending operations to server (simple implementation).
 * PROXY_URL required.
 */
export async function syncPending(PROXY_URL) {
  const q = readPending();
  if (!q.length) return;
  for (const item of q) {
    try {
      if (item.action === 'patch') {
        await fetch(PROXY_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'patch', data: [item.payload] }),
        });
      } else if (item.action === 'delete') {
        await fetch(PROXY_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'delete', data: [item.payload] }),
        });
      }
    } catch (e) {
      console.warn('syncPending failed for item', item, e);
      // stop on first error to avoid clearing pending incorrectly
      return;
    }
  }
  clearPending();
}
