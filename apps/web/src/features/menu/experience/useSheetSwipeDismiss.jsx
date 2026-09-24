import { useCallback, useRef, useState } from 'react';

const DEFAULT_THRESHOLD = 108;
const DEFAULT_VELOCITY = 0.7; // px/ms

/**
 * One-finger swipe-down dismiss for guest menu bottom sheets.
 * No UI — attach handleProps / scrollProps / panelStyle to existing elements.
 */
export function useSheetSwipeDismiss(
  onClose,
  { threshold = DEFAULT_THRESHOLD, velocityThreshold = DEFAULT_VELOCITY, enabled = true } = {},
) {
  const scrollRef = useRef(null);
  const [offsetY, setOffsetY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const sessionRef = useRef(null);
  const offsetRef = useRef(0);
  const lastYRef = useRef(0);
  const lastTRef = useRef(0);
  const velocityRef = useRef(0);

  const endSession = useCallback(
    (shouldClose) => {
      sessionRef.current = null;
      setDragging(false);
      if (shouldClose) {
        setOffsetY((current) => Math.max(current, threshold + 48));
        onClose?.();
        return;
      }
      requestAnimationFrame(() => {
        offsetRef.current = 0;
        setOffsetY(0);
      });
    },
    [onClose, threshold],
  );

  const begin = useCallback(
    (event, { force = false } = {}) => {
      if (!enabled) return;
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
    const session = sessionRef.current;
    if (!session || event.pointerId !== session.id) return;

    const dy = event.clientY - session.startY;
    const dx = event.clientX - session.startX;

    if (!session.active) {
      if (Math.abs(dy) < 10 && Math.abs(dx) < 10) return;
      if (Math.abs(dx) > Math.abs(dy)) {
        sessionRef.current = null;
        return;
      }
      if (dy <= 0) {
        sessionRef.current = null;
        return;
      }
      const scroller = scrollRef.current;
      if (!session.force && scroller && scroller.scrollTop > 1) {
        sessionRef.current = null;
        return;
      }
      session.active = true;
      setDragging(true);
    }

    const now = performance.now();
    const dt = Math.max(1, now - lastTRef.current);
    velocityRef.current = (event.clientY - lastYRef.current) / dt;
    lastYRef.current = event.clientY;
    lastTRef.current = now;

    if (dy <= 0) {
      offsetRef.current = 0;
      setOffsetY(0);
      return;
    }

    const max = typeof window !== 'undefined' ? window.innerHeight * 0.6 : 420;
    const next = Math.min(dy * 0.94, max);
    offsetRef.current = next;
    setOffsetY(next);

    if (event.cancelable && session.active) {
      event.preventDefault();
    }
  }, []);

  const end = useCallback(
    (event) => {
      const session = sessionRef.current;
      if (!session) return;
      if (event && event.pointerId != null && event.pointerId !== session.id) return;

      const shouldClose =
        session.active &&
        (offsetRef.current >= threshold || velocityRef.current > velocityThreshold);

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
  };

  const scrollProps = {
    onPointerDown: (event) => begin(event, { force: false }),
    onPointerMove: move,
    onPointerUp: end,
    onPointerCancel: end,
  };

  const panelStyle =
    offsetY > 0 || dragging
      ? {
          transform: `translate3d(0, ${offsetY}px, 0)`,
          transition: dragging
            ? 'none'
            : 'transform 0.34s cubic-bezier(0.22, 1, 0.36, 1)',
          willChange: 'transform',
        }
      : undefined;

  return {
    scrollRef,
    offsetY,
    dragging,
    panelStyle,
    handleProps,
    scrollProps,
  };
}
