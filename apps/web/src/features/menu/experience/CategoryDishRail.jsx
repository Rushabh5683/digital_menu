import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import { ExperienceDishCard } from './ExperienceDishCard.jsx';
import { useCategoryAttention } from '../../analytics/useCategoryAttention.js';
import { categoryShowsSteam } from './DishSteam.jsx';
import { getDietMarker } from '../../../shared/constants/dietaryTags.js';

const DIET_CYCLE = ['all', 'veg', 'non-veg'];
const DOT_SCRUB_PX = 26;
const MAX_VISIBLE_DOTS = 6;
const DOT_SLOT_PX = 16; // h-4 w-4
const DOT_GAP_PX = 8; // gap-2
const DOT_PAD_X_PX = 10; // px-2.5
const DOTS_VIEWPORT_PX =
  MAX_VISIBLE_DOTS * DOT_SLOT_PX +
  (MAX_VISIBLE_DOTS - 1) * DOT_GAP_PX +
  DOT_PAD_X_PX * 2;

/** Axis lock + commit thresholds for the dish slider. */
const AXIS_LOCK_PX = 8;
const COMMIT_RATIO = 0.12;
const FLICK_VELOCITY = 0.28; // px/ms — peak velocity, not end-of-swipe
const SNAP_SPRING = { type: 'spring', stiffness: 480, damping: 42, mass: 0.75 };

function lightHaptic(ms = 10) {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(ms);
    }
  } catch {
    /* ignore unsupported */
  }
}

function DietLiquidToggle({ value, onChange }) {
  const position = value === 'veg' ? 0 : value === 'non-veg' ? 2 : 1;
  const nextValue = DIET_CYCLE[(DIET_CYCLE.indexOf(value) + 1) % DIET_CYCLE.length];

  const label =
    value === 'veg' ? 'Veg' : value === 'non-veg' ? 'Non Veg' : 'All dishes';

  const dotClass =
    value === 'veg'
      ? 'bg-[radial-gradient(circle_at_35%_30%,#6ee7a0_0%,#16a34a_55%,#15803d_100%)]'
      : value === 'non-veg'
        ? 'bg-[radial-gradient(circle_at_35%_30%,#fb7185_0%,#e11d48_55%,#be123c_100%)]'
        : 'bg-[radial-gradient(circle_at_35%_30%,#ffe566_0%,#ffd400_45%,#f5b800_100%)]';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={value !== 'all'}
      aria-label={`Diet filter: ${label}. Tap to change`}
      title={label}
      onClick={() => onChange(nextValue)}
      className="relative h-7 w-16 shrink-0 cursor-pointer rounded-full border border-[#e8dfd0]/80 bg-[#f5efe6]/85 p-[3px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.7),0_1px_3px_rgba(0,0,0,0.08)] backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2"
    >
      <motion.span
        className="absolute top-[3px] left-[3px] flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#f2f2f2] shadow-[0_1px_2px_rgba(0,0,0,0.35)]"
        animate={{ x: position * 18 }}
        transition={{ type: 'spring', stiffness: 480, damping: 32 }}
      >
        <span
          className={[
            'relative h-[11px] w-[11px] rounded-full shadow-[inset_0_-1px_2px_rgba(0,0,0,0.18)]',
            dotClass,
          ].join(' ')}
        >
          <span className="pointer-events-none absolute left-[2px] top-[1.5px] h-[3.5px] w-[5px] rounded-full bg-white/70 blur-[0.3px]" />
        </span>
      </motion.span>
    </button>
  );
}

function categoryIsSingleDietNamed(categoryName = '') {
  const name = String(categoryName || '').toLowerCase();
  if (!name) return false;
  const isNonVegNamed = /non[-\s]?veg|non[-\s]?vegetarian|nonveg/.test(name);
  const isVegNamed =
    !isNonVegNamed &&
    (/\bveg\b|\bvegetarian\b|\bvegan\b|\bjain\b/.test(name) ||
      /pure\s*veg|veg\s*only|veg\s*main/.test(name));
  return isNonVegNamed || isVegNamed;
}

function isInteractiveTarget(target) {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      'button, a, input, select, textarea, [role="button"], [data-no-swipe]',
    ),
  );
}

export function CategoryDishRail({
  category,
  dishes = [],
  shortlistIds,
  comparisonPair,
  quantities = {},
  onOpenDetail,
  onToggleShortlist,
  onToggleCompare,
  onAddToOrder,
  onIncrement,
  onDecrement,
  currency = 'INR',
}) {
  const sectionAttentionRef = useCategoryAttention(category?.id);
  const viewportRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dietFilter, setDietFilter] = useState('all');
  const steamForCategory = categoryShowsSteam(category?.name);
  const activeIndexRef = useRef(0);
  const widthRef = useRef(0);
  const dotsScrubRef = useRef(null);
  const dotsTrackRef = useRef(null);
  const lastHapticIndexRef = useRef(-1);
  const wheelLockRef = useRef(false);
  const gestureRef = useRef(null);
  const animRef = useRef(null);
  const suppressClickRef = useRef(false);
  const x = useMotionValue(0);

  const dietAvailability = useMemo(() => {
    let hasVeg = false;
    let hasNonVeg = false;
    for (const dish of dishes || []) {
      const marker = getDietMarker(dish.dietaryTags);
      if (marker === 'veg') hasVeg = true;
      if (marker === 'non-veg') hasNonVeg = true;
      if (hasVeg && hasNonVeg) break;
    }
    return { hasVeg, hasNonVeg };
  }, [dishes]);

  const showDietToggle =
    dietAvailability.hasVeg &&
    dietAvailability.hasNonVeg &&
    !categoryIsSingleDietNamed(category?.name);

  const visibleDishes = useMemo(() => {
    if (!showDietToggle || dietFilter === 'all') return dishes || [];
    return (dishes || []).filter((dish) => getDietMarker(dish.dietaryTags) === dietFilter);
  }, [dishes, dietFilter, showDietToggle]);

  const stopAnim = useCallback(() => {
    if (animRef.current) {
      animRef.current.stop();
      animRef.current = null;
    }
  }, []);

  const measureWidth = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return 0;
    const w = el.clientWidth || 0;
    widthRef.current = w;
    return w;
  }, []);

  const setIndex = useCallback((index, { haptic = false } = {}) => {
    const next = Math.max(0, Math.min(Math.max(visibleDishes.length - 1, 0), index));
    if (next !== activeIndexRef.current) {
      activeIndexRef.current = next;
      setActiveIndex(next);
      if (haptic && next !== lastHapticIndexRef.current) {
        lastHapticIndexRef.current = next;
        lightHaptic(12);
      }
    } else {
      activeIndexRef.current = next;
    }
    return next;
  }, [visibleDishes.length]);

  const snapToIndex = useCallback(
    (index, { haptic = false, velocity = 0 } = {}) => {
      const width = widthRef.current || measureWidth() || 1;
      const next = setIndex(index, { haptic });
      stopAnim();
      animRef.current = animate(x, -next * width, {
        ...SNAP_SPRING,
        velocity,
        onComplete: () => {
          animRef.current = null;
          // Hard-settle to exact slot (avoids spring undershoot desync)
          x.set(-next * width);
        },
      });
    },
    [measureWidth, setIndex, stopAnim, x],
  );

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return undefined;
    const sync = () => {
      const w = measureWidth();
      if (!w) return;
      // Don't fight an active drag; resize will settle on pointer up.
      if (gestureRef.current?.mode === 'horizontal') {
        widthRef.current = w;
        return;
      }
      stopAnim();
      x.set(-activeIndexRef.current * w);
    };
    sync();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(sync) : null;
    ro?.observe(el);
    window.addEventListener('resize', sync);

    // Non-passive so horizontal lock can block vertical page scroll mid-gesture.
    const onTouchMove = (event) => {
      if (gestureRef.current?.mode === 'horizontal' && event.cancelable) {
        event.preventDefault();
      }
    };
    el.addEventListener('touchmove', onTouchMove, { passive: false });

    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', sync);
      el.removeEventListener('touchmove', onTouchMove);
    };
  }, [measureWidth, stopAnim, x, visibleDishes.length]);

  useEffect(() => {
    stopAnim();
    setActiveIndex(0);
    activeIndexRef.current = 0;
    lastHapticIndexRef.current = -1;
    x.set(0);
    if (dotsTrackRef.current) dotsTrackRef.current.scrollLeft = 0;
  }, [dietFilter, category?.id, stopAnim, x]);

  useEffect(() => {
    const track = dotsTrackRef.current;
    if (!track || visibleDishes.length <= MAX_VISIBLE_DOTS) return;
    const btn = track.querySelector(`[data-dot-index="${activeIndex}"]`);
    if (!btn) return;
    const target =
      btn.offsetLeft - track.clientWidth / 2 + btn.offsetWidth / 2;
    track.scrollTo({
      left: Math.max(0, target),
      behavior: 'smooth',
    });
  }, [activeIndex, visibleDishes.length]);

  const scrollToIndex = useCallback(
    (index, { haptic = false } = {}) => {
      snapToIndex(index, { haptic });
    },
    [snapToIndex],
  );

  const onDotsWheel = (event) => {
    if (visibleDishes.length < 2) return;
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (!delta) return;
    event.preventDefault();
    if (wheelLockRef.current) return;
    wheelLockRef.current = true;
    window.setTimeout(() => {
      wheelLockRef.current = false;
    }, 140);
    const dir = delta > 0 ? 1 : -1;
    scrollToIndex(activeIndexRef.current + dir, { haptic: true });
  };

  const onDotsPointerDown = (event) => {
    if (visibleDishes.length < 2) return;
    if (event.button != null && event.button !== 0) return;
    dotsScrubRef.current = {
      id: event.pointerId,
      startX: event.clientX,
      startIndex: activeIndexRef.current,
    };
    lastHapticIndexRef.current = activeIndexRef.current;
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onDotsPointerMove = (event) => {
    const scrub = dotsScrubRef.current;
    if (!scrub || event.pointerId !== scrub.id) return;
    const dx = event.clientX - scrub.startX;
    if (Math.abs(dx) < 8) return;
    const steps = Math.round(dx / DOT_SCRUB_PX);
    const next = Math.max(
      0,
      Math.min(visibleDishes.length - 1, scrub.startIndex + steps),
    );
    if (next !== activeIndexRef.current) {
      scrollToIndex(next, { haptic: true });
    }
  };

  const onDotsPointerEnd = (event) => {
    const scrub = dotsScrubRef.current;
    if (!scrub || (event.pointerId != null && event.pointerId !== scrub.id)) return;
    try {
      event.currentTarget.releasePointerCapture?.(scrub.id);
    } catch {
      /* ignore */
    }
    dotsScrubRef.current = null;
  };

  const onRailPointerDown = (event) => {
    if (visibleDishes.length < 2) return;
    if (event.button != null && event.button !== 0) return;
    if (event.isPrimary === false) return;
    // Let native controls keep their own gesture; page scroll stays free.
    if (isInteractiveTarget(event.target)) return;

    // Settle any in-flight snap so the next drag starts from a real slot.
    // (Mid-animation swipes were the main "stuck / swipe twice" cause.)
    if (animRef.current) {
      stopAnim();
      const width = widthRef.current || measureWidth() || 1;
      const nearest = Math.round(-x.get() / width);
      const settled = Math.max(0, Math.min(visibleDishes.length - 1, nearest));
      activeIndexRef.current = settled;
      setActiveIndex(settled);
      x.set(-settled * width);
    }

    gestureRef.current = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastT: event.timeStamp || performance.now(),
      originX: x.get(),
      startIndex: activeIndexRef.current,
      mode: null, // null | 'horizontal'
      velocity: 0,
      peakVelocity: 0,
      captured: false,
      finishing: false,
    };
  };

  const onRailPointerMove = (event) => {
    const g = gestureRef.current;
    if (!g || g.finishing || event.pointerId !== g.id) return;

    const dx = event.clientX - g.startX;
    const dy = event.clientY - g.startY;
    const now = event.timeStamp || performance.now();
    const dt = Math.max(1, now - g.lastT);
    const frameDx = event.clientX - g.lastX;
    // EMA for smoothness; peakVelocity keeps flick intent when finger slows at lift.
    g.velocity = g.velocity * 0.55 + (frameDx / dt) * 0.45;
    if (Math.abs(g.velocity) > Math.abs(g.peakVelocity)) {
      g.peakVelocity = g.velocity;
    }
    g.lastX = event.clientX;
    g.lastT = now;

    if (!g.mode) {
      if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return;

      // Prefer horizontal when tie / slight diagonal — only abandon on clear vertical.
      if (Math.abs(dx) >= Math.abs(dy)) {
        g.mode = 'horizontal';
        suppressClickRef.current = true;
        stopAnim();
        const width = measureWidth() || 1;
        const currentX = x.get();
        g.originX = currentX;
        const baseIndex = Math.round(-currentX / width);
        const clampedBase = Math.max(
          0,
          Math.min(visibleDishes.length - 1, baseIndex),
        );
        g.startIndex = clampedBase;
        activeIndexRef.current = clampedBase;
        setActiveIndex(clampedBase);
        const viewport = viewportRef.current;
        if (viewport) viewport.style.touchAction = 'none';
        try {
          event.currentTarget.setPointerCapture?.(event.pointerId);
          g.captured = true;
        } catch {
          /* ignore */
        }
      } else if (Math.abs(dy) >= AXIS_LOCK_PX * 1.5) {
        // Clear vertical page scroll — drop slider gesture for this touch only.
        gestureRef.current = null;
        return;
      } else {
        // Still ambiguous — wait for a clearer sample (don't kill the swipe).
        return;
      }
    }

    if (g.mode !== 'horizontal') return;

    const width = widthRef.current || measureWidth() || 1;
    const maxIndex = Math.max(visibleDishes.length - 1, 0);
    let nextX = g.originX + (event.clientX - g.startX);

    // Soft rubber-band past ends so hold+drag never feels stuck.
    const minX = -maxIndex * width;
    if (nextX > 0) nextX *= 0.32;
    else if (nextX < minX) nextX = minX + (nextX - minX) * 0.32;

    x.set(nextX);
    if (event.cancelable) event.preventDefault();
  };

  const finishRailGesture = (event) => {
    const g = gestureRef.current;
    if (!g || g.finishing) return;
    if (event.pointerId != null && event.pointerId !== g.id) return;

    g.finishing = true;
    const wasHorizontal = g.mode === 'horizontal';
    const velocity = g.peakVelocity || g.velocity;
    const startIndex = g.startIndex ?? activeIndexRef.current;
    const pointerId = g.id;
    const captured = g.captured;
    gestureRef.current = null;

    const viewport = viewportRef.current;
    if (viewport) viewport.style.touchAction = '';

    if (captured) {
      try {
        event.currentTarget.releasePointerCapture?.(pointerId);
      } catch {
        /* ignore */
      }
    }

    if (!wasHorizontal) {
      suppressClickRef.current = false;
      return;
    }

    const width = widthRef.current || measureWidth() || 1;
    const currentX = x.get();
    const projected = -currentX / width;
    const maxIndex = Math.max(visibleDishes.length - 1, 0);

    let target = startIndex;
    const flickedNext = velocity <= -FLICK_VELOCITY;
    const flickedPrev = velocity >= FLICK_VELOCITY;

    if (flickedNext) {
      target = startIndex + 1;
    } else if (flickedPrev) {
      target = startIndex - 1;
    } else {
      // Position-based commit — drag ~12%+ toward a neighbor counts (not end velocity).
      const delta = projected - startIndex;
      if (delta >= COMMIT_RATIO) target = startIndex + 1;
      else if (delta <= -COMMIT_RATIO) target = startIndex - 1;
      else target = startIndex;
    }

    // One page per gesture keeps paging predictable with many dishes.
    target = Math.max(startIndex - 1, Math.min(startIndex + 1, target));
    target = Math.max(0, Math.min(maxIndex, target));

    snapToIndex(target, {
      haptic: target !== startIndex,
      velocity: velocity * 1000,
    });

    // Clear click suppress on next tick so the trailing click is eaten.
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);
  };

  const onRailClickCapture = (event) => {
    if (!suppressClickRef.current) return;
    event.preventDefault();
    event.stopPropagation();
  };

  if (!category || dishes.length === 0) return null;

  const comparedIds = new Set(
    (comparisonPair || [])
      .map((item) => (typeof item === 'string' ? item : item?.id))
      .filter(Boolean),
  );
  const showDots = visibleDishes.length > 1;
  const activeFilterLabel =
    dietFilter === 'veg'
      ? 'Veg Dishes'
      : dietFilter === 'non-veg'
        ? 'Non Veg Dishes'
        : 'All Dishes';

  return (
    <motion.section
      ref={sectionAttentionRef}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      id={`section-${category.id}`}
      data-category-id={category.id}
      className="scroll-mt-28 space-y-3 sm:scroll-mt-32 sm:space-y-4"
    >
      <div className="flex items-end justify-between gap-3 border-b border-stone-200/80 px-4 pb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center space-x-2">
            <h2 className="truncate font-serif text-xl font-normal tracking-tight text-stone-900 sm:text-2xl">
              {category.name}{' '}
              <span className="font-sans text-base font-normal text-stone-400 sm:text-lg">
                ({visibleDishes.length})
              </span>
            </h2>
          </div>
          {category.shortDescription || category.description ? (
            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-stone-500 sm:text-[13px]">
              {category.shortDescription || category.description}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2.5 sm:gap-3">
          {showDietToggle ? (
            <>
              <span className="whitespace-nowrap text-[10px] font-medium uppercase tracking-wider text-stone-400 sm:text-[11px]">
                {activeFilterLabel}
              </span>
              <DietLiquidToggle value={dietFilter} onChange={setDietFilter} />
            </>
          ) : null}
        </div>
      </div>

      <div className="relative">
        <div
          ref={viewportRef}
          className="guest-dish-slider touch-pan-y select-none overflow-hidden pb-2 pt-1"
          style={{ touchAction: 'pan-y' }}
          onPointerDown={onRailPointerDown}
          onPointerMove={onRailPointerMove}
          onPointerUp={finishRailGesture}
          onPointerCancel={finishRailGesture}
          onLostPointerCapture={finishRailGesture}
          onClickCapture={onRailClickCapture}
        >
          <motion.div className="flex will-change-transform" style={{ x }}>
            {visibleDishes.map((dish) => (
              <div
                key={dish.id}
                className="box-border w-full shrink-0 px-4 sm:px-5"
                style={{ flex: '0 0 100%' }}
              >
                <ExperienceDishCard
                  dish={dish}
                  isShortlisted={shortlistIds?.has(dish.id)}
                  isCompared={comparedIds.has(dish.id)}
                  quantity={quantities[dish.id] || 0}
                  onOpenDetail={onOpenDetail}
                  onToggleShortlist={onToggleShortlist}
                  onToggleCompare={onToggleCompare}
                  onAddToOrder={onAddToOrder}
                  onIncrement={onIncrement}
                  onDecrement={onDecrement}
                  currency={currency}
                  showSteam={steamForCategory && dish.availability !== false}
                />
              </div>
            ))}
          </motion.div>
        </div>

        {showDots ? (
          <div
            className="flex justify-center px-4 pb-1 pt-2 touch-pan-y"
            onWheel={onDotsWheel}
            role="tablist"
            aria-label={`${category.name} dishes`}
          >
            <div
              ref={dotsTrackRef}
              className="relative inline-flex touch-none items-center gap-2 overflow-x-auto scroll-smooth rounded-full bg-stone-200/70 px-2.5 py-1.5 no-scrollbar"
              style={{
                width: Math.min(
                  DOTS_VIEWPORT_PX,
                  visibleDishes.length * DOT_SLOT_PX +
                    Math.max(0, visibleDishes.length - 1) * DOT_GAP_PX +
                    DOT_PAD_X_PX * 2,
                ),
                maxWidth: DOTS_VIEWPORT_PX,
              }}
              onPointerDown={onDotsPointerDown}
              onPointerMove={onDotsPointerMove}
              onPointerUp={onDotsPointerEnd}
              onPointerCancel={onDotsPointerEnd}
            >
              {visibleDishes.map((dish, index) => {
                const active = index === activeIndex;
                return (
                  <button
                    key={dish.id}
                    type="button"
                    role="tab"
                    data-dot-index={index}
                    aria-selected={active}
                    aria-label={`Show ${dish.name || `dish ${index + 1}`}`}
                    title={dish.name || `Dish ${index + 1}`}
                    onClick={() => scrollToIndex(index, { haptic: true })}
                    className="relative z-[1] flex h-4 w-4 shrink-0 items-center justify-center"
                  >
                    {active ? (
                      <motion.span
                        layoutId={`dish-dot-glide-${category.id}`}
                        className="absolute inset-0 rounded-full bg-stone-300/90"
                        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      />
                    ) : null}
                    <span
                      className={[
                        'relative z-[1] rounded-full transition-colors duration-200',
                        active ? 'h-2 w-2 bg-stone-900' : 'h-1.5 w-1.5 bg-stone-400/90',
                      ].join(' ')}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </motion.section>
  );
}
