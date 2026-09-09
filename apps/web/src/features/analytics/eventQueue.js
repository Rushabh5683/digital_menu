import { EVENT_TYPE_LIST } from './eventTypes.js';

const DEFAULT_FLUSH_INTERVAL_MS = 5000;
const DEFAULT_MAX_QUEUE = 40;

function isDebugEnabled() {
  if (typeof window === 'undefined') return false;
  try {
    if (window.localStorage?.getItem('dm:analytics:debug') === '1') return true;
  } catch {
    // ignore
  }
  return Boolean(import.meta.env.DEV);
}

function debugLog(...args) {
  if (isDebugEnabled()) {
    // eslint-disable-next-line no-console
    console.debug('[analytics]', ...args);
  }
}

/**
 * Asynchronous batched event queue.
 * Never blocks the UI — network work is fire-and-forget with keepalive on unload.
 */
export function createEventQueue({
  sendBatch,
  flushIntervalMs = DEFAULT_FLUSH_INTERVAL_MS,
  maxQueueSize = DEFAULT_MAX_QUEUE,
} = {}) {
  let queue = [];
  let timer = null;
  let flushing = false;

  function schedule() {
    if (timer != null) return;
    timer = window.setTimeout(() => {
      timer = null;
      flush().catch(() => {});
    }, flushIntervalMs);
  }

  function enqueue(event) {
    if (!event || !EVENT_TYPE_LIST.includes(event.eventType)) {
      debugLog('drop invalid event', event);
      return;
    }

    queue.push(event);
    debugLog('enqueue', event.eventType, event);

    if (queue.length >= maxQueueSize) {
      flush().catch(() => {});
      return;
    }

    schedule();
  }

  async function flush({ keepalive = false } = {}) {
    if (flushing || queue.length === 0) return { sent: 0 };
    flushing = true;

    const batch = queue;
    queue = [];

    if (timer != null) {
      window.clearTimeout(timer);
      timer = null;
    }

    try {
      debugLog('flush', batch.length, keepalive ? '(keepalive)' : '');
      await sendBatch(batch, { keepalive });
      return { sent: batch.length };
    } catch (error) {
      // Re-queue failed batch (cap to avoid unbounded growth).
      queue = [...batch, ...queue].slice(0, maxQueueSize * 2);
      debugLog('flush failed', error?.message || error);
      schedule();
      throw error;
    } finally {
      flushing = false;
    }
  }

  function flushSync() {
    if (queue.length === 0) return;
    const batch = queue;
    queue = [];
    if (timer != null) {
      window.clearTimeout(timer);
      timer = null;
    }
    // Best-effort synchronous path for unload.
    try {
      sendBatch(batch, { keepalive: true });
    } catch {
      // ignore
    }
  }

  function size() {
    return queue.length;
  }

  function clear() {
    queue = [];
    if (timer != null) {
      window.clearTimeout(timer);
      timer = null;
    }
  }

  return {
    enqueue,
    flush,
    flushSync,
    size,
    clear,
    debugLog,
    isDebugEnabled,
  };
}
