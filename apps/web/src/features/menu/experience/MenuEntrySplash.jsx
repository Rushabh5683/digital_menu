import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronUp, Pause, Sparkles } from 'lucide-react';
import { resolveMediaUrl } from '../../../shared/lib/mediaUrl.js';

const SPLASH_MS = 4200;
const EXIT_MS = 720;
const ACCENT = '#E85D24';
const INK = '#1C1917';
const MUTED = '#78716C';
const BG = '#FAF8F5';
const SWIPE_THRESHOLD = 52;
const SWIPE_ARM = 8;
const EXIT_EASE = [0.16, 1, 0.3, 1];

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
 * Hold anywhere (except Skip / Explore) to pause the countdown; release to continue.
 * On mobile, swipe up above Explore Menu to enter with a premium slide-away.
 * Auto-enter waits until `canFinish` (menu data ready) and the timer completes.
 */
export function MenuEntrySplash({
  restaurant,
  tableLabel,
  durationMs = SPLASH_MS,
  canFinish = true,
  onEnter,
}) {
  const reduceMotion = useReducedMotion();
  const [holding, setHolding] = useState(false);
  const [remainingMs, setRemainingMs] = useState(durationMs);
  const [timerDone, setTimerDone] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [entered, setEntered] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [exitMode, setExitMode] = useState(null); // 'swipe' | 'fade'
  const enteredRef = useRef(false);
  const remainingRef = useRef(durationMs);
  const lastTickRef = useRef(null);
  const timerDoneRef = useRef(false);
  const pointerIdRef = useRef(null);
  const startYRef = useRef(null);
  const dragYRef = useRef(0);
  const swipingRef = useRef(false);

  const finishEnter = (fromSwipe = false) => {
    if (enteredRef.current) return;
    enteredRef.current = true;
    // Stop the auto-enter timer immediately so swipe/skip never waits on the bar
    timerDoneRef.current = true;
    remainingRef.current = 0;
    setRemainingMs(0);
    setTimerDone(true);
    setHolding(false);
    setDragging(false);
    swipingRef.current = false;
    setExitMode(fromSwipe ? 'swipe' : 'fade');
    const lift = fromSwipe
      ? -Math.round(window.innerHeight * 1.05)
      : -Math.round(Math.min(window.innerHeight * 0.22, 180));
    setDragY(lift);
    setExiting(true);
    window.setTimeout(() => {
      setEntered(true);
      onEnter?.();
    }, EXIT_MS);
  };

  useEffect(() => {
    if (timerDone && canFinish && !exiting && !enteredRef.current) {
      finishEnter(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerDone, canFinish, exiting]);

  useEffect(() => {
    if (holding || exiting || timerDoneRef.current || dragging || enteredRef.current) {
      lastTickRef.current = null;
      return undefined;
    }

    lastTickRef.current = performance.now();
    let frameId = 0;

    const tick = (now) => {
      if (enteredRef.current || timerDoneRef.current) return;
      const last = lastTickRef.current ?? now;
      lastTickRef.current = now;
      const next = Math.max(0, remainingRef.current - (now - last));
      remainingRef.current = next;
      setRemainingMs(next);
      if (next <= 0) {
        timerDoneRef.current = true;
        setTimerDone(true);
        return;
      }
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [holding, exiting, dragging]);

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
  const logoSrc = resolveMediaUrl(restaurant?.logo || restaurant?.logoUrl || '') || null;

  const setHold = (value) => {
    if (exiting || enteredRef.current || timerDoneRef.current || swipingRef.current) return;
    setHolding(value);
  };

  const resetDrag = () => {
    pointerIdRef.current = null;
    startYRef.current = null;
    swipingRef.current = false;
    dragYRef.current = 0;
    setDragY(0);
    setDragging(false);
  };

  const onSwipePointerDown = (event) => {
    if (exiting || enteredRef.current) return;
    if (event.button != null && event.button !== 0) return;
    pointerIdRef.current = event.pointerId;
    startYRef.current = event.clientY;
    swipingRef.current = false;
    dragYRef.current = 0;
    setDragY(0);
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onSwipePointerMove = (event) => {
    if (exiting || enteredRef.current) return;
    if (pointerIdRef.current == null || event.pointerId !== pointerIdRef.current) return;
    if (startYRef.current == null) return;

    const delta = startYRef.current - event.clientY;
    if (!swipingRef.current && delta > SWIPE_ARM) {
      swipingRef.current = true;
      setHolding(false);
      setDragging(true);
    }
    if (!swipingRef.current) return;

    const raw = Math.max(delta, 0);
    // Ease resistance so the sheet feels weighted while dragging
    const resisted = raw * (1 - Math.min(raw / (window.innerHeight * 1.8), 0.35));
    const next = -Math.min(resisted, window.innerHeight * 0.55);
    dragYRef.current = next;
    setDragY(next);

    // Commit as soon as the swipe clears the threshold (don't wait for release)
    if (raw >= SWIPE_THRESHOLD) {
      try {
        event.currentTarget.releasePointerCapture?.(event.pointerId);
      } catch {
        /* ignore */
      }
      pointerIdRef.current = null;
      finishEnter(true);
    }
  };

  const onSwipePointerEnd = (event) => {
    if (enteredRef.current) return;
    if (pointerIdRef.current == null || event.pointerId !== pointerIdRef.current) return;
    const traveled = -dragYRef.current;
    const shouldEnter = swipingRef.current && traveled >= SWIPE_THRESHOLD * 0.75;
    try {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    } catch {
      /* ignore */
    }
    pointerIdRef.current = null;
    if (shouldEnter) {
      finishEnter(true);
      return;
    }
    resetDrag();
    setHold(false);
  };

  const holdHandlers = {
    onPointerDown: (event) => {
      if (event.button != null && event.button !== 0) return;
      setHold(true);
    },
    onPointerUp: () => setHold(false),
    onPointerCancel: () => setHold(false),
    onPointerLeave: () => setHold(false),
  };

  const dragProgress = Math.min(1, Math.abs(Math.min(dragY, 0)) / 160);
  const shellAnimate = exiting
    ? {
        y: dragY,
        opacity: 0,
        scale: exitMode === 'swipe' ? 0.94 : 0.975,
        filter: exitMode === 'swipe' ? 'blur(8px)' : 'blur(4px)',
      }
    : {
        y: dragY,
        opacity: dragging ? Math.max(0.5, 1 - dragProgress * 0.4) : 1,
        scale: dragging ? 1 - dragProgress * 0.025 : 1,
        filter: 'blur(0px)',
      };

  const shellTransition = dragging
    ? { type: 'tween', duration: 0 }
    : exiting
      ? {
          y: { duration: EXIT_MS / 1000, ease: EXIT_EASE },
          opacity: { duration: EXIT_MS / 1000, ease: [0.4, 0, 0.2, 1] },
          scale: { duration: EXIT_MS / 1000, ease: EXIT_EASE },
          filter: { duration: EXIT_MS / 1000, ease: 'easeOut' },
        }
      : {
          type: 'spring',
          stiffness: 420,
          damping: 34,
          mass: 0.8,
        };

  return (
    <motion.div
      className="guest-menu guest-menu--experience fixed inset-0 z-[80] select-none touch-manipulation"
      initial={false}
      animate={shellAnimate}
      transition={shellTransition}
      style={{
        pointerEvents: exiting ? 'none' : 'auto',
        background: BG,
        willChange: 'transform, opacity, filter',
      }}
      {...holdHandlers}
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
              finishEnter(false);
            }}
            onPointerDown={(event) => event.stopPropagation()}
            className="shrink-0 rounded-full border border-stone-200/90 bg-[#F3F1ED] px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-600 transition active:scale-[0.98]"
          >
            Skip to menu
          </button>
        </div>

        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div
            className="relative h-[8.5rem] w-[8.5rem] shrink-0 overflow-hidden rounded-full bg-white"
            style={{
              boxShadow: `0 0 0 1px rgba(232,93,36,0.18), 0 18px 40px -22px rgba(28,25,23,0.28)`,
              animation: exiting || dragging ? undefined : 'menu-splash-in 0.65s ease both',
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
            className="mt-8 max-w-[18rem] font-serif text-[1.85rem] font-medium leading-[1.18] tracking-tight sm:text-[2.05rem]"
            style={{
              color: INK,
              animation: exiting || dragging ? undefined : 'menu-splash-in 0.65s ease 0.06s both',
            }}
          >
            Welcome to {name}
          </h1>

          <p
            className="mt-3 max-w-[16rem] text-[14px] leading-relaxed"
            style={{
              color: MUTED,
              animation: exiting || dragging ? undefined : 'menu-splash-in 0.65s ease 0.1s both',
            }}
          >
            {tagline}
          </p>

          <div
            className="mt-8 flex w-full max-w-[20rem] items-center gap-3"
            style={{
              animation: exiting || dragging ? undefined : 'menu-splash-in 0.65s ease 0.14s both',
            }}
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
          className="relative z-10 mx-auto w-full max-w-md space-y-3 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2"
          style={{
            animation: exiting || dragging ? undefined : 'menu-splash-in 0.65s ease 0.18s both',
          }}
          onPointerDown={(event) => {
            event.stopPropagation();
            onSwipePointerDown(event);
          }}
          onPointerMove={onSwipePointerMove}
          onPointerUp={(event) => {
            onSwipePointerEnd(event);
          }}
          onPointerCancel={(event) => {
            onSwipePointerEnd(event);
          }}
        >
          <SwipeUpHint
            accent={ACCENT}
            reducedMotion={reduceMotion}
            active={dragging}
          />

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              if (swipingRef.current || Math.abs(dragYRef.current) > 12) return;
              finishEnter(false);
            }}
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
                className="h-full rounded-full transition-[width] duration-100 ease-linear"
                style={{
                  width: `${Math.min(100, progress * 100)}%`,
                  background: ACCENT,
                }}
              />
            </div>
            <p
              className="flex items-center justify-center gap-1.5 text-[12px]"
              style={{ color: MUTED }}
            >
              {dragging ? (
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
        @keyframes menu-splash-in {
          from {
            opacity: 0;
            transform: translateY(14px) scale(0.985);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </motion.div>
  );
}
