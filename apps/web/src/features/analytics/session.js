/**
 * Analytics session bridge — reuses anonymous session storage.
 * Keeps analytics module self-contained while sharing one session identity.
 */
import {
  getAnalyticsSessionRef,
  getOrCreateAnonymousSessionId,
  getSessionContext,
  peekAnonymousSessionId,
  saveSessionContext,
} from '../tracking/session.js';

export {
  getAnalyticsSessionRef,
  getOrCreateAnonymousSessionId,
  getSessionContext,
  peekAnonymousSessionId,
  saveSessionContext,
};

export function requireAnalyticsSession(restaurantSlug) {
  const ref = getAnalyticsSessionRef(restaurantSlug);
  if (!ref?.sessionId || !ref?.restaurantId) {
    return null;
  }
  return ref;
}
