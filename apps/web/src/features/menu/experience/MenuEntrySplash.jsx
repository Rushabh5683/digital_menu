import { useEffect, useRef, useState } from 'react';
import { ChevronUp, Pause, Play, Sparkles } from 'lucide-react';

const SPLASH_MS = 4500;
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
 * Welcome splash — matches the reference layout exactly.
 * Uses restaurant logo in place of the illustration.
 */
export function MenuEntrySplash({
  restaurant,
  tableLabel,
  durationMs = SPLASH_MS,
  onEnter,
}) {
  const [paused, setPaused] = useState(false);
  const [remainingMs, setRemainingMs] = useState(durationMs);
  const [exiting, setExiting] = useState(false);
  const [entered, setEntered] = useState(false);
  const enteredRef = useRef(false);
  const remainingRef = useRef(durationMs);
  const lastTickRef = useRef(null);

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
    remainingRef.current = durationMs;
    setRemainingMs(durationMs);
  }, [durationMs]);

  useEffect(() => {
    if (paused || exiting) {
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
        finishEnter();
        return;
      }
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, exiting]);

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

  return (
    <div
      className="guest-menu guest-menu--experience fixed inset-0 z-[80]"
      style={{
        opacity: exiting ? 0 : 1,
        transform: exiting ? 'translateY(-18%)' : 'translateY(0)',
        transition: `opacity ${EXIT_MS}ms cubic-bezier(0.22, 1, 0.36, 1), transform ${EXIT_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
        pointerEvents: exiting ? 'none' : 'auto',
        willChange: 'transform, opacity',
      }}
    >
      <div
        className="guest-experience-shell relative mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col overflow-hidden"
        style={{ background: BG }}
      >
        {/* Soft atmosphere — subtle like reference */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div
            className="absolute -left-16 -top-10 h-56 w-56 rounded-full opacity-40 blur-[70px]"
            style={{ background: `${ACCENT}22` }}
          />
          <div
            className="absolute -bottom-8 -right-12 h-52 w-52 rounded-full opacity-35 blur-[70px]"
            style={{ background: `${ACCENT}18` }}
          />
        </div>

        {/* Header */}
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
            onClick={finishEnter}
            className="shrink-0 rounded-full border border-stone-200/90 bg-[#F3F1ED] px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-600 transition active:scale-[0.98]"
          >
            Skip to menu
          </button>
        </div>

        {/* Center brand block */}
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
          {/* Perfect circle — black logo plates keyed out via SVG filter */}
          <div
            className="relative h-[8.5rem] w-[8.5rem] shrink-0 overflow-hidden rounded-full bg-white"
            style={{
              boxShadow: `0 0 0 1px rgba(232,93,36,0.18), 0 18px 40px -22px rgba(28,25,23,0.28)`,
              animation: exiting ? undefined : 'menu-splash-in 0.7s ease both',
            }}
          >
            {restaurant?.logo ? (
              <>
                <svg width="0" height="0" className="absolute" aria-hidden>
                  <defs>
                    <filter
                      id="splash-logo-knockout"
                      colorInterpolationFilters="sRGB"
                    >
                      {/* Keep color; push near-black pixels to transparent */}
                      <feColorMatrix
                        in="SourceGraphic"
                        type="matrix"
                        values="
                          1 0 0 0 0
                          0 1 0 0 0
                          0 0 1 0 0
                          4.2 4.2 4.2 0 -0.55"
                        result="knockout"
                      />
                    </filter>
                  </defs>
                </svg>
                <img
                  src={restaurant.logo}
                  alt=""
                  draggable={false}
                  className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
                  style={{
                    filter: 'url(#splash-logo-knockout)',
                    transform: 'scale(1.04)',
                    transformOrigin: 'center center',
                  }}
                />
              </>
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
              animation: exiting ? undefined : 'menu-splash-in 0.7s ease 0.08s both',
            }}
          >
            Welcome to {name}
          </h1>

          <p
            className="mt-3 max-w-[16rem] text-[14px] leading-relaxed"
            style={{
              color: MUTED,
              animation: exiting ? undefined : 'menu-splash-in 0.7s ease 0.14s both',
            }}
          >
            {tagline}
          </p>

          <div
            className="mt-8 flex w-full max-w-[20rem] items-center gap-3"
            style={{
              animation: exiting ? undefined : 'menu-splash-in 0.7s ease 0.2s both',
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

        {/* Bottom CTA */}
        <div
          className="relative z-10 mx-auto w-full max-w-md space-y-3.5 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2"
          style={{
            animation: exiting ? undefined : 'menu-splash-in 0.7s ease 0.26s both',
          }}
        >
          <button
            type="button"
            onClick={finishEnter}
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

          <button
            type="button"
            onClick={() => setPaused((value) => !value)}
            className="w-full space-y-2.5"
            aria-label={paused ? 'Resume auto enter' : 'Pause auto enter'}
          >
            <div className="h-[3px] overflow-hidden rounded-full bg-stone-200">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, progress * 100)}%`,
                  background: ACCENT,
                  transition: 'width 100ms linear',
                }}
              />
            </div>
            <p
              className="flex items-center justify-center gap-1.5 text-[12px]"
              style={{ color: MUTED }}
            >
              {paused ? (
                <Play className="h-3 w-3" style={{ color: ACCENT }} fill={ACCENT} />
              ) : (
                <Pause className="h-3 w-3" style={{ color: ACCENT }} fill={ACCENT} />
              )}
              <span>
                {paused
                  ? 'Paused · Tap to resume'
                  : `Auto-entering in ${secondsLeft}s · Tap to pause`}
              </span>
            </p>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes menu-splash-in {
          from {
            opacity: 0;
            transform: translateY(12px);
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
