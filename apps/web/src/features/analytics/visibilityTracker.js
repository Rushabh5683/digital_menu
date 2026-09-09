import { MEANINGFUL_VISIBILITY_RATIO, MIN_ATTENTION_MS } from './eventTypes.js';

function centerProximityScore(rect, viewportHeight) {
  const elementCenter = rect.top + rect.height / 2;
  const viewportCenter = viewportHeight / 2;
  const distance = Math.abs(elementCenter - viewportCenter);
  const normalized = Math.min(distance / (viewportHeight / 2 || 1), 1);
  return 1 - normalized;
}

/**
 * Exclusive attention tracker for a namespace (e.g. category or dish).
 *
 * Strategy:
 * - Observe many elements with IntersectionObserver
 * - Only ONE target is "active" at a time (highest meaningful score)
 * - Score = intersectionRatio * 0.65 + centerProximity * 0.35
 * - Prevents inflated attention when several cards share the viewport
 * - Emits attention on leave/switch AND periodic heartbeats while dwelling
 */
export function createExclusiveVisibilityTracker({
  namespace,
  threshold = [0.05, 0.15, 0.25, 0.4, 0.55, 0.7],
  rootMargin = '-12% 0px -40% 0px',
  minRatio = MEANINGFUL_VISIBILITY_RATIO,
  minViewMs = 0,
  minAttentionMs = MIN_ATTENTION_MS,
  heartbeatMs = 4000,
  onView,
  onAttention,
  debugLog = () => {},
} = {}) {
  const targets = new Map();
  const ratios = new Map();
  const rects = new Map();
  const viewedInCurrentStint = new Set();
  let activeId = null;
  let activeStartedAt = null;
  let accumulatedMs = 0;
  let viewTimer = null;
  let paused = false;
  let observer = null;
  let heartbeatTimer = null;

  function ensureObserver() {
    if (observer || typeof IntersectionObserver === 'undefined') return;

    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const target = targets.get(entry.target);
          if (!target) continue;

          const ratio = entry.isIntersecting ? entry.intersectionRatio : 0;
          ratios.set(target.id, ratio);
          if (entry.boundingClientRect) {
            rects.set(target.id, entry.boundingClientRect);
          }
        }
        reconcile();
      },
      { threshold, rootMargin },
    );
  }

  function scoreFor(id) {
    const ratio = ratios.get(id) || 0;
    if (ratio < minRatio) return 0;

    const rect = rects.get(id);
    const proximity = rect
      ? centerProximityScore(rect, window.innerHeight || 1)
      : 0.5;

    return ratio * 0.65 + proximity * 0.35;
  }

  function pickWinner() {
    let bestId = null;
    let bestScore = 0;

    for (const { id } of targets.values()) {
      const score = scoreFor(id);
      if (score > bestScore) {
        bestScore = score;
        bestId = id;
      }
    }

    return bestScore > 0 ? bestId : null;
  }

  function findMeta(id) {
    for (const value of targets.values()) {
      if (value.id === id) return value.meta;
    }
    return undefined;
  }

  function currentElapsedMs() {
    let total = accumulatedMs;
    if (!paused && activeStartedAt != null) {
      total += Date.now() - activeStartedAt;
    }
    return total;
  }

  function emitAttention(id, elapsed, reason) {
    if (elapsed < minAttentionMs) {
      debugLog(`${namespace} skip short`, id, `${elapsed}ms`, reason);
      return;
    }
    debugLog(`${namespace} attention`, id, `${elapsed}ms`, reason);
    onAttention?.(id, { durationMs: elapsed, meta: findMeta(id), reason });
  }

  function stopHeartbeat() {
    if (heartbeatTimer != null) {
      window.clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }

  function startHeartbeat() {
    stopHeartbeat();
    if (!heartbeatMs || heartbeatMs < minAttentionMs) return;

    heartbeatTimer = window.setInterval(() => {
      if (paused || !activeId || activeStartedAt == null) return;

      const elapsed = currentElapsedMs();
      if (elapsed < minAttentionMs) return;

      // Emit a dwell segment, then keep watching the same target.
      emitAttention(activeId, elapsed, 'heartbeat');
      accumulatedMs = 0;
      activeStartedAt = Date.now();
    }, heartbeatMs);
  }

  function stopActive(reason = 'switch') {
    if (!activeId) return;

    const elapsed = currentElapsedMs();
    const id = activeId;

    activeId = null;
    activeStartedAt = null;
    accumulatedMs = 0;
    stopHeartbeat();
    stopViewTimer();

    emitAttention(id, elapsed, reason);
    viewedInCurrentStint.delete(id);
  }

  function stopViewTimer() {
    if (viewTimer != null) {
      window.clearTimeout(viewTimer);
      viewTimer = null;
    }
  }

  function scheduleView(id) {
    stopViewTimer();
    if (!minViewMs || minViewMs <= 0) {
      if (!viewedInCurrentStint.has(id)) {
        viewedInCurrentStint.add(id);
        debugLog(`${namespace} viewed`, id);
        onView?.(id, { meta: findMeta(id) });
      }
      return;
    }

    viewTimer = window.setTimeout(() => {
      viewTimer = null;
      if (activeId !== id || paused) return;
      if (viewedInCurrentStint.has(id)) return;
      viewedInCurrentStint.add(id);
      debugLog(`${namespace} viewed`, id, `after ${minViewMs}ms`);
      onView?.(id, { meta: findMeta(id) });
    }, minViewMs);
  }

  function startActive(id) {
    activeId = id;
    activeStartedAt = Date.now();
    accumulatedMs = 0;
    startHeartbeat();
    scheduleView(id);
  }

  function reconcile() {
    if (paused) return;

    const winner = pickWinner();
    if (winner === activeId) return;

    if (activeId) {
      stopActive(winner ? 'switch' : 'leave');
    }

    if (winner) {
      startActive(winner);
    }
  }

  function register(element, { id, meta } = {}) {
    if (!element || !id) return () => {};

    ensureObserver();
    targets.set(element, { id, meta });
    ratios.set(id, 0);

    if (observer) {
      observer.observe(element);
    }

    // Fresh observation may not fire until scroll; nudge after layout.
    window.requestAnimationFrame(() => reconcile());

    return () => unregister(element);
  }

  function unregister(element) {
    const target = targets.get(element);
    if (!target) return;

    if (observer) {
      observer.unobserve(element);
    }

    targets.delete(element);
    ratios.delete(target.id);
    rects.delete(target.id);

    if (activeId === target.id) {
      stopActive('unregister');
    }
  }

  function pause() {
    if (paused) return;
    if (activeId && activeStartedAt != null) {
      accumulatedMs += Date.now() - activeStartedAt;
      activeStartedAt = null;
    }
    paused = true;
    stopHeartbeat();
    debugLog(`${namespace} pause`, activeId);
  }

  function resume() {
    if (!paused) return;
    paused = false;
    if (activeId) {
      activeStartedAt = Date.now();
      startHeartbeat();
    }
    debugLog(`${namespace} resume`, activeId);
    reconcile();
  }

  function flush() {
    if (activeId) {
      stopActive('flush');
    }
  }

  function nudge() {
    reconcile();
  }

  function destroy() {
    flush();
    stopHeartbeat();
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    targets.clear();
    ratios.clear();
    rects.clear();
    viewedInCurrentStint.clear();
  }

  return {
    namespace,
    register,
    unregister,
    pause,
    resume,
    flush,
    nudge,
    destroy,
    getActiveId: () => activeId,
  };
}
