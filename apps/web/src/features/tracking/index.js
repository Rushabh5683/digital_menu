/**
 * Tracking feature public surface.
 * Analytics event batching will build on getAnalyticsSessionRef + session APIs.
 */
export {
  getAnalyticsSessionRef,
  getOrCreateAnonymousSessionId,
  getSessionContext,
  peekAnonymousSessionId,
  saveSessionContext,
} from './session.js';

export { useAnonymousSession } from './useAnonymousSession.js';
