import { useEffect, useRef, useState } from 'react';
import { ChevronUp, Pause, Sparkles } from 'lucide-react';
import { resolveMediaUrl } from '../../../shared/lib/mediaUrl.js';

const SPLASH_MS = 4200;
const EXIT_MS = 520;
const ACCENT = '#E85D24';
const INK = '#1C1917';
const MUTED = '#78716C';
const BG = '#FAF8F5';

function shortLocation(address) {
  if (!address || typeof address !== 'string') return null;
  const cleaned = address.trim().replace(/\s+/g, ' ').toUpperCase();
  if (!cleaned) return null;
  return cleaned.length > 38 ? `${cleaned.slice(0, 36).trim()}…` : cleaned;
}

/**
 * Welcome splash shown immediately on QR open.
 * Hold anywhere (except Skip / Explore) to pause the countdown; release to continue.
 * Auto-enter waits until `canFinish` (menu data ready) and the timer completes.
 */
export function MenuEntrySplash({
  restaurant,
  tableLabel,
  durationMs = SPLASH_MS,
  canFinish = true,
  onEnter,
}) {
  const [holding, setHolding] = useState(false);
  const [remainingMs, setRemainingMs] = useState(durationMs);
  const [timerDone, setTimerDone] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [entered, setEntered] = useState(false);
  const enteredRef = useRef(false);
  const remainingRef = useRef(durationMs);
  const lastTickRef = useRef(null);
  const timerDoneRef = useRef(false);

  const finishEnter = () => {
    if (enteredRef.current) return;
    enteredRef.current = true;
    setExiting(true);
    window.setTimeout(() => {
      setEntered(true);
      onEnter?.();
    }, EXIT_MS);
  };

  useEffect(() => {
    if (timerDone && canFinish && !exiting) {
      finishEnter();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerDone, canFinish, exiting]);

  useEffect(() => {
    if (holding || exiting || timerDoneRef.current) {
      lastTickRef.current = null;
      return undefined;
    }

    lastTickRef.current = performance.now();
    let frameId = 0;

    const tick = (now) => {
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
  }, [holding, exiting]);

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
    if (exiting || timerDoneRef.current) return;
    setHolding(value);
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

  return (
    <div
      className="guest-menu guest-menu--experience fixed inset-0 z-[80] select-none touch-manipulation"
      style={{
        opacity: exiting ? 0 : 1,
        transform: exiting ? 'translateY(-12%)' : 'translateY(0)',
        transition: `opacity ${EXIT_MS}ms cubic-bezier(0.22, 1, 0.36, 1), transform ${EXIT_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
        pointerEvents: exiting ? 'none' : 'auto',
        background: BG,
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
              finishEnter();
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
              animation: exiting ? undefined : 'menu-splash-in 0.65s ease both',
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
              animation: exiting ? undefined : 'menu-splash-in 0.65s ease 0.06s both',
            }}
          >
            Welcome to {name}
          </h1>

          <p
            className="mt-3 max-w-[16rem] text-[14px] leading-relaxed"
            style={{
              color: MUTED,
              animation: exiting ? undefined : 'menu-splash-in 0.65s ease 0.1s both',
            }}
          >
            {tagline}
          </p>

          <div
            className="mt-8 flex w-full max-w-[20rem] items-center gap-3"
            style={{
              animation: exiting ? undefined : 'menu-splash-in 0.65s ease 0.14s both',
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
          className="relative z-10 mx-auto w-full max-w-md space-y-3.5 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2"
          style={{
            animation: exiting ? undefined : 'menu-splash-in 0.65s ease 0.18s both',
          }}
        >
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              finishEnter();
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
                }}
              />
            </div>
            <p
              className="flex items-center justify-center gap-1.5 text-[12px]"
              style={{ color: MUTED }}
            >
              {holding ? (
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
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
