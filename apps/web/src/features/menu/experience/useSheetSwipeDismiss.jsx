import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

const DEFAULT_THRESHOLD = 56;
const DEFAULT_VELOCITY = 0.35;
const EXIT_MS = 380;
const SNAP_MS = 280;
const EXIT_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

/**
 * Center-top affordance. Uses the same dismiss pipeline as the rest of the card.
 */
export function SheetSwipeAffordance({
  variant = 'light',
  className = '',
  label = 'Swipe down to close',
  ...handleProps
}) {
  const onHero = variant === 'hero';
  return (
    <div
      role="button"
      tabIndex={0}
      data-swipe-handle="true"
      aria-label={label}
      title={label}
      className={[
        'flex shrink-0 touch-none cursor-grab flex-col items-center justify-center select-none active:cursor-grabbing',
        onHero ? 'px-8 pb-1.5 pt-3' : 'px-8 pb-1 pt-2.5',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ touchAction: 'none', WebkitUserSelect: 'none' }}
      {...handleProps}
    >
      <span
        className={[
          'block h-1 w-11 rounded-full',
          onHero ? 'bg-white/90 shadow-sm' : 'bg-stone-300',
        ].join(' ')}
      />
      <ChevronDown
        className={[
          'mt-0.5 h-4 w-4',
          onHero ? 'text-white/95 drop-shadow-sm' : 'text-stone-400',
        ].join(' ')}
        strokeWidth={2.5}
        aria-hidden
      />
    </div>
  );
}

function paintPanel(panelEl, y, { immediate = true, dismissing = false } = {}) {
  if (!panelEl) return;
  const progress = Math.min(1, Math.max(0, y) / 120);
  const scale = 1 - progress * 0.025;
  const opacity = dismissing ? 0 : Math.max(0.5, 1 - progress * 0.35);
  panelEl.style.transform = `translate3d(0, ${Math.max(0, y)}px, 0) scale(${scale})`;
  panelEl.style.opacity = String(opacity);
  panelEl.style.transition = immediate
    ? 'none'
    : dismissing
      ? `transform ${EXIT_MS}ms ${EXIT_EASE}, opacity ${EXIT_MS}ms ${EXIT_EASE}`
      : `transform ${SNAP_MS}ms ${EXIT_EASE}, opacity ${SNAP_MS}ms ${EXIT_EASE}`;
  panelEl.style.willChange = 'transform, opacity';
}

function paintBackdrop(el, y, { immediate = true, dismissing = false } = {}) {
  if (!el) return;
  const progress = Math.min(1, Math.max(0, y) / 120);
  el.style.opacity = dismissing ? '0' : String(Math.max(0.15, 1 - progress * 0.85));
  el.style.transition = immediate
    ? 'none'
    : `opacity ${dismissing ? EXIT_MS : SNAP_MS}ms ${EXIT_EASE}`;
}

function hideGone(panelEl, backdropEl) {
  if (panelEl) {
    panelEl.style.visibility = 'hidden';
    panelEl.style.pointerEvents = 'none';
    panelEl.style.opacity = '0';
  }
  if (backdropEl) {
    backdropEl.style.visibility = 'hidden';
    backdropEl.style.opacity = '0';
    backdropEl.style.pointerEvents = 'none';
  }
}

/**
 * Swipe-down dismiss. Icon and full-card body share ONE pipeline:
 *   activateDismiss → paintPanel follow → playExitThenClose
 *
 * Mobile browsers decide touch-action at gesture START. Changing it in
 * pointerdown is too late — so when the sheet is at scroll-top we keep the
 * same touch-action:none the icon always has, before the finger moves.
 */
export function useSheetSwipeDismiss(
  onClose,
  { threshold = DEFAULT_THRESHOLD, velocityThreshold = DEFAULT_VELOCITY, enabled = true } = {},
) {
  const scrollRef = useRef(null);
  const panelRef = useRef(null);
  const backdropRef = useRef(null);
  const sessionRef = useRef(null);
  const offsetRef = useRef(0);
  const rawDyRef = useRef(0);
  const lastYRef = useRef(0);
  const lastTRef = useRef(0);
  const velocityRef = useRef(0);
  const dismissingRef = useRef(false);
  const finishingRef = useRef(false);
  const closedRef = useRef(false);
  const closeTimerRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const gestureOwnedRef = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  onCloseRef.current = onClose;

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  /**
   * Keep the sheet in the same touch-action state as the icon whenever
   * content is at the top — BEFORE any gesture starts.
   */
  const syncTouchAction = useCallback(() => {
    const panel = panelRef.current;
    const scroller = scrollRef.current;
    if (gestureOwnedRef.current || dismissingRef.current) {
      if (panel) panel.style.touchAction = 'none';
      if (scroller) scroller.style.touchAction = 'none';
      return;
    }
    const atTop = !scroller || scroller.scrollTop <= 1;
    if (atTop) {
      if (panel) panel.style.touchAction = 'none';
      if (scroller) scroller.style.touchAction = 'none';
    } else {
      if (panel) panel.style.touchAction = '';
      if (scroller && scroller.dataset.swipeLock !== '1') {
        scroller.style.touchAction = 'pan-y';
      }
    }
  }, []);

  const ownGesture = useCallback(() => {
    gestureOwnedRef.current = true;
    const panel = panelRef.current;
    const scroller = scrollRef.current;
    if (panel) panel.style.touchAction = 'none';
    if (scroller) scroller.style.touchAction = 'none';
  }, []);

  const releaseGesture = useCallback(() => {
    gestureOwnedRef.current = false;
    syncTouchAction();
  }, [syncTouchAction]);

  const lockScroll = useCallback((locked) => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    if (locked) {
      scroller.dataset.swipeLock = '1';
      scroller.style.overflowY = 'hidden';
      scroller.style.touchAction = 'none';
    } else if (scroller.dataset.swipeLock === '1') {
      delete scroller.dataset.swipeLock;
      scroller.style.overflowY = '';
      if (!gestureOwnedRef.current) syncTouchAction();
    }
  }, [syncTouchAction]);

  const resetVisualsForOpen = useCallback(() => {
    closedRef.current = false;
    dismissingRef.current = false;
    finishingRef.current = false;
    offsetRef.current = 0;
    rawDyRef.current = 0;
    gestureOwnedRef.current = false;
    setDismissing(false);
    setDragging(false);
    const panel = panelRef.current;
    const backdrop = backdropRef.current;
    if (panel) {
      panel.style.transform = '';
      panel.style.opacity = '';
      panel.style.transition = '';
      panel.style.willChange = '';
      panel.style.visibility = '';
      panel.style.pointerEvents = '';
    }
    if (backdrop) {
      backdrop.style.opacity = '';
      backdrop.style.transition = '';
      backdrop.style.visibility = '';
      backdrop.style.pointerEvents = '';
    }
    syncTouchAction();
  }, [syncTouchAction]);

  const playExitThenClose = useCallback(() => {
    if (dismissingRef.current || closedRef.current) return;
    dismissingRef.current = true;
    finishingRef.current = true;
    setDismissing(true);
    setDragging(false);
    sessionRef.current = null;
    lockScroll(false);
    releaseGesture();

    const exitY =
      typeof window !== 'undefined'
        ? Math.round(Math.max(window.innerHeight, window.visualViewport?.height || 0) * 1.08)
        : 920;

    const fromY = Math.max(offsetRef.current, 1);
    offsetRef.current = fromY;
    paintPanel(panelRef.current, fromY, { immediate: true, dismissing: false });
    paintBackdrop(backdropRef.current, fromY, { immediate: true, dismissing: false });

    requestAnimationFrame(() => {
      offsetRef.current = exitY;
      paintPanel(panelRef.current, exitY, { immediate: false, dismissing: true });
      paintBackdrop(backdropRef.current, exitY, { immediate: false, dismissing: true });
    });

    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      closedRef.current = true;
      paintPanel(panelRef.current, exitY, { immediate: true, dismissing: true });
      paintBackdrop(backdropRef.current, exitY, { immediate: true, dismissing: true });
      hideGone(panelRef.current, backdropRef.current);
      onCloseRef.current?.();
    }, EXIT_MS + 32);
  }, [clearCloseTimer, lockScroll, releaseGesture]);

  const snapBack = useCallback(() => {
    finishingRef.current = true;
    sessionRef.current = null;
    setDragging(false);
    lockScroll(false);
    releaseGesture();
    offsetRef.current = 0;
    rawDyRef.current = 0;
    paintPanel(panelRef.current, 0, { immediate: false, dismissing: false });
    paintBackdrop(backdropRef.current, 0, { immediate: false, dismissing: false });
    window.setTimeout(() => {
      finishingRef.current = false;
      if (!dismissingRef.current && !closedRef.current) {
        const panel = panelRef.current;
        const backdrop = backdropRef.current;
        if (panel) {
          panel.style.transform = '';
          panel.style.opacity = '';
          panel.style.transition = '';
          panel.style.willChange = '';
        }
        if (backdrop) {
          backdrop.style.opacity = '';
          backdrop.style.transition = '';
        }
      }
      syncTouchAction();
    }, SNAP_MS + 24);
  }, [lockScroll, releaseGesture, syncTouchAction]);

  const endSession = useCallback(
    (shouldClose) => {
      if (dismissingRef.current || closedRef.current) return;
      if (shouldClose) {
        playExitThenClose();
        return;
      }
      snapBack();
    },
    [playExitThenClose, snapBack],
  );

  /** Shared by icon + body — one activation into the follow/fade/close animation. */
  const activateDismiss = useCallback(
    (session) => {
      if (!session || session.active) return;
      session.active = true;
      setDragging(true);
      lockScroll(true);
      ownGesture();
      const cap = panelRef.current || session.target;
      session.captureEl = cap;
      try {
        cap?.setPointerCapture?.(session.id);
      } catch {
        /* ignore */
      }
    },
    [lockScroll, ownGesture],
  );

  const cancelGesture = useCallback(() => {
    if (dismissingRef.current || closedRef.current) return;
    sessionRef.current = null;
    finishingRef.current = false;
    if (offsetRef.current > 0 || dragging) {
      offsetRef.current = 0;
      rawDyRef.current = 0;
      setDragging(false);
      lockScroll(false);
      releaseGesture();
      paintPanel(panelRef.current, 0, { immediate: true });
      paintBackdrop(backdropRef.current, 0, { immediate: true });
    } else {
      releaseGesture();
    }
  }, [dragging, lockScroll, releaseGesture]);

  const begin = useCallback(
    (event, { force = false } = {}) => {
      if (!enabled || dismissingRef.current || finishingRef.current || closedRef.current) {
        return;
      }
      if (event.button != null && event.button !== 0) return;
      if (event.isPrimary === false) return;

      const targetEl = event.target instanceof Element ? event.target : null;
      if (targetEl?.closest?.('[data-swipe-ignore]')) return;

      const fromHandle = Boolean(force || targetEl?.closest?.('[data-swipe-handle]'));
      const scroller = scrollRef.current;
      const atTop = !scroller || scroller.scrollTop <= 1;

      // Body dismiss only when scrolled to top (or from the handle anywhere).
      if (!fromHandle && !atTop) return;

      // Match the icon: own touch-action:none for this gesture path.
      ownGesture();

      finishingRef.current = false;
      sessionRef.current = {
        id: event.pointerId,
        startY: event.clientY,
        startX: event.clientX,
        force: fromHandle,
        active: false,
        target: event.currentTarget,
        startScrollTop: scroller?.scrollTop ?? 0,
      };
      lastYRef.current = event.clientY;
      lastTRef.current = performance.now();
      velocityRef.current = 0;
      rawDyRef.current = 0;
      offsetRef.current = 0;

      // Handle: activate immediately (existing working behavior).
      // Body: activate on vertical-down lock in move() — same activateDismiss().
      if (fromHandle) {
        activateDismiss(sessionRef.current);
      }
    },
    [enabled, activateDismiss, ownGesture],
  );

  const move = useCallback(
    (event) => {
      if (dismissingRef.current || finishingRef.current || closedRef.current) return;
      const session = sessionRef.current;
      if (!session || event.pointerId !== session.id) return;

      const dy = event.clientY - session.startY;
      const dx = event.clientX - session.startX;
      rawDyRef.current = dy;

      if (!session.active) {
        if (Math.abs(dy) < 8 && Math.abs(dx) < 8) return;

        // Finger up at top → content scroll (manual, since touch-action is none).
        if (dy < -8 && Math.abs(dy) > Math.abs(dx)) {
          const scroller = scrollRef.current;
          if (scroller) {
            scroller.scrollTop = Math.max(0, session.startScrollTop - dy);
          }
          session.scrollMode = true;
          return;
        }
        if (session.scrollMode) {
          const scroller = scrollRef.current;
          if (scroller) {
            scroller.scrollTop = Math.max(0, session.startScrollTop - dy);
          }
          return;
        }

        // Vertical down → SAME activateDismiss as the icon.
        if (dy > 0 && Math.abs(dy) >= Math.abs(dx) * 0.85) {
          const scroller = scrollRef.current;
          if (!session.force && scroller && scroller.scrollTop > 1) {
            sessionRef.current = null;
            releaseGesture();
            return;
          }
          activateDismiss(session);
        } else if (Math.abs(dx) > Math.abs(dy)) {
          // Horizontal — abandon dismiss so dish paging can run.
          sessionRef.current = null;
          releaseGesture();
          return;
        } else {
          return;
        }
      }

      const now = performance.now();
      const dt = Math.max(1, now - lastTRef.current);
      const frameV = (event.clientY - lastYRef.current) / dt;
      velocityRef.current = velocityRef.current * 0.5 + frameV * 0.5;
      lastYRef.current = event.clientY;
      lastTRef.current = now;

      if (dy <= 0) {
        offsetRef.current = 0;
        paintPanel(panelRef.current, 0, { immediate: true });
        paintBackdrop(backdropRef.current, 0, { immediate: true });
        return;
      }

      const max =
        typeof window !== 'undefined'
          ? Math.max(window.innerHeight, window.visualViewport?.height || 0) * 0.75
          : 560;
      const resisted = dy * (1 - Math.min(dy / (max * 2.6), 0.18));
      const next = Math.min(resisted, max);
      offsetRef.current = next;
      paintPanel(panelRef.current, next, { immediate: true });
      paintBackdrop(backdropRef.current, next, { immediate: true });

      if (event.cancelable) event.preventDefault();
    },
    [activateDismiss, releaseGesture],
  );

  const end = useCallback(
    (event) => {
      if (dismissingRef.current || closedRef.current) return;
      if (finishingRef.current && !sessionRef.current) return;

      const session = sessionRef.current;
      if (!session) {
        releaseGesture();
        return;
      }
      if (event && event.pointerId != null && event.pointerId !== session.id) return;

      if (session.scrollMode) {
        sessionRef.current = null;
        finishingRef.current = false;
        releaseGesture();
        return;
      }

      const rawDy = Math.max(rawDyRef.current, 0);
      const traveled = offsetRef.current;
      const flicked =
        velocityRef.current > velocityThreshold && rawDy >= threshold * 0.28;
      const shouldClose =
        session.active && (rawDy >= threshold || traveled >= threshold || flicked);

      finishingRef.current = true;
      const pointerId = session.id;
      const cap = session.captureEl || panelRef.current || session.target;
      sessionRef.current = null;

      try {
        cap?.releasePointerCapture?.(pointerId);
      } catch {
        /* ignore */
      }

      endSession(shouldClose);
    },
    [endSession, releaseGesture, threshold, velocityThreshold],
  );

  // Keep touch-action in sync with scroll position (must be set BEFORE gestures).
  useLayoutEffect(() => {
    if (!enabled) return undefined;
    const scroller = scrollRef.current;
    syncTouchAction();
    if (!scroller) return undefined;
    const onScroll = () => syncTouchAction();
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => scroller.removeEventListener('scroll', onScroll);
  }, [enabled, syncTouchAction, dismissing]);

  const wasEnabledRef = useRef(false);
  useEffect(() => {
    if (enabled && !wasEnabledRef.current) resetVisualsForOpen();
    wasEnabledRef.current = Boolean(enabled);
  }, [enabled, resetVisualsForOpen]);

  useEffect(() => {
    if (!dragging) return undefined;
    const onTouchMove = (event) => {
      if (!sessionRef.current?.active || dismissingRef.current) return;
      if (event.cancelable) event.preventDefault();
    };
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => document.removeEventListener('touchmove', onTouchMove);
  }, [dragging]);

  useLayoutEffect(() => {
    if (dismissingRef.current || closedRef.current) return;
    if (dragging || offsetRef.current > 0) {
      paintPanel(panelRef.current, offsetRef.current, { immediate: true });
      paintBackdrop(backdropRef.current, offsetRef.current, { immediate: true });
    }
  }, [dragging, dismissing]);

  useEffect(
    () => () => {
      clearCloseTimer();
      lockScroll(false);
      gestureOwnedRef.current = false;
    },
    [clearCloseTimer, lockScroll],
  );

  // Icon entry — force-activate; same move/end/playExitThenClose as the body.
  const handleProps = {
    onPointerDown: (event) => {
      event.stopPropagation();
      begin(event, { force: true });
    },
    onPointerMove: move,
    onPointerUp: end,
    onPointerCancel: end,
    onLostPointerCapture: (event) => {
      if (!sessionRef.current || finishingRef.current || dismissingRef.current) return;
      end(event);
    },
  };

  // Full-card entry via capture so one listener covers the whole sheet
  // (including scroll children) without depending on bubble from nested nodes.
  const surfaceProps = {
    onPointerDownCapture: (event) => begin(event, { force: false }),
    onPointerMoveCapture: move,
    onPointerUpCapture: end,
    onPointerCancelCapture: end,
    onLostPointerCapture: (event) => {
      if (!sessionRef.current || finishingRef.current || dismissingRef.current) return;
      end(event);
    },
  };

  const active = dragging || dismissing || offsetRef.current > 0;

  const panelStyle =
    dismissing || dragging
      ? {
          transition: 'none',
          willChange: 'transform, opacity',
          overscrollBehavior: 'none',
          touchAction: 'none',
        }
      : { overscrollBehavior: 'none' };

  const backdropStyle =
    dismissing || dragging
      ? { transition: 'none', willChange: 'opacity' }
      : undefined;

  return {
    scrollRef,
    panelRef,
    backdropRef,
    offsetY: offsetRef.current,
    dragging,
    dismissing,
    active,
    panelStyle,
    backdropStyle,
    handleProps,
    scrollProps: surfaceProps,
    panelProps: surfaceProps,
    surfaceProps,
    cancelGesture,
    syncTouchAction,
  };
}
