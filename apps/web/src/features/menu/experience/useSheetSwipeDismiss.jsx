import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

/** Finger travel (px) required to commit close — uses RAW dy, not resisted visual offset. */
const DEFAULT_THRESHOLD = 56;
const DEFAULT_VELOCITY = 0.35; // px/ms
const EXIT_MS = 380;
const SNAP_MS = 280;
const EXIT_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

/**
 * Center-top affordance so guests know swipe-down closes the sheet.
 * Spread `handleProps` from useSheetSwipeDismiss onto this (force dismiss).
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

/**
 * One-finger swipe-down dismiss for guest menu bottom sheets.
 *
 * Transform is painted directly on panelRef during the gesture (no React/Framer
 * fighting). Close commits on RAW finger distance so Android resistance cannot
 * block dismiss.
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
  const closeTimerRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

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
      scroller.style.touchAction = '';
    }
  }, []);

  const playExitThenClose = useCallback(() => {
    if (dismissingRef.current) return;
    dismissingRef.current = true;
    finishingRef.current = true;
    setDismissing(true);
    setDragging(false);
    sessionRef.current = null;
    lockScroll(false);

    const exitY =
      typeof window !== 'undefined'
        ? Math.round(Math.max(window.innerHeight, window.visualViewport?.height || 0) * 1.08)
        : 920;

    // Continue downward from the live drag position — never snap up first.
    const fromY = Math.max(offsetRef.current, 1);
    offsetRef.current = fromY;
    paintPanel(panelRef.current, fromY, { immediate: true, dismissing: false });
    paintBackdrop(backdropRef.current, fromY, { immediate: true, dismissing: false });

    // Next frame: animate to off-screen + fade
    requestAnimationFrame(() => {
      offsetRef.current = exitY;
      paintPanel(panelRef.current, exitY, { immediate: false, dismissing: true });
      paintBackdrop(backdropRef.current, exitY, { immediate: false, dismissing: true });
    });

    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      onClose?.();
      dismissingRef.current = false;
      finishingRef.current = false;
      setDismissing(false);
      offsetRef.current = 0;
      rawDyRef.current = 0;
      if (panelRef.current) {
        panelRef.current.style.transform = '';
        panelRef.current.style.opacity = '';
        panelRef.current.style.transition = '';
        panelRef.current.style.willChange = '';
      }
      if (backdropRef.current) {
        backdropRef.current.style.opacity = '';
        backdropRef.current.style.transition = '';
      }
    }, EXIT_MS + 32);
  }, [clearCloseTimer, lockScroll, onClose]);

  const snapBack = useCallback(() => {
    finishingRef.current = true;
    sessionRef.current = null;
    setDragging(false);
    lockScroll(false);
    offsetRef.current = 0;
    rawDyRef.current = 0;
    paintPanel(panelRef.current, 0, { immediate: false, dismissing: false });
    paintBackdrop(backdropRef.current, 0, { immediate: false, dismissing: false });
    window.setTimeout(() => {
      finishingRef.current = false;
      if (panelRef.current && !dismissingRef.current) {
        panelRef.current.style.transform = '';
        panelRef.current.style.opacity = '';
        panelRef.current.style.transition = '';
        panelRef.current.style.willChange = '';
      }
      if (backdropRef.current && !dismissingRef.current) {
        backdropRef.current.style.opacity = '';
        backdropRef.current.style.transition = '';
      }
    }, SNAP_MS + 24);
  }, [lockScroll]);

  const endSession = useCallback(
    (shouldClose) => {
      if (dismissingRef.current) return;
      if (shouldClose) {
        playExitThenClose();
        return;
      }
      snapBack();
    },
    [playExitThenClose, snapBack],
  );

  const begin = useCallback(
    (event, { force = false } = {}) => {
      if (!enabled || dismissingRef.current || finishingRef.current) return;
      if (event.button != null && event.button !== 0) return;
      if (event.isPrimary === false) return;

      finishingRef.current = false;
      sessionRef.current = {
        id: event.pointerId,
        startY: event.clientY,
        startX: event.clientX,
        force,
        active: Boolean(force),
        target: event.currentTarget,
      };
      lastYRef.current = event.clientY;
      lastTRef.current = performance.now();
      velocityRef.current = 0;
      rawDyRef.current = 0;
      offsetRef.current = 0;

      if (force) {
        setDragging(true);
        lockScroll(true);
      }

      try {
        event.currentTarget.setPointerCapture?.(event.pointerId);
      } catch {
        /* ignore */
      }
    },
    [enabled, lockScroll],
  );

  const move = useCallback(
    (event) => {
      if (dismissingRef.current || finishingRef.current) return;
      const session = sessionRef.current;
      if (!session || event.pointerId !== session.id) return;

      const dy = event.clientY - session.startY;
      const dx = event.clientX - session.startX;
      rawDyRef.current = dy;

      if (!session.active) {
        if (Math.abs(dy) < 10 && Math.abs(dx) < 10) return;
        if (dy > 0 && Math.abs(dy) >= Math.abs(dx) * 0.9) {
          const scroller = scrollRef.current;
          if (!session.force && scroller && scroller.scrollTop > 1) {
            sessionRef.current = null;
            return;
          }
          session.active = true;
          setDragging(true);
          lockScroll(true);
        } else {
          sessionRef.current = null;
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
      // Light resistance for feel only — commit uses rawDy, not this value.
      const resisted = dy * (1 - Math.min(dy / (max * 2.6), 0.18));
      const next = Math.min(resisted, max);
      offsetRef.current = next;
      paintPanel(panelRef.current, next, { immediate: true });
      paintBackdrop(backdropRef.current, next, { immediate: true });

      if (event.cancelable) event.preventDefault();
    },
    [lockScroll],
  );

  const end = useCallback(
    (event) => {
      if (dismissingRef.current) return;
      // Ignore duplicate end from lostpointercapture after pointerup already finished.
      if (finishingRef.current && !sessionRef.current) return;

      const session = sessionRef.current;
      if (!session) return;
      if (event && event.pointerId != null && event.pointerId !== session.id) return;

      const rawDy = Math.max(rawDyRef.current, 0);
      const traveled = offsetRef.current;
      const flicked =
        velocityRef.current > velocityThreshold && rawDy >= threshold * 0.28;
      // Commit on RAW finger distance so Android resistance cannot block close.
      const shouldClose =
        session.active && (rawDy >= threshold || traveled >= threshold || flicked);

      // Mark finishing BEFORE releaseCapture so lostpointercapture is a no-op.
      finishingRef.current = true;
      const pointerId = session.id;
      const target = session.target || event?.currentTarget;
      sessionRef.current = null;

      try {
        target?.releasePointerCapture?.(pointerId);
      } catch {
        /* ignore */
      }

      endSession(shouldClose);
    },
    [endSession, threshold, velocityThreshold],
  );

  // Non-passive document touchmove while dragging so iOS/Android can't rubber-band.
  useEffect(() => {
    if (!dragging) return undefined;
    const onTouchMove = (event) => {
      if (!sessionRef.current?.active || dismissingRef.current) return;
      if (event.cancelable) event.preventDefault();
    };
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => document.removeEventListener('touchmove', onTouchMove);
  }, [dragging]);

  // Re-apply DOM paint after React style reconciliation (prevents transform wipe).
  useLayoutEffect(() => {
    if (dismissingRef.current) return;
    if (dragging || offsetRef.current > 0) {
      paintPanel(panelRef.current, offsetRef.current, {
        immediate: true,
        dismissing: false,
      });
      paintBackdrop(backdropRef.current, offsetRef.current, {
        immediate: true,
        dismissing: false,
      });
    }
  }, [dragging, dismissing]);

  useEffect(
    () => () => {
      clearCloseTimer();
      lockScroll(false);
    },
    [clearCloseTimer, lockScroll],
  );

  const handleProps = {
    onPointerDown: (event) => begin(event, { force: true }),
    onPointerMove: move,
    onPointerUp: end,
    onPointerCancel: end,
    onLostPointerCapture: (event) => {
      // Only treat as end if this gesture is still live (not after a clean pointerup).
      if (!sessionRef.current || finishingRef.current || dismissingRef.current) return;
      end(event);
    },
  };

  const scrollProps = {
    onPointerDown: (event) => begin(event, { force: false }),
    onPointerMove: move,
    onPointerUp: end,
    onPointerCancel: end,
    onLostPointerCapture: (event) => {
      if (!sessionRef.current || finishingRef.current || dismissingRef.current) return;
      end(event);
    },
  };

  const active = dragging || dismissing || offsetRef.current > 0;

  // React style fallback for first paint / hosts that don't attach panelRef yet.
  // During gesture, paintPanel writes transform directly (preferred).
  const panelStyle =
    dismissing || dragging
      ? {
          // Keep host from applying a conflicting transition while we paint via ref.
          transition: 'none',
          willChange: 'transform, opacity',
          overscrollBehavior: 'none',
        }
      : {
          overscrollBehavior: 'none',
        };

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
    scrollProps,
  };
}
