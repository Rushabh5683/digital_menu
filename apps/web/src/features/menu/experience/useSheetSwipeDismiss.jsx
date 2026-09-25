import { useCallback, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

const DEFAULT_THRESHOLD = 72;
const DEFAULT_VELOCITY = 0.45; // px/ms — reachable on real phones
const EXIT_MS = 420;
const SNAP_MS = 320;
const EXIT_EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
const FADE_EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';

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
        'flex shrink-0 touch-none cursor-grab flex-col items-center justify-center active:cursor-grabbing',
        onHero ? 'px-6 pb-1 pt-2.5' : 'px-6 pb-1 pt-2',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...handleProps}
    >
      <span
        className={[
          'block h-1 w-10 rounded-full',
          onHero ? 'bg-white/85 shadow-sm' : 'bg-stone-300',
        ].join(' ')}
      />
      <ChevronDown
        className={[
          'mt-0.5 h-4 w-4',
          onHero ? 'text-white/90 drop-shadow-sm' : 'text-stone-400',
        ].join(' ')}
        strokeWidth={2.4}
        aria-hidden
      />
    </div>
  );
}

/**
 * One-finger swipe-down dismiss for guest menu bottom sheets.
 * Plays a full slide-away + fade before calling onClose so the close feels clear.
 */
export function useSheetSwipeDismiss(
  onClose,
  { threshold = DEFAULT_THRESHOLD, velocityThreshold = DEFAULT_VELOCITY, enabled = true } = {},
) {
  const scrollRef = useRef(null);
  const [offsetY, setOffsetY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const sessionRef = useRef(null);
  const offsetRef = useRef(0);
  const lastYRef = useRef(0);
  const lastTRef = useRef(0);
  const velocityRef = useRef(0);
  const dismissingRef = useRef(false);
  const closeTimerRef = useRef(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const playExitThenClose = useCallback(() => {
    if (dismissingRef.current) return;
    dismissingRef.current = true;
    setDismissing(true);
    setDragging(false);
    sessionRef.current = null;

    const exitY =
      typeof window !== 'undefined'
        ? Math.round(window.innerHeight * 1.05)
        : 900;
    offsetRef.current = exitY;
    setOffsetY(exitY);

    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      onClose?.();
      // Reset for next open if the host stays mounted
      dismissingRef.current = false;
      setDismissing(false);
      offsetRef.current = 0;
      setOffsetY(0);
    }, EXIT_MS);
  }, [clearCloseTimer, onClose]);

  const endSession = useCallback(
    (shouldClose) => {
      sessionRef.current = null;
      setDragging(false);
      if (shouldClose) {
        playExitThenClose();
        return;
      }
      requestAnimationFrame(() => {
        offsetRef.current = 0;
        setOffsetY(0);
      });
    },
    [playExitThenClose],
  );

  const begin = useCallback(
    (event, { force = false } = {}) => {
      if (!enabled || dismissingRef.current) return;
      if (event.button != null && event.button !== 0) return;
      if (event.isPrimary === false) return;

      const scroller = scrollRef.current;
      const atTop = force || !scroller || scroller.scrollTop <= 1;
      sessionRef.current = {
        id: event.pointerId,
        startY: event.clientY,
        startX: event.clientX,
        force,
        atTop,
        active: Boolean(force),
      };
      lastYRef.current = event.clientY;
      lastTRef.current = performance.now();
      velocityRef.current = 0;

      if (force) setDragging(true);

      try {
        event.currentTarget.setPointerCapture?.(event.pointerId);
      } catch {
        /* ignore */
      }
    },
    [enabled],
  );

  const move = useCallback((event) => {
    if (dismissingRef.current) return;
    const session = sessionRef.current;
    if (!session || event.pointerId !== session.id) return;

    const dy = event.clientY - session.startY;
    const dx = event.clientX - session.startX;

    if (!session.active) {
      if (Math.abs(dy) < 8 && Math.abs(dx) < 8) return;
      // Prefer vertical-down dismiss over horizontal when clearly downward.
      if (dy > 0 && Math.abs(dy) >= Math.abs(dx) * 0.85) {
        const scroller = scrollRef.current;
        if (!session.force && scroller && scroller.scrollTop > 1) {
          sessionRef.current = null;
          return;
        }
        session.active = true;
        setDragging(true);
      } else if (Math.abs(dx) > Math.abs(dy)) {
        sessionRef.current = null;
        return;
      } else {
        // Upward / scroll — abandon dismiss
        sessionRef.current = null;
        return;
      }
    }

    const now = performance.now();
    const dt = Math.max(1, now - lastTRef.current);
    // EMA velocity so one noisy frame doesn't decide dismiss.
    const frameV = (event.clientY - lastYRef.current) / dt;
    velocityRef.current = velocityRef.current * 0.55 + frameV * 0.45;
    lastYRef.current = event.clientY;
    lastTRef.current = now;

    if (dy <= 0) {
      offsetRef.current = 0;
      setOffsetY(0);
      return;
    }

    const max = typeof window !== 'undefined' ? window.innerHeight * 0.7 : 520;
    const resisted = dy * (1 - Math.min(dy / (max * 2.4), 0.22));
    const next = Math.min(resisted, max);
    offsetRef.current = next;
    setOffsetY(next);

    if (event.cancelable && session.active) {
      event.preventDefault();
    }
  }, []);

  const end = useCallback(
    (event) => {
      if (dismissingRef.current) return;
      const session = sessionRef.current;
      if (!session) return;
      if (event && event.pointerId != null && event.pointerId !== session.id) return;

      const traveled = offsetRef.current;
      const flicked = velocityRef.current > velocityThreshold && traveled >= threshold * 0.35;
      const shouldClose =
        session.active && (traveled >= threshold || flicked);

      try {
        event?.currentTarget?.releasePointerCapture?.(session.id);
      } catch {
        /* ignore */
      }

      endSession(shouldClose);
    },
    [endSession, threshold, velocityThreshold],
  );

  const handleProps = {
    onPointerDown: (event) => begin(event, { force: true }),
    onPointerMove: move,
    onPointerUp: end,
    onPointerCancel: end,
    onLostPointerCapture: end,
  };

  const scrollProps = {
    onPointerDown: (event) => begin(event, { force: false }),
    onPointerMove: move,
    onPointerUp: end,
    onPointerCancel: end,
    onLostPointerCapture: end,
  };

  const progress = Math.min(1, offsetY / Math.max(threshold, 1));
  const active = offsetY > 0 || dragging || dismissing;

  const panelStyle = active
    ? {
        transform: `translate3d(0, ${offsetY}px, 0) scale(${1 - Math.min(progress, 1) * 0.03})`,
        opacity: dismissing ? 0 : Math.max(0.45, 1 - progress * 0.45),
        transition: dragging
          ? 'none'
          : [
              `transform ${dismissing ? EXIT_MS : SNAP_MS}ms ${EXIT_EASE}`,
              `opacity ${dismissing ? EXIT_MS : SNAP_MS}ms ${FADE_EASE}`,
            ].join(', '),
        willChange: 'transform, opacity',
      }
    : undefined;

  const backdropStyle = active
    ? {
        opacity: dismissing ? 0 : Math.max(0.12, 1 - progress * 0.9),
        transition: dragging
          ? 'none'
          : `opacity ${dismissing ? EXIT_MS : SNAP_MS}ms ${FADE_EASE}`,
      }
    : undefined;

  return {
    scrollRef,
    offsetY,
    dragging,
    dismissing,
    active,
    panelStyle,
    backdropStyle,
    handleProps,
    scrollProps,
  };
}
