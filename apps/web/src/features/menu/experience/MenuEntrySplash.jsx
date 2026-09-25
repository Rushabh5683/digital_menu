import { useEffect, useRef, useState } from 'react';
import {
  motion,
  useMotionValue,
  useReducedMotion,
  animate,
} from 'framer-motion';
import { ChevronUp, Pause, Sparkles } from 'lucide-react';
import { resolveMediaUrl } from '../../../shared/lib/mediaUrl.js';

const SPLASH_MS = 4200;
const EXIT_MS = 520;
const ACCENT = '#E85D24';
const INK = '#1C1917';
const MUTED = '#78716C';
const BG = '#FAF8F5';

/** Gesture thresholds (px / px-per-ms). */
const SWIPE_ARM = 12;
const SWIPE_COMMIT = 72;
const SWIPE_FLICK = 0.55;
const EXIT_EASE = [0.22, 1, 0.36, 1];

/** Phase machine — single source of truth for gesture/animation. */
const PHASE = {
  IDLE: 'idle',
  DRAGGING: 'dragging',
  EXITING: 'exiting',
  DONE: 'done',
};

function shortLocation(address) {
  if (!address || typeof address !== 'string') return null;
  const cleaned = address.trim().replace(/\s+/g, ' ').toUpperCase();
  if (!cleaned) return null;
  return cleaned.length > 38 ? `${cleaned.slice(0, 36).trim()}…` : cleaned;
}

function SwipeUpHint({ accent, reducedMotion, active }) {
  return (
    <div
      className="pointer-events-none flex flex-col items-center gap-2 pb-1.5"
      aria-hidden
    >
      <motion.div
        className="flex h-11 w-11 items-center justify-center rounded-full border border-[#e8dfd0]/90 bg-[#f5efe6]/95 shadow-[0_6px_18px_-10px_rgba(28,25,23,0.35)] backdrop-blur-sm"
        animate={
          reducedMotion || active
            ? { y: active ? -6 : 0, scale: active ? 1.06 : 1 }
            : { y: [0, -8, 0], scale: [1, 1.04, 1] }
        }
        transition={
          reducedMotion || active
            ? { type: 'spring', stiffness: 420, damping: 28 }
            : { duration: 1.35, repeat: Infinity, ease: [0.22, 1, 0.36, 1] }
        }
      >
        <motion.span
          style={{ color: accent }}
          animate={
            reducedMotion || active
              ? { opacity: 1 }
              : { opacity: [0.55, 1, 0.55] }
          }
          transition={
            reducedMotion || active
              ? { duration: 0.2 }
              : { duration: 1.35, repeat: Infinity, ease: 'easeInOut' }
          }
        >
          <ChevronUp className="h-6 w-6" strokeWidth={2.6} />
        </motion.span>
      </motion.div>

      <div className="relative flex h-5 w-7 items-center justify-center overflow-hidden">
        {[0, 1].map((i) => (
          <motion.span
            key={i}
            className="absolute left-1/2 -translate-x-1/2"
            style={{ color: accent }}
            animate={
              reducedMotion || active
                ? { opacity: 0, y: -8 }
                : {
                    opacity: [0, 0.7, 0],
                    y: [6, -4, -12],
                  }
            }
            transition={
              reducedMotion || active
                ? { duration: 0.2 }
                : {
                    duration: 1.35,
                    repeat: Infinity,
                    ease: [0.22, 1, 0.36, 1],
                    delay: 0.12 + i * 0.16,
                  }
            }
          >
            <ChevronUp className="h-3.5 w-3.5" strokeWidth={2.4} />
          </motion.span>
        ))}
      </div>

      <motion.p
        className="text-[10px] font-semibold uppercase tracking-[0.16em]"
        style={{ color: MUTED }}
        animate={
          reducedMotion || active
            ? { opacity: active ? 0.95 : 0.75 }
            : { opacity: [0.45, 0.9, 0.45] }
        }
        transition={
          reducedMotion || active
            ? { duration: 0.2 }
            : { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }
        }
      >
        {active ? 'Release to enter' : 'Swipe up to skip'}
      </motion.p>
    </div>
  );
}

/**
 * Welcome splash shown immediately on QR open.
 *
 * Animation ownership (single controller):
 *   Framer motion values (y / opacity / scale) + imperative animate()
 *   — never CSS transform transitions on the same node.
 *
 * Phase machine:
 *   idle → dragging → exiting → done
 * Once EXITING, gestures are ignored and transforms are never reset.
 */
export function MenuEntrySplash({
  restaurant,
  tableLabel,
  durationMs = SPLASH_MS,
  canFinish = true,
  onEnter,
}) {
  const reduceMotion = useReducedMotion();
  const rootRef = useRef(null);
  const swipeZoneRef = useRef(null);

  const [holding, setHolding] = useState(false);
  const [remainingMs, setRemainingMs] = useState(durationMs);
  const [timerDone, setTimerDone] = useState(false);
  const [draggingUi, setDraggingUi] = useState(false);
  const [exitingUi, setExitingUi] = useState(false);
  const [entered, setEntered] = useState(false);

  // ONE owner of splash transform/opacity
  const y = useMotionValue(0);
  const opacity = useMotionValue(1);
  const scale = useMotionValue(1);

  const phaseRef = useRef(PHASE.IDLE);
  const remainingRef = useRef(durationMs);
  const lastTickRef = useRef(null);
  const timerDoneRef = useRef(false);
  const canFinishRef = useRef(canFinish);
  const reduceMotionRef = useRef(reduceMotion);
  const onEnterRef = useRef(onEnter);
  const animRef = useRef(null);
  const gestureRef = useRef(null);

  canFinishRef.current = canFinish;
  reduceMotionRef.current = reduceMotion;
  onEnterRef.current = onEnter;

  const stopAnim = () => {
    if (animRef.current) {
      try {
        animRef.current.stop();
      } catch {
        /* ignore */
      }
      animRef.current = null;
    }
  };

  const lockInteraction = () => {
    const root = rootRef.current;
    if (root) {
      root.style.pointerEvents = 'none';
      root.style.touchAction = 'none';
    }
    const zone = swipeZoneRef.current;
    if (zone) {
      zone.style.pointerEvents = 'none';
      zone.style.touchAction = 'none';
    }
  };

  const completeEnter = () => {
    if (phaseRef.current === PHASE.DONE) return;
    phaseRef.current = PHASE.DONE;
    stopAnim();
    lockInteraction();
    setEntered(true);
    onEnterRef.current?.();
  };

  const beginExit = (fromSwipe) => {
    if (phaseRef.current === PHASE.EXITING || phaseRef.current === PHASE.DONE) {
      return;
    }
    phaseRef.current = PHASE.EXITING;
    gestureRef.current = null;

    // Synchronous DOM lock — do not wait for React re-render (Android race).
    lockInteraction();
    setDraggingUi(false);
    setHolding(false);
    setExitingUi(true);
    timerDoneRef.current = true;
    remainingRef.current = 0;
    setRemainingMs(0);
    setTimerDone(true);

    stopAnim();

    if (reduceMotionRef.current) {
      opacity.set(0);
      y.set(0);
      scale.set(1);
      completeEnter();
      return;
    }

    const viewportH =
      typeof window !== 'undefined'
        ? Math.max(window.innerHeight || 0, window.visualViewport?.height || 0, 640)
        : 800;

    const currentY = y.get();
    // Always continue upward from the live drag position — never jump back to 0.
    const targetY = fromSwipe
      ? Math.min(currentY, -1) - viewportH
      : -Math.round(Math.min(viewportH * 0.22, 160));

    const duration = EXIT_MS / 1000;

    // Drive exit with a single primary animation; opacity/scale are secondary.
    // onComplete is the completion source of truth (not transitionend / Promise races).
    const primary = animate(y, targetY, {
      duration,
      ease: EXIT_EASE,
      onComplete: () => {
        animRef.current = null;
        completeEnter();
      },
    });
    animRef.current = primary;

    animate(opacity, 0, {
      duration: duration * 0.85,
      ease: [0.4, 0, 1, 1],
    });
    animate(scale, fromSwipe ? 0.97 : 0.99, {
      duration,
      ease: EXIT_EASE,
    });
  };

  // Auto-enter when countdown finishes (and menu data is ready).
  useEffect(() => {
    canFinishRef.current = canFinish;
    if (
      timerDone &&
      canFinish &&
      phaseRef.current !== PHASE.EXITING &&
      phaseRef.current !== PHASE.DONE
    ) {
      beginExit(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerDone, canFinish]);

  // Countdown — UI updates throttled; never runs while dragging/exiting.
  useEffect(() => {
    if (
      holding ||
      draggingUi ||
      phaseRef.current === PHASE.EXITING ||
      phaseRef.current === PHASE.DONE ||
      timerDoneRef.current
    ) {
      lastTickRef.current = null;
      return undefined;
    }

    lastTickRef.current = performance.now();
    let frameId = 0;
    let lastUiWrite = 0;

    const tick = (now) => {
      if (
        phaseRef.current === PHASE.EXITING ||
        phaseRef.current === PHASE.DONE ||
        timerDoneRef.current
      ) {
        return;
      }
      const last = lastTickRef.current ?? now;
      lastTickRef.current = now;
      const next = Math.max(0, remainingRef.current - (now - last));
      remainingRef.current = next;

      // Throttle React writes (~8fps) so swipe gesture stays smooth on mobile.
      if (now - lastUiWrite > 120 || next <= 0) {
        lastUiWrite = now;
        setRemainingMs(next);
      }

      if (next <= 0) {
        timerDoneRef.current = true;
        setTimerDone(true);
        return;
      }
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [holding, draggingUi, exitingUi]);

  useEffect(
    () => () => {
      // If we unmount mid-exit, still hand off to the menu (never leave parent stuck).
      if (phaseRef.current === PHASE.EXITING) {
        phaseRef.current = PHASE.DONE;
        try {
          onEnterRef.current?.();
        } catch {
          /* ignore */
        }
      }
      stopAnim();
    },
    [],
  );

  // Non-passive touchmove so vertical skip can preventDefault on Android Chrome.
  useEffect(() => {
    const el = swipeZoneRef.current;
    if (!el) return undefined;
    const onTouchMove = (event) => {
      if (phaseRef.current === PHASE.DRAGGING && event.cancelable) {
        event.preventDefault();
      }
    };
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => el.removeEventListener('touchmove', onTouchMove);
  }, []);

  if (entered) return null;

  const progress = 1 - remainingMs / durationMs;
  const secondsLeft = Math.max(1, Math.ceil(remainingMs / 1000));
  const name = restaurant?.name || 'our restaurant';
  const tagline =
    restaurant?.brandTagline?.trim() || 'From our kitchen to your table.';
  const location = shortLocation(restaurant?.address) || 'TABLE SERVICE';
  const tablePart = (tableLabel || 'Your table').toUpperCase();
  const accentLine = restaurant?.brandTagline?.trim()
    ? `${tablePart} · ${restaurant.brandTagline.trim().toUpperCase()}`
    : tablePart;
  const logoSrc =
    resolveMediaUrl(restaurant?.logo || restaurant?.logoUrl || '') || null;

  const setHold = (value) => {
    if (phaseRef.current !== PHASE.IDLE) return;
    setHolding(value);
  };

  const snapBack = () => {
    if (phaseRef.current !== PHASE.IDLE && phaseRef.current !== PHASE.DRAGGING) {
      return;
    }
    phaseRef.current = PHASE.IDLE;
    setDraggingUi(false);
    stopAnim();
    animRef.current = animate(y, 0, {
      type: 'spring',
      stiffness: 460,
      damping: 40,
      mass: 0.7,
      onComplete: () => {
        animRef.current = null;
      },
    });
    animate(opacity, 1, { duration: 0.18 });
    animate(scale, 1, { type: 'spring', stiffness: 460, damping: 40 });
  };

  const onSwipePointerDown = (event) => {
    if (phaseRef.current === PHASE.EXITING || phaseRef.current === PHASE.DONE) {
      return;
    }
    if (event.button != null && event.button !== 0) return;
    if (event.isPrimary === false) return;

    // Interrupt in-flight snap-back only (never touch EXITING transforms).
    if (phaseRef.current === PHASE.IDLE || phaseRef.current === PHASE.DRAGGING) {
      stopAnim();
      // Continue from live position if a snap-back was mid-flight.
      // Fresh idle starts from settled zero.
      if (Math.abs(y.get()) < 1) {
        y.set(0);
        opacity.set(1);
        scale.set(1);
      }
    }

    phaseRef.current = PHASE.IDLE;
    gestureRef.current = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastY: event.clientY,
      lastT: event.timeStamp || performance.now(),
      velocity: 0,
      axis: null, // null | 'vertical' | 'horizontal'
      captured: false,
    };

    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
      gestureRef.current.captured = true;
    } catch {
      /* ignore */
    }
  };

  const onSwipePointerMove = (event) => {
    if (phaseRef.current === PHASE.EXITING || phaseRef.current === PHASE.DONE) {
      return;
    }
    const g = gestureRef.current;
    if (!g || event.pointerId !== g.id) return;

    const now = event.timeStamp || performance.now();
    const dt = Math.max(1, now - g.lastT);
    const frameDy = event.clientY - g.lastY;
    g.velocity = g.velocity * 0.55 + (frameDy / dt) * 0.45;
    g.lastY = event.clientY;
    g.lastT = now;

    const dx = event.clientX - g.startX;
    const dy = g.startY - event.clientY; // up = positive

    if (!g.axis) {
      if (Math.abs(dx) < SWIPE_ARM && Math.abs(dy) < SWIPE_ARM) return;
      if (Math.abs(dy) > Math.abs(dx) * 1.1 && dy > 0) {
        g.axis = 'vertical';
        phaseRef.current = PHASE.DRAGGING;
        setHolding(false);
        setDraggingUi(true);
      } else {
        // Not an upward swipe — release capture so the browser/page stays free.
        g.axis = 'ignored';
        if (g.captured) {
          try {
            event.currentTarget.releasePointerCapture?.(event.pointerId);
          } catch {
            /* ignore */
          }
          g.captured = false;
        }
        gestureRef.current = null;
        phaseRef.current = PHASE.IDLE;
        return;
      }
    }

    if (g.axis !== 'vertical') return;
    if (phaseRef.current !== PHASE.DRAGGING) return;

    const viewportH = window.innerHeight || 800;
    const raw = Math.max(dy, 0);
    const resisted = raw * (1 - Math.min(raw / (viewportH * 2.4), 0.28));
    const nextY = -Math.min(resisted, viewportH * 0.42);
    y.set(nextY);

    const p = Math.min(1, -nextY / SWIPE_COMMIT);
    opacity.set(Math.max(0.62, 1 - p * 0.28));
    scale.set(1 - p * 0.015);

    if (event.cancelable) event.preventDefault();

    const flicked = g.velocity < -SWIPE_FLICK && -nextY >= SWIPE_COMMIT * 0.45;
    if (-nextY >= SWIPE_COMMIT || flicked) {
      beginExit(true);
      // Drop capture after phase lock so lostpointercapture cannot snap-back.
      if (g.captured) {
        try {
          event.currentTarget.releasePointerCapture?.(event.pointerId);
        } catch {
          /* ignore */
        }
      }
      gestureRef.current = null;
    }
  };

  const endSwipeGesture = (event) => {
    const g = gestureRef.current;
    // Exit already owns the animation — ignore late pointerup/cancel/lostcapture.
    if (phaseRef.current === PHASE.EXITING || phaseRef.current === PHASE.DONE) {
      gestureRef.current = null;
      return;
    }
    if (!g || (event?.pointerId != null && event.pointerId !== g.id)) {
      return;
    }

    const wasVertical = g.axis === 'vertical';
    const traveled = -y.get();
    const velocity = g.velocity;
    gestureRef.current = null;

    if (g.captured) {
      try {
        event?.currentTarget?.releasePointerCapture?.(g.id);
      } catch {
        /* ignore */
      }
    }

    if (!wasVertical || phaseRef.current !== PHASE.DRAGGING) {
      phaseRef.current = PHASE.IDLE;
      setDraggingUi(false);
      setHold(false);
      return;
    }

    const flicked = velocity < -0.42 && traveled >= SWIPE_COMMIT * 0.35;
    if (traveled >= SWIPE_COMMIT * 0.82 || flicked) {
      beginExit(true);
      return;
    }

    snapBack();
    setHold(false);
  };

  return (
    <motion.div
      ref={rootRef}
      className="guest-menu guest-menu--experience fixed inset-0 z-[80] select-none"
      style={{
        y,
        opacity,
        scale,
        background: BG,
        willChange: 'transform, opacity',
        transformOrigin: 'center top',
        pointerEvents: exitingUi ? 'none' : 'auto',
        // Allow vertical browser gestures outside the swipe strip;
        // the strip itself uses touch-action: none.
        touchAction: exitingUi ? 'none' : 'manipulation',
      }}
      onPointerDown={(event) => {
        if (phaseRef.current !== PHASE.IDLE) return;
        if (event.button != null && event.button !== 0) return;
        setHold(true);
      }}
      onPointerUp={() => {
        if (phaseRef.current === PHASE.IDLE) setHold(false);
      }}
      onPointerCancel={() => {
        if (phaseRef.current === PHASE.IDLE) setHold(false);
      }}
    >
      <div
        className="guest-experience-shell relative mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col overflow-hidden"
        style={{ background: BG }}
      >
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div
            className="absolute -left-16 -top-10 h-56 w-56 rounded-full opacity-30 blur-[60px]"
            style={{ background: `${ACCENT}22` }}
          />
          <div
            className="absolute -bottom-8 -right-12 h-52 w-52 rounded-full opacity-25 blur-[60px]"
            style={{ background: `${ACCENT}18` }}
          />
        </div>

        <div className="relative z-10 flex items-start justify-between gap-3 px-5 pb-2 pt-[max(1.1rem,env(safe-area-inset-top))]">
          <p
            className="flex min-w-0 items-center gap-2 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: '#A87855' }}
          >
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: ACCENT }}
            />
            <span className="truncate">{location}</span>
          </p>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              beginExit(false);
            }}
            onPointerDown={(event) => event.stopPropagation()}
            className="shrink-0 rounded-full border border-stone-200/90 bg-[#F3F1ED] px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-600 transition active:scale-[0.98]"
          >
            Skip to menu
          </button>
        </div>

        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
          {/* Opacity-only intro — never animate transform here (conflicts with parent y/scale). */}
          <div
            className="menu-splash-fade relative h-[8.5rem] w-[8.5rem] shrink-0 overflow-hidden rounded-full bg-white"
            style={{
              boxShadow: `0 0 0 1px rgba(232,93,36,0.18), 0 18px 40px -22px rgba(28,25,23,0.28)`,
              animationDelay: '0ms',
            }}
          >
            {logoSrc ? (
              <img
                src={logoSrc}
                alt=""
                draggable={false}
                className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
              />
            ) : (
              <span
                className="flex h-full w-full items-center justify-center font-serif text-5xl font-medium"
                style={{ color: ACCENT }}
              >
                {String(name).slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>

          <h1
            className="menu-splash-fade mt-8 max-w-[18rem] font-serif text-[1.85rem] font-medium leading-[1.18] tracking-tight sm:text-[2.05rem]"
            style={{ color: INK, animationDelay: '60ms' }}
          >
            Welcome to {name}
          </h1>

          <p
            className="menu-splash-fade mt-3 max-w-[16rem] text-[14px] leading-relaxed"
            style={{ color: MUTED, animationDelay: '100ms' }}
          >
            {tagline}
          </p>

          <div
            className="menu-splash-fade mt-8 flex w-full max-w-[20rem] items-center gap-3"
            style={{ animationDelay: '140ms' }}
          >
            <div className="h-px flex-1 bg-stone-300/80" />
            <p
              className="shrink-0 max-w-[85%] truncate text-[11px] font-semibold uppercase tracking-[0.16em]"
              style={{ color: ACCENT }}
            >
              {accentLine}
            </p>
            <div className="h-px flex-1 bg-stone-300/80" />
          </div>
        </div>

        <div
          ref={swipeZoneRef}
          className="relative z-10 mx-auto w-full max-w-md space-y-3 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2"
          style={{
            animationDelay: '180ms',
            // Critical for Android/iOS: this strip owns the gesture; no browser pan.
            touchAction: 'none',
            WebkitUserSelect: 'none',
            userSelect: 'none',
          }}
          onPointerDown={(event) => {
            event.stopPropagation();
            onSwipePointerDown(event);
          }}
          onPointerMove={onSwipePointerMove}
          onPointerUp={endSwipeGesture}
          onPointerCancel={endSwipeGesture}
          onLostPointerCapture={endSwipeGesture}
        >
          <div className="menu-splash-fade" style={{ animationDelay: '180ms' }}>
            <SwipeUpHint
              accent={ACCENT}
              reducedMotion={reduceMotion}
              active={draggingUi}
            />
          </div>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              if (phaseRef.current === PHASE.DRAGGING) return;
              if (phaseRef.current === PHASE.EXITING || phaseRef.current === PHASE.DONE) {
                return;
              }
              beginExit(false);
            }}
            onPointerDown={(event) => event.stopPropagation()}
            className="flex w-full items-center justify-center gap-2.5 rounded-2xl px-5 py-3.5 text-[15px] font-semibold text-white transition active:scale-[0.99]"
            style={{
              background: ACCENT,
              boxShadow: `0 16px 32px -12px ${ACCENT}99`,
            }}
          >
            <Sparkles className="h-4 w-4 text-white/95" strokeWidth={2} />
            <span>Explore Menu</span>
            <ChevronUp className="h-4 w-4 text-white/95" strokeWidth={2.25} />
          </button>

          <div className="w-full space-y-2.5" aria-live="polite">
            <div className="h-[3px] overflow-hidden rounded-full bg-stone-200">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, progress * 100)}%`,
                  background: ACCENT,
                  // Width updates are infrequent (throttled); no CSS transition fighting.
                }}
              />
            </div>
            <p
              className="flex items-center justify-center gap-1.5 text-[12px]"
              style={{ color: MUTED }}
            >
              {draggingUi ? (
                <span>Release to enter menu</span>
              ) : holding ? (
                <>
                  <Pause className="h-3 w-3" style={{ color: ACCENT }} fill={ACCENT} />
                  <span>Paused · Release to continue</span>
                </>
              ) : timerDone && !canFinish ? (
                <span>Opening menu…</span>
              ) : (
                <span>Auto-entering in {secondsLeft}s · Hold to pause</span>
              )}
            </p>
          </div>
        </div>
      </div>

      <style>{`
        /* Opacity-only — must NOT touch transform (parent owns translate/scale). */
        @keyframes menu-splash-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .menu-splash-fade {
          animation: menu-splash-fade-in 0.55s ease both;
        }
        @media (prefers-reduced-motion: reduce) {
          .menu-splash-fade {
            animation: none;
            opacity: 1;
          }
        }
      `}</style>
    </motion.div>
  );
}
