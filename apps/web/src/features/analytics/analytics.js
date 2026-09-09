import { createEventQueue } from './eventQueue.js';
import {
  EventTypes,
  MEANINGFUL_VISIBILITY_RATIO,
  MIN_ATTENTION_MS,
  MIN_VIEW_MS,
} from './eventTypes.js';
import { requireAnalyticsSession } from './session.js';
import { createExclusiveVisibilityTracker } from './visibilityTracker.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

let restaurantSlug = null;
let queue = null;
let categoryTracker = null;
let dishTracker = null;
let started = false;
let listenersBound = false;
let exitSent = false;
let lastSearchKey = '';
let searchTimer = null;
let lastDiscoveryKey = '';
let discoveryTimer = null;
/** Pending debounced discovery payload — flushed on shutdown so searches are not lost. */
let pendingDiscovery = null;
let shutdownTimer = null;
const openedForSession = new Set();
/** Dedupe DISH_INFO_VIEWED within a short window (StrictMode / cart qty churn). */
const recentDishInfoKeys = new Map();
/** Events captured before initAnalytics (session still starting). */
let pendingEvents = [];

const SHUTDOWN_GRACE_MS = 350;
const DISH_INFO_DEDUPE_MS = 2000;
const DISH_COMPARISON_WINDOW_MS = 5 * 60 * 1000;
/** Wait for typing to settle before auto-tracking (avoids su/sus/sush while typing sushi). */
const SEARCH_DISCOVERY_DEBOUNCE_MS = 1500;
/** Auto-emit after debounce only for longer queries; shorter ones commit on blur/Enter. */
const SEARCH_AUTO_EMIT_MIN_LENGTH = 5;
const SEARCH_DEDUPE_MS = 10000;
const SEARCH_PREFIX_WINDOW_MS = 60000;
/** Last query sent to analytics — used to collapse prefix/backspace noise. */
let lastTrackedSearchQuery = '';
let lastTrackedSearchAt = 0;
/** Last dish detail opened in this tab — used for behavioural comparison detection. */
let lastDishInfoContext = null;

function debugLog(...args) {
  queue?.debugLog?.(...args);
}

function createClientEventId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function nowIso() {
  return new Date().toISOString();
}

function buildEvent(eventType, { categoryId = null, dishId = null, metadata = null } = {}) {
  return {
    clientEventId: createClientEventId(),
    eventType,
    categoryId,
    dishId,
    timestamp: nowIso(),
    metadata,
  };
}

async function sendBatch(events, { keepalive = false } = {}) {
  const session = requireAnalyticsSession(restaurantSlug);
  if (!session) {
    debugLog('skip flush — session not ready');
    throw new Error('Analytics session not ready');
  }

  const payload = {
    sessionId: session.sessionId,
    restaurantId: session.restaurantId,
    events,
  };

  const response = await fetch(`${API_BASE_URL}/api/analytics/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `Analytics ingest failed (${response.status})`);
  }

  return response.json().catch(() => ({ ok: true }));
}

function track(eventType, fields) {
  const event = buildEvent(eventType, fields);

  if (!started || !queue) {
    pendingEvents.push(event);
    if (pendingEvents.length > 80) {
      pendingEvents = pendingEvents.slice(-80);
    }
    return;
  }

  queue.enqueue(event);
}

function flushPendingEvents() {
  if (!queue || pendingEvents.length === 0) return;
  const batch = pendingEvents;
  pendingEvents = [];
  for (const event of batch) {
    queue.enqueue(event);
  }
}

function ensureTrackers() {
  if (categoryTracker && dishTracker) return;

  // Categories are tall (header + many dishes). Intersection ratio vs full
  // section height is often tiny, so use a lower threshold than dish cards.
  categoryTracker = createExclusiveVisibilityTracker({
    namespace: 'category',
    rootMargin: '-8% 0px -40% 0px',
    minRatio: 0.08,
    minViewMs: MIN_VIEW_MS,
    minAttentionMs: MIN_ATTENTION_MS,
    heartbeatMs: 4000,
    debugLog,
    onView(categoryId) {
      track(EventTypes.CATEGORY_VIEWED, { categoryId });
    },
    onAttention(categoryId, { durationMs }) {
      track(EventTypes.CATEGORY_ATTENTION, {
        categoryId,
        metadata: { durationMs },
      });
    },
  });

  dishTracker = createExclusiveVisibilityTracker({
    namespace: 'dish',
    rootMargin: '-12% 0px -30% 0px',
    minRatio: MEANINGFUL_VISIBILITY_RATIO,
    minViewMs: MIN_VIEW_MS,
    minAttentionMs: MIN_ATTENTION_MS,
    heartbeatMs: 4000,
    debugLog,
    onView(dishId, { meta }) {
      track(EventTypes.DISH_VIEWED, {
        dishId,
        categoryId: meta?.categoryId ?? null,
        metadata: meta?.source ? { source: meta.source } : null,
      });
    },
    onAttention(dishId, { durationMs, meta }) {
      track(EventTypes.DISH_ATTENTION, {
        dishId,
        categoryId: meta?.categoryId ?? null,
        metadata: {
          durationMs,
          ...(meta?.source ? { source: meta.source } : {}),
        },
      });
    },
  });
}

function onVisibilityChange() {
  if (document.visibilityState === 'hidden') {
    categoryTracker?.pause();
    dishTracker?.pause();
    queue?.flush({ keepalive: true }).catch(() => {});
  } else {
    categoryTracker?.resume();
    dishTracker?.resume();
  }
}

function onPageHide() {
  finalizeExit('pagehide');
}

function bindLifecycle() {
  if (listenersBound) return;
  listenersBound = true;
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('pagehide', onPageHide);
}

function unbindLifecycle() {
  if (!listenersBound) return;
  listenersBound = false;
  document.removeEventListener('visibilitychange', onVisibilityChange);
  window.removeEventListener('pagehide', onPageHide);
}

function finalizeExit(reason) {
  if (!started || exitSent) {
    categoryTracker?.flush();
    dishTracker?.flush();
    queue?.flushSync();
    return;
  }

  exitSent = true;
  categoryTracker?.flush();
  dishTracker?.flush();
  track(EventTypes.MENU_EXITED, {
    metadata: { reason },
  });
  queue?.flushSync();
}

/**
 * Initialize analytics for a restaurant menu visit.
 * Safe to call multiple times for the same slug.
 * Cancels a pending StrictMode shutdown so remount does not emit MENU_EXITED.
 */
export function initAnalytics(slug) {
  if (!slug) return;

  if (shutdownTimer != null) {
    window.clearTimeout(shutdownTimer);
    shutdownTimer = null;
  }

  if (started && restaurantSlug === slug) {
    flushPendingEvents();
    categoryTracker?.nudge?.();
    dishTracker?.nudge?.();
    return;
  }

  if (started && restaurantSlug !== slug) {
    performShutdown({ reason: 'restaurant_switch' });
  }

  restaurantSlug = slug;
  queue = createEventQueue({ sendBatch });
  ensureTrackers();
  bindLifecycle();
  started = true;
  exitSent = false;
  flushPendingEvents();
  categoryTracker?.nudge?.();
  dishTracker?.nudge?.();
  debugLog('init', slug);
}

export function markMenuOpened() {
  try {
    const session = requireAnalyticsSession(restaurantSlug);
    if (!session?.sessionId) return;
    if (openedForSession.has(session.sessionId)) return;
    openedForSession.add(session.sessionId);

    track(EventTypes.MENU_OPENED, {
      metadata: { path: typeof window !== 'undefined' ? window.location.pathname : null },
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[analytics] markMenuOpened failed', error);
    }
  }
}

function performShutdown({ reason = 'shutdown' } = {}) {
  if (!started) return;
  flushPendingDiscovery({ committed: true });
  finalizeExit(reason);
  categoryTracker?.destroy();
  dishTracker?.destroy();
  categoryTracker = null;
  dishTracker = null;
  unbindLifecycle();
  queue?.clear();
  queue = null;
  pendingEvents = [];
  started = false;
  restaurantSlug = null;
  lastSearchKey = '';
  if (searchTimer) {
    clearTimeout(searchTimer);
    searchTimer = null;
  }
  lastDiscoveryKey = '';
  pendingDiscovery = null;
  lastTrackedSearchQuery = '';
  lastTrackedSearchAt = 0;
}

/**
 * Delayed shutdown — cancels if initAnalytics runs again within the grace window
 * (React StrictMode remount / fast route churn).
 */
export function shutdownAnalytics({ reason = 'shutdown' } = {}) {
  if (!started && shutdownTimer == null) return;

  if (shutdownTimer != null) {
    window.clearTimeout(shutdownTimer);
  }

  shutdownTimer = window.setTimeout(() => {
    shutdownTimer = null;
    performShutdown({ reason });
  }, SHUTDOWN_GRACE_MS);
}

export function registerCategoryElement(element, categoryId, meta = {}) {
  ensureTrackers();
  return categoryTracker.register(element, { id: categoryId, meta });
}

export function registerDishElement(element, dishId, meta = {}) {
  ensureTrackers();
  return dishTracker.register(element, { id: dishId, meta });
}

export function trackSearch(query, { resultCount = null, filters = [] } = {}) {
  const normalized = String(query || '').trim();
  const filterIds = (filters || []).map((item) => String(item)).filter(Boolean);
  const hasQuery = normalized.length >= 2;
  const hasFilters = filterIds.length > 0;

  if (!hasQuery && !hasFilters) return;

  const key = `${normalized.toLowerCase()}|${filterIds.sort().join(',')}|${resultCount ?? 'x'}`;
  if (key === lastSearchKey) return;
  lastSearchKey = key;

  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    track(EventTypes.SEARCH_PERFORMED, {
      metadata: {
        query: hasQuery ? normalized.slice(0, 80) : null,
        filters: hasFilters ? filterIds : null,
        resultCount,
        zeroResults: resultCount === 0,
      },
    });
  }, 450);
}

function discoveryScheduleKey(normalized, filterIds) {
  return `${normalized.toLowerCase()}|${filterIds.sort().join(',')}`;
}

function shouldEmitSearchQuery(query) {
  const q = String(query || '').trim().toLowerCase();
  if (q.length < 2) return false;

  const now = Date.now();

  if (q === lastTrackedSearchQuery && now - lastTrackedSearchAt < SEARCH_DEDUPE_MS) {
    return false;
  }

  // Backspaced to a shorter prefix of a query we already recorded.
  if (
    lastTrackedSearchQuery &&
    now - lastTrackedSearchAt < SEARCH_PREFIX_WINDOW_MS &&
    lastTrackedSearchQuery.startsWith(q) &&
    lastTrackedSearchQuery.length > q.length
  ) {
    return false;
  }

  return true;
}

function recordTrackedSearchQuery(query) {
  lastTrackedSearchQuery = String(query || '').trim().toLowerCase();
  lastTrackedSearchAt = Date.now();
}

function emitDiscoverySignal(payload, { committed = false } = {}) {
  if (!payload) return;

  if (payload.hasQuery) {
    const query = payload.query;
    if (!committed && query.length < SEARCH_AUTO_EMIT_MIN_LENGTH) {
      return;
    }
    if (!shouldEmitSearchQuery(query)) {
      lastDiscoveryKey = payload.key;
      return;
    }

    recordTrackedSearchQuery(query);
    track(EventTypes.SEARCH_PERFORMED, {
      metadata: {
        query,
        resultCount: payload.resultCount,
        zeroResults: payload.resultCount === 0,
        committed,
      },
    });
    queue?.flush?.().catch(() => {});
  }

  lastDiscoveryKey = payload.key;
}

function flushPendingDiscovery({ committed = false } = {}) {
  if (discoveryTimer != null) {
    clearTimeout(discoveryTimer);
    discoveryTimer = null;
  }
  if (pendingDiscovery) {
    const payload = pendingDiscovery;
    pendingDiscovery = null;
    emitDiscoverySignal(payload, { committed });
  }
}

/**
 * Commit the current search immediately (blur / Enter) — records the final term, not keystrokes.
 */
export function commitMenuDiscovery({ query = '', filters = [], resultCount = null } = {}) {
  const normalized = String(query || '').trim();
  const filterIds = (filters || []).map((item) => String(item)).filter(Boolean);
  const hasQuery = normalized.length >= 2;
  const hasFilters = filterIds.length > 0;

  if (discoveryTimer != null) {
    clearTimeout(discoveryTimer);
    discoveryTimer = null;
  }

  if (!hasQuery && !hasFilters) {
    pendingDiscovery = null;
    return;
  }

  const payload = {
    key: discoveryScheduleKey(normalized, filterIds),
    hasQuery,
    query: normalized.slice(0, 80),
    resultCount,
  };

  pendingDiscovery = null;
  emitDiscoverySignal(payload, { committed: true });
}

/**
 * Debounced discovery signal when search/filters change (includes zero-result cases).
 */
export function trackMenuDiscovery({ query = '', filters = [], resultCount = null } = {}) {
  const normalized = String(query || '').trim();
  const filterIds = (filters || []).map((item) => String(item)).filter(Boolean);
  const hasQuery = normalized.length >= 2;
  const hasFilters = filterIds.length > 0;

  if (!hasQuery && !hasFilters) return;

  const key = discoveryScheduleKey(normalized, filterIds);
  if (key === lastDiscoveryKey && !hasQuery) return;

  pendingDiscovery = {
    key,
    hasQuery,
    query: normalized.slice(0, 80),
    resultCount,
  };

  if (discoveryTimer) clearTimeout(discoveryTimer);
  discoveryTimer = setTimeout(() => {
    discoveryTimer = null;
    const payload = pendingDiscovery;
    pendingDiscovery = null;
    if (payload) emitDiscoverySignal(payload, { committed: false });
  }, SEARCH_DISCOVERY_DEBOUNCE_MS);
}

export function trackFilterApplied(filterId, { activeFilters = [], resultCount = null } = {}) {
  if (!filterId) return;
  track(EventTypes.FILTER_APPLIED, {
    metadata: {
      filterId: String(filterId),
      activeFilters,
      resultCount,
    },
  });
  queue?.flush?.().catch(() => {});
}

export function trackFilterCleared({ previousFilters = [], resultCount = null } = {}) {
  track(EventTypes.FILTER_CLEARED, {
    metadata: {
      previousFilters,
      resultCount,
    },
  });
}

export function trackCategoryNavTap(categoryId, { source = 'category_pills' } = {}) {
  if (!categoryId) return;
  track(EventTypes.CATEGORY_NAV_TAP, {
    categoryId,
    metadata: { source },
  });
}

export function trackDishInfoViewed(
  dish,
  categoryId = null,
  { source = 'detail_drawer', sections = [] } = {},
) {
  if (!dish?.id) return;

  const session = requireAnalyticsSession(restaurantSlug);
  const sessionKey = session?.sessionId || 'pending';
  const dedupeKey = `${sessionKey}|${dish.id}|${source}`;
  const now = Date.now();
  const last = recentDishInfoKeys.get(dedupeKey);
  if (last != null && now - last < DISH_INFO_DEDUPE_MS) {
    return;
  }
  recentDishInfoKeys.set(dedupeKey, now);

  if (recentDishInfoKeys.size > 200) {
    for (const [key, at] of recentDishInfoKeys) {
      if (now - at > DISH_INFO_DEDUPE_MS) recentDishInfoKeys.delete(key);
    }
  }

  const normalizedSections = (sections || [])
    .map((item) => String(item || '').trim().toLowerCase())
    .filter(Boolean);

  if (
    lastDishInfoContext &&
    lastDishInfoContext.dishId !== dish.id &&
    now - lastDishInfoContext.at <= DISH_COMPARISON_WINDOW_MS
  ) {
    track(EventTypes.DISH_COMPARISON, {
      dishId: dish.id,
      categoryId: categoryId ?? null,
      metadata: {
        previousDishId: lastDishInfoContext.dishId,
        source,
        windowMs: now - lastDishInfoContext.at,
      },
    });
  }

  lastDishInfoContext = { dishId: dish.id, at: now, categoryId };

  track(EventTypes.DISH_INFO_VIEWED, {
    dishId: dish.id,
    categoryId: categoryId ?? null,
    metadata: {
      source,
      sections: normalizedSections.length > 0 ? normalizedSections : ['details'],
    },
  });
}

export function trackDishSelection(dish, categoryId = null) {
  if (!dish?.id) return;
  track(EventTypes.DISH_SELECTED, {
    dishId: dish.id,
    categoryId: categoryId ?? null,
    metadata: {
      name: dish.name,
      price: dish.price,
    },
  });
}

/**
 * Fire a guest-experience / journey event. Uses the shared queue so existing
 * attention and discovery analytics stay intact.
 */
export function trackExperienceEvent(eventType, { categoryId = null, dishId = null, metadata = null } = {}) {
  if (!eventType || !Object.values(EventTypes).includes(eventType)) return;
  track(eventType, { categoryId, dishId, metadata });
}

export function flushAnalytics(options) {
  return queue?.flush(options);
}

export function getAnalyticsDebugState() {
  return {
    started,
    restaurantSlug,
    queueSize: queue?.size?.() ?? 0,
    activeCategoryId: categoryTracker?.getActiveId?.() ?? null,
    activeDishId: dishTracker?.getActiveId?.() ?? null,
    debug: queue?.isDebugEnabled?.() ?? false,
  };
}

export { EventTypes };
