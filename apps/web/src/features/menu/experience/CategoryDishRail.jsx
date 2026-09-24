import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
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
  const scrollContainerRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dietFilter, setDietFilter] = useState('all');
  const steamForCategory = categoryShowsSteam(category?.name);
  const activeIndexRef = useRef(0);
  const dotsScrubRef = useRef(null);
  const dotsTrackRef = useRef(null);
  const lastHapticIndexRef = useRef(-1);
  const wheelLockRef = useRef(false);

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

  const syncScrollState = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const width = el.clientWidth || 1;
    const index = Math.round(el.scrollLeft / width);
    const next = Math.max(0, Math.min(Math.max(visibleDishes.length - 1, 0), index));
    activeIndexRef.current = next;
    setActiveIndex(next);
  }, [visibleDishes.length]);

  useEffect(() => {
    syncScrollState();
    window.addEventListener('resize', syncScrollState);
    return () => window.removeEventListener('resize', syncScrollState);
  }, [syncScrollState, visibleDishes]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) el.scrollTo({ left: 0, behavior: 'smooth' });
    setActiveIndex(0);
    activeIndexRef.current = 0;
    lastHapticIndexRef.current = -1;
    if (dotsTrackRef.current) dotsTrackRef.current.scrollLeft = 0;
  }, [dietFilter, category?.id]);

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
      const el = scrollContainerRef.current;
      if (!el) return;
      const next = Math.max(0, Math.min(visibleDishes.length - 1, index));
      if (next !== activeIndexRef.current) {
        activeIndexRef.current = next;
        setActiveIndex(next);
        if (haptic && next !== lastHapticIndexRef.current) {
          lastHapticIndexRef.current = next;
          lightHaptic(12);
        }
      }
      el.scrollTo({
        left: next * el.clientWidth,
        behavior: 'smooth',
      });
    },
    [visibleDishes.length],
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
          ref={scrollContainerRef}
          onScroll={syncScrollState}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto scroll-smooth pb-2 pt-1"
        >
          {visibleDishes.map((dish) => (
            <div
              key={dish.id}
              className="box-border w-full shrink-0 snap-start px-4 sm:px-5"
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
