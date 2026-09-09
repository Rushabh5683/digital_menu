const STORAGE_PREFIX = 'dm:anon-session';

function storageKey(restaurantSlug) {
  return `${STORAGE_PREFIX}:${restaurantSlug}`;
}

function contextKey(restaurantSlug) {
  return `${STORAGE_PREFIX}:ctx:${restaurantSlug}`;
}

function createUuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback for older environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function canUseSessionStorage() {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return false;
    const probe = '__dm_session_probe__';
    window.sessionStorage.setItem(probe, '1');
    window.sessionStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get or create an opaque anonymous session ID for a restaurant menu visit.
 * Stored in sessionStorage (survives refresh, cleared when the tab/window closes).
 * No personal data is stored.
 */
export function getOrCreateAnonymousSessionId(restaurantSlug) {
  if (!restaurantSlug) {
    throw new Error('restaurantSlug is required');
  }

  if (!canUseSessionStorage()) {
    if (!getOrCreateAnonymousSessionId._memory) {
      getOrCreateAnonymousSessionId._memory = new Map();
    }
    const memory = getOrCreateAnonymousSessionId._memory;
    if (!memory.has(restaurantSlug)) {
      memory.set(restaurantSlug, createUuid());
    }
    return memory.get(restaurantSlug);
  }

  const key = storageKey(restaurantSlug);
  const existing = window.sessionStorage.getItem(key);
  if (existing) {
    return existing;
  }

  const next = createUuid();
  window.sessionStorage.setItem(key, next);
  return next;
}

export function peekAnonymousSessionId(restaurantSlug) {
  if (!restaurantSlug || !canUseSessionStorage()) {
    return getOrCreateAnonymousSessionId._memory?.get(restaurantSlug) ?? null;
  }
  return window.sessionStorage.getItem(storageKey(restaurantSlug));
}

export function saveSessionContext(restaurantSlug, context) {
  if (!restaurantSlug || !context) return;

  const payload = {
    anonymousSessionId: context.anonymousSessionId,
    sessionId: context.sessionId,
    restaurantId: context.restaurantId,
    restaurantSlug,
    tableId: context.tableId ?? null,
    tableNumber: context.tableNumber ?? null,
    tableLabel: context.tableLabel ?? null,
    startedAt: context.startedAt ?? null,
    updatedAt: new Date().toISOString(),
  };

  if (!canUseSessionStorage()) {
    if (!saveSessionContext._memory) {
      saveSessionContext._memory = new Map();
    }
    saveSessionContext._memory.set(restaurantSlug, payload);
    return;
  }

  window.sessionStorage.setItem(contextKey(restaurantSlug), JSON.stringify(payload));
}

export function getSessionContext(restaurantSlug) {
  if (!restaurantSlug) return null;

  if (!canUseSessionStorage()) {
    return saveSessionContext._memory?.get(restaurantSlug) ?? null;
  }

  const raw = window.sessionStorage.getItem(contextKey(restaurantSlug));
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Stable context object for the upcoming analytics module.
 */
export function getAnalyticsSessionRef(restaurantSlug) {
  const context = getSessionContext(restaurantSlug);
  const anonymousSessionId =
    context?.anonymousSessionId || peekAnonymousSessionId(restaurantSlug);

  if (!anonymousSessionId) return null;

  return {
    anonymousSessionId,
    sessionId: context?.sessionId ?? null,
    restaurantId: context?.restaurantId ?? null,
    restaurantSlug,
  };
}
