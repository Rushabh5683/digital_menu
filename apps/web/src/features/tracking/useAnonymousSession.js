import { useEffect, useRef, useState } from 'react';
import { api } from '../../shared/api/client.js';
import {
  getOrCreateAnonymousSessionId,
  getSessionContext,
  saveSessionContext,
} from './session.js';

const END_SESSION_GRACE_MS = 400;

function endSessionBestEffort(restaurantSlug, anonymousSessionId) {
  if (!restaurantSlug || !anonymousSessionId) return;

  const payload = JSON.stringify({ restaurantSlug, anonymousSessionId });
  const url = `${import.meta.env.VITE_API_BASE_URL || ''}/api/sessions/end`;

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([payload], { type: 'application/json' });
      const queued = navigator.sendBeacon(url, blob);
      if (queued) return;
    }
  } catch {
    // fall through to fetch
  }

  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => {
    // Best-effort only — unload must not throw.
  });
}

/**
 * Ensures an anonymous session exists for the restaurant menu visit.
 * Optional tableNumber binds the session to a dining table from QR or picker.
 *
 * Cleanup ends the session after a short grace period so React StrictMode
 * remounts do not emit spurious session_end + session_start pairs.
 * Real tab close still ends immediately via pagehide.
 */
export function useAnonymousSession(
  restaurantSlug,
  { enabled = true, tableNumber = null, preview = false } = {},
) {
  const [session, setSession] = useState(() =>
    restaurantSlug && !preview ? getSessionContext(restaurantSlug) : null,
  );
  const [status, setStatus] = useState(preview ? 'preview' : 'idle');
  const [error, setError] = useState(null);
  const anonymousIdRef = useRef(null);
  const startedRef = useRef(false);
  const endTimerRef = useRef(null);

  useEffect(() => {
    if (preview) {
      setSession(null);
      setStatus('preview');
      setError(null);
      startedRef.current = false;
      return undefined;
    }

    if (!enabled || !restaurantSlug) return undefined;

    let cancelled = false;
    const anonymousSessionId = getOrCreateAnonymousSessionId(restaurantSlug);
    anonymousIdRef.current = anonymousSessionId;

    if (endTimerRef.current != null) {
      window.clearTimeout(endTimerRef.current);
      endTimerRef.current = null;
    }

    async function start() {
      setStatus('starting');
      setError(null);

      try {
        const response = await api.startSession({
          restaurantSlug,
          anonymousSessionId,
          ...(tableNumber ? { tableNumber } : {}),
        });

        if (cancelled) return;

        // Server may refuse guest sessions for signed-in restaurant staff.
        if (response.session?.preview || !response.session?.id) {
          setSession(null);
          setStatus('preview');
          startedRef.current = false;
          return;
        }

        const next = {
          anonymousSessionId: response.session.anonymousSessionId,
          sessionId: response.session.id,
          restaurantId: response.session.restaurantId,
          restaurantSlug,
          tableId: response.session.tableId,
          tableNumber: response.session.tableNumber,
          tableLabel: response.session.tableLabel,
          startedAt: response.session.startedAt,
          created: response.session.created,
          resumed: response.session.resumed,
        };

        saveSessionContext(restaurantSlug, next);
        setSession(next);
        setStatus('ready');
        startedRef.current = true;
      } catch (err) {
        if (cancelled) return;
        setError(err);
        setStatus('error');
        setSession({
          anonymousSessionId,
          sessionId: null,
          restaurantId: null,
          restaurantSlug,
          tableNumber: tableNumber || null,
        });
      }
    }

    start();

    const onPageHide = () => {
      if (endTimerRef.current != null) {
        window.clearTimeout(endTimerRef.current);
        endTimerRef.current = null;
      }
      endSessionBestEffort(restaurantSlug, anonymousIdRef.current);
    };

    window.addEventListener('pagehide', onPageHide);

    return () => {
      cancelled = true;
      window.removeEventListener('pagehide', onPageHide);

      if (startedRef.current) {
        const slug = restaurantSlug;
        const anonId = anonymousIdRef.current;
        endTimerRef.current = window.setTimeout(() => {
          endTimerRef.current = null;
          endSessionBestEffort(slug, anonId);
          startedRef.current = false;
        }, END_SESSION_GRACE_MS);
      }
    };
  }, [restaurantSlug, enabled, tableNumber, preview]);

  return { session, status, error };
}
