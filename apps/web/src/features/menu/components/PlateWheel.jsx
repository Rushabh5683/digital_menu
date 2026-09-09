import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
} from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatPrice, getDishDietType, isChefPick } from '../lib/menuUtils.js';
import { useDishAttention } from '../../analytics/useDishAttention.js';
import { DishImage } from './DishImage.jsx';
import { QuantityControl } from './QuantityControl.jsx';

function wrapDelta(index, active, length) {
  let delta = index - active;
  if (delta > length / 2) delta -= length;
  if (delta < -length / 2) delta += length;
  return delta;
}

function dietLabel(diet) {
  if (diet === 'vegan') return 'Vegan';
  if (diet === 'veg') return 'Veg';
  if (diet === 'non-veg') return 'Non Veg';
  return null;
}
const ORBIT_ANGLE_DEG = 36;
const ORBIT_RADIUS_X = 172;
const ORBIT_RADIUS_Z = 128;

/** Continuous 3D pose on a circular orbit (slotDelta 0 = front/center). */
function orbitPose(slotDelta) {
  const theta = (slotDelta * ORBIT_ANGLE_DEG * Math.PI) / 180;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const depth = (cos + 1) / 2;
  const depthCurve = depth ** 2.15;
  return {
    // ~half center-card width so ~50% of each neighbor stays visible
    x: sin * ORBIT_RADIUS_X,
    y: (1 - cos) * 14 - (depth > 0.95 ? 5 : 0),
    z: cos * ORBIT_RADIUS_Z,
    scale: 0.66 + depthCurve * 0.54,
    opacity: 0.42 + depth * 0.58,
    blur: (1 - depth) * 4.8,
    rotateY: -sin * 24,
    rotateX: (1 - cos) * -5,
    depth,
  };
}

function DishSteam({ show }) {
  if (!show) return null;
  return (
    <div className="guest-dish-steam" aria-hidden>
      <span className="guest-dish-steam__wisp guest-dish-steam__wisp--1" />
      <span className="guest-dish-steam__wisp guest-dish-steam__wisp--2" />
      <span className="guest-dish-steam__wisp guest-dish-steam__wisp--3" />
      <span className="guest-dish-steam__wisp guest-dish-steam__wisp--4" />
    </div>
  );
}

function plateCardDescription(dish) {
  const raw = String(dish?.description || '').trim();
  if (!raw) return "Chef's selection…";
  return raw;
}

function PlateSlot({ dish, categoryId, delta, dragProgress = 0, onSelect, onPeek }) {
  const cardRef = useDishAttention(dish.id, {
    categoryId,
    source: 'plate_wheel',
  });
  const soldOut = !dish.isAvailable;
  const slotDelta = delta - dragProgress;
  const abs = Math.abs(slotDelta);
  const active = abs < 0.35;
  const pose = orbitPose(slotDelta);
  const widthRem = 10.35;
  const heightRem = 13.6;
  const chefPick = isChefPick(dish);

  return (
    <motion.div
      className="guest-plate-slot absolute left-1/2 top-[51%] -translate-x-1/2 -translate-y-1/2"
      style={{
        width: `${widthRem}rem`,
        height: `${heightRem}rem`,
        zIndex: Math.round(10 + pose.depth * 40),
        transformStyle: 'preserve-3d',
        willChange: 'transform, filter, opacity',
      }}
      initial={false}
      animate={{
        x: pose.x,
        y: pose.y,
        z: pose.z,
        scale: pose.scale,
        opacity: pose.opacity,
        filter: pose.blur < 0.4 ? 'blur(0px)' : `blur(${pose.blur}px)`,
      }}
      transition={{ type: 'spring', stiffness: 210, damping: 28, mass: 0.9 }}
    >
      <div
        className={[
          'guest-plate-dish-shadow pointer-events-none absolute left-1/2 top-[58%] -translate-x-1/2 rounded-full',
          active ? 'guest-plate-dish-shadow--active' : '',
        ].join(' ')}
        aria-hidden
      />

      <DishSteam show={active && !soldOut} />

      <motion.button
        type="button"
        ref={cardRef}
        data-dish-id={dish.id}
        data-category-id={categoryId}
        layout={false}
        initial={false}
        animate={{
          rotateY: pose.rotateY,
          rotateX: pose.rotateX,
        }}
        transition={{ type: 'spring', stiffness: 210, damping: 28, mass: 0.9 }}
        className={[
          'guest-plate-dish relative h-full w-full overflow-hidden rounded-2xl',
          active ? 'guest-plate-dish__ring cursor-pointer' : 'cursor-pointer',
          soldOut ? 'grayscale-[0.35]' : '',
        ].join(' ')}
        onClick={() => {
          if (active) onSelect?.(dish);
          else onPeek?.(dish);
        }}
        aria-label={`${dish.name}, ${formatPrice(dish.price)}`}
        aria-current={active ? 'true' : undefined}
      >
        <div className="flex h-full w-full flex-col overflow-hidden rounded-[inherit]">
          <div className="relative min-h-0 flex-[1.4] overflow-hidden">
            <DishImage
              src={dish.imageUrl}
              alt={dish.name}
              fallbackLabel={dish.name}
              className="scale-105"
            />
            {active && chefPick ? (
              <span className="guest-chef-pick" aria-label="Chef's Pick">
                <svg
                  className="guest-chef-pick__star"
                  viewBox="0 0 24 24"
                  width="10"
                  height="10"
                  aria-hidden
                >
                  <path
                    fill="currentColor"
                    d="M12 2.6l2.4 5.7 6.2.6-4.7 4.1 1.4 6.1L12 16.5 6.7 19.1l1.4-6.1L3.4 8.9l6.2-.6L12 2.6z"
                  />
                </svg>
                <span className="guest-chef-pick__label">Chef's Pick</span>
              </span>
            ) : null}
            {soldOut ? (
              <span className="absolute inset-x-0 bottom-0 bg-black/55 py-1 text-center text-[9px] font-semibold uppercase tracking-wide text-white">
                Sold out
              </span>
            ) : null}
          </div>
          <div className="guest-plate-dish__meta">
            <h3 className="guest-dish-title guest-plate-dish__name">{dish.name}</h3>
            <p className="guest-plate-dish__desc">{plateCardDescription(dish)}</p>
            <p className="guest-plate-dish__price">{formatPrice(dish.price)}</p>
          </div>
        </div>
      </motion.button>
    </motion.div>
  );
}

function DietBadge({ diet, className = '' }) {
  const label = dietLabel(diet);
  if (!label) return null;
  const isVeg = diet === 'veg' || diet === 'vegan';

  return (
    <motion.div
      key={label}
      initial={{ opacity: 0, y: 6, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.95 }}
      className={[
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-1 shadow-md backdrop-blur-md',
        isVeg
          ? 'border-emerald-500/40 bg-emerald-50/95 text-emerald-800'
          : 'border-red-400/40 bg-red-50/95 text-red-800',
        className,
      ].join(' ')}
    >
      <span
        className={[
          'inline-flex h-3 w-3 items-center justify-center rounded-[2px] border-[1.5px]',
          isVeg ? 'border-emerald-600' : 'border-red-600',
        ].join(' ')}
      >
        <span
          className={[
            'h-1 w-1 rounded-full',
            isVeg ? 'bg-emerald-600' : 'bg-red-600',
          ].join(' ')}
        />
      </span>
      <span className="guest-menu-label text-[10px] font-semibold tracking-wide">{label}</span>
    </motion.div>
  );
}

/**
 * Orbit stage â€” floating dishes on glowing rings (no table floor).
 */
function OrbitStage({ tiltX, tiltY, children, onDragProgress, onDragEndGo }) {
  const rotateX = useSpring(tiltX, { stiffness: 160, damping: 24, mass: 0.65 });
  const rotateY = useSpring(tiltY, { stiffness: 160, damping: 24, mass: 0.65 });

  return (
    <motion.div
      className="guest-orbit-scene absolute inset-x-1 bottom-0 top-1 overflow-visible"
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
        transformOrigin: '50% 48%',
      }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.18}
      onDrag={(_, info) => {
        // Swipe left â†’ next dish (positive orbit progress)
        const progress = Math.max(-1.2, Math.min(1.2, -info.offset.x / 155));
        onDragProgress?.(progress);
        tiltY.set(Math.max(-10, Math.min(10, info.offset.x / 14)));
        tiltX.set(Math.max(-6, Math.min(6, -info.offset.y / 18)));
      }}
      onDragEnd={(_, info) => {
        const progress = -info.offset.x / 155;
        const flick = -info.velocity.x;
        tiltX.set(0);
        tiltY.set(0);
        if (progress > 0.28 || flick > 280) onDragEndGo?.(1);
        else if (progress < -0.28 || flick < -280) onDragEndGo?.(-1);
        else onDragProgress?.(0);
      }}
    >
      <div className="guest-orbit-halo" aria-hidden>
        <span className="guest-orbit-ring-track guest-orbit-ring-track--outer">
          <span className="guest-orbit-ring guest-orbit-ring--outer" />
        </span>
        <span className="guest-orbit-ring-track guest-orbit-ring-track--mid">
          <span className="guest-orbit-ring guest-orbit-ring--mid" />
        </span>
        <span className="guest-orbit-ring-track guest-orbit-ring-track--inner">
          <span className="guest-orbit-ring guest-orbit-ring--inner" />
        </span>
        <span className="guest-orbit-glow" />
        <span className="guest-orbit-dot guest-orbit-dot--a" />
        <span className="guest-orbit-dot guest-orbit-dot--b" />
        <span className="guest-orbit-dot guest-orbit-dot--c" />
      </div>

      <div
        className="guest-orbit-shadow pointer-events-none absolute left-1/2 top-[62%] h-8 w-40 -translate-x-1/2 rounded-[100%] bg-black/14 blur-md"
        style={{ transform: 'translateZ(2px)' }}
        aria-hidden
      />

      <div className="absolute inset-0" style={{ transformStyle: 'preserve-3d' }}>
        {children}
      </div>
    </motion.div>
  );
}

/**
 * Interactive AR placemat dish browser.
 */
export function PlateWheel({
  categoryId,
  categoryName = '',
  categoryDescription = '',
  categoryHeadingId,
  categoryHeaderRef,
  dishCount = 0,
  showScrollHint = false,
  flash = false,
  dishes = [],
  quantities = {},
  restaurantName = '',
  onOpenDish,
  onAdd,
  onIncrement,
  onDecrement,
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [dragProgress, setDragProgress] = useState(0);
  const wheelRef = useRef(null);
  const length = dishes.length;
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);

  useEffect(() => {
    setActiveIndex(0);
    setDragProgress(0);
    tiltX.set(0);
    tiltY.set(0);
  }, [categoryId, length, tiltX, tiltY]);

  const activeDish = dishes[activeIndex] || null;
  const activeDiet = activeDish ? getDishDietType(activeDish) : null;

  const go = useCallback(
    (dir) => {
      if (!length) return;
      setDragProgress(0);
      setActiveIndex((prev) => (prev + dir + length) % length);
    },
    [length],
  );

  const peekTo = useCallback(
    (dish) => {
      const index = dishes.findIndex((row) => row.id === dish.id);
      if (index >= 0) setActiveIndex(index);
    },
    [dishes],
  );

  useEffect(() => {
    const node = wheelRef.current;
    if (!node) return undefined;

    const onWheel = (event) => {
      if (Math.abs(event.deltaY) < 8 && Math.abs(event.deltaX) < 8) return;
      event.preventDefault();
      go(event.deltaY > 0 || event.deltaX > 0 ? 1 : -1);
    };

    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, [go]);

  useEffect(() => {
    const node = wheelRef.current;
    if (!node) return undefined;

    const onMove = (event) => {
      const rect = node.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;
      tiltY.set(px * 10);
      tiltX.set(-py * 8);
    };
    const onLeave = () => {
      tiltX.set(0);
      tiltY.set(0);
    };

    node.addEventListener('pointermove', onMove);
    node.addEventListener('pointerleave', onLeave);
    return () => {
      node.removeEventListener('pointermove', onMove);
      node.removeEventListener('pointerleave', onLeave);
    };
  }, [tiltX, tiltY]);

  const slots = useMemo(() => {
    if (!length) return [];
    return dishes.map((dish, index) => ({
      dish,
      index,
      delta: wrapDelta(index, activeIndex, length),
    }));
  }, [dishes, activeIndex, length]);

  if (!length) {
    return (
      <p className="px-4 py-8 text-center text-sm text-[var(--g-muted)]">
        No dishes in this section yet.
      </p>
    );
  }

  return (
    <div
      className={[
        'guest-orbit-wrap relative w-full pt-3',
        flash ? 'guest-section-flash' : '',
      ].join(' ')}
    >
      <div className="guest-orbit-panel relative w-full" ref={categoryHeaderRef}>
        <div
          className="guest-orbit-panel__category absolute left-1/2 top-0 z-30 flex w-max max-w-[85%] -translate-x-1/2 -translate-y-1/2 flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 px-3 py-1 text-center"
        >
          <h2
            id={categoryHeadingId}
            className="guest-menu-label text-[1.15rem] font-semibold tracking-tight text-[var(--g-ink)]"
          >
            {categoryName}
          </h2>
          <span className="rounded-full border border-[var(--g-line)] bg-white px-1.5 py-px text-[9px] font-semibold uppercase tracking-widest text-[var(--g-muted)]">
            {dishCount}
          </span>
        </div>

        <div
          ref={wheelRef}
          className="guest-plate-stage relative h-[19.75rem] w-full overflow-hidden select-none"
        >
          <div className="pointer-events-none absolute left-3 top-3 z-40">
            <AnimatePresence mode="wait">
              {activeDiet ? <DietBadge key={activeDiet} diet={activeDiet} /> : null}
            </AnimatePresence>
          </div>

          <OrbitStage
            tiltX={tiltX}
            tiltY={tiltY}
            onDragProgress={setDragProgress}
            onDragEndGo={go}
          >
            {slots
              .filter((slot) => Math.abs(slot.delta - dragProgress) <= 2.15)
              .map((slot) => (
                <PlateSlot
                  key={slot.dish.id}
                  dish={slot.dish}
                  categoryId={categoryId}
                  delta={slot.delta}
                  dragProgress={dragProgress}
                  onSelect={(dish) => onOpenDish?.(dish)}
                  onPeek={peekTo}
                />
              ))}
          </OrbitStage>

          <button
            type="button"
            onClick={() => go(-1)}
            className="absolute left-1.5 top-[51%] z-50 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--g-line)] bg-white/95 text-[var(--g-ink)] shadow-md backdrop-blur-md active:scale-95"
            aria-label="Previous dish"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            className="absolute right-1.5 top-[51%] z-50 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--g-line)] bg-white/95 text-[var(--g-ink)] shadow-md backdrop-blur-md active:scale-95"
            aria-label="Next dish"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {activeDish ? (
          <div className="guest-orbit-panel__add flex items-center justify-center px-4 py-2">
            {activeDish.isAvailable ? (
              <QuantityControl
                quantity={quantities[activeDish.id] || 0}
                size="sm"
                onAdd={() => onAdd?.(activeDish)}
                onIncrement={() => onIncrement?.(activeDish.id)}
                onDecrement={() => onDecrement?.(activeDish.id)}
              />
            ) : (
              <span className="rounded-full border border-[var(--g-line)] px-3 py-1.5 text-xs font-medium text-[var(--g-muted)]">
                Sold out
              </span>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
