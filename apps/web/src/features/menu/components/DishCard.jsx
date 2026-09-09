import {
  formatPrice,
  getDishBadges,
  getDishDietType,
} from '../lib/menuUtils.js';
import { useDishAttention } from '../../analytics/useDishAttention.js';
import { DishImage } from './DishImage.jsx';
import { QuantityControl } from './QuantityControl.jsx';

const DESC_MAX = 52;

function railDescription(dish) {
  const raw = String(dish?.description || '').trim();
  const fallback = 'Chef’s selection';
  if (!raw) return fallback;
  if (raw.length <= DESC_MAX) return raw;
  return `${raw.slice(0, DESC_MAX).trim()}…`;
}

/**
 * Compact luxury horizontal dish card — sized for 2-up rail viewport.
 */
export function DishCard({
  dish,
  categoryId,
  analyticsSource = 'menu_rail',
  quantity = 0,
  onOpen,
  onAdd,
  onIncrement,
  onDecrement,
}) {
  const cardRef = useDishAttention(dish.id, { categoryId, source: analyticsSource });
  const diet = getDishDietType(dish);
  const badge = getDishBadges(dish)[0];
  const isVeg = diet === 'veg' || diet === 'vegan';
  const soldOut = !dish.isAvailable;

  return (
    <article
      ref={cardRef}
      data-dish-id={dish.id}
      data-category-id={categoryId}
      className={[
        'guest-rail-card group relative snap-start overflow-hidden rounded-xl border shadow-[var(--g-shadow)] transition-transform active:scale-[0.98]',
        soldOut
          ? 'guest-rail-card--sold-out border-[var(--g-line)] bg-[var(--g-bg-surface)] opacity-80'
          : 'border-[var(--g-line-strong)] bg-[var(--g-bg-elevated)]',
      ].join(' ')}
    >
      <button
        type="button"
        onClick={() => onOpen(dish)}
        className="flex w-full items-start gap-2.5 p-2.5 text-left"
      >
        <div className="relative h-[5rem] w-[5rem] shrink-0 overflow-hidden rounded-lg shadow-inner">
          <DishImage
            src={dish.imageUrl}
            alt={dish.name}
            fallbackLabel={dish.name}
            className={soldOut ? 'grayscale-[0.35] brightness-90' : 'group-hover:scale-[1.03]'}
          />

          {diet ? (
            <span
              className={[
                'absolute left-1 top-1 inline-flex h-3 w-3 items-center justify-center rounded-[2px] border bg-white/90 backdrop-blur-sm',
                isVeg ? 'border-emerald-500/50' : 'border-red-400/50',
              ].join(' ')}
            >
              <span
                className={[
                  'h-1 w-1 rounded-full',
                  isVeg ? 'bg-emerald-400' : 'bg-red-400',
                ].join(' ')}
              />
            </span>
          ) : null}

          {badge && !soldOut ? (
            <span className="absolute bottom-0.5 left-0.5 rounded border border-[var(--g-accent-deep)]/35 bg-[var(--g-accent-soft)] px-0.5 text-[6px] font-medium uppercase tracking-wider text-[var(--g-accent-bright)]">
              {badge.label}
            </span>
          ) : null}

          {soldOut ? (
            <span className="absolute inset-x-0 bottom-0 bg-black/60 px-0.5 py-px text-center text-[7px] font-medium uppercase tracking-wide text-[var(--g-muted)]">
              N/A
            </span>
          ) : null}
        </div>

        <div className="flex min-h-[5rem] min-w-0 flex-1 flex-col overflow-hidden pb-7">
          <div className="min-w-0 overflow-hidden">
            <h3
              className={[
                'guest-dish-title line-clamp-1 text-[0.875rem] font-semibold leading-tight tracking-tight',
                soldOut ? 'text-[var(--g-muted)]' : 'text-[var(--g-ink)]',
              ].join(' ')}
            >
              {dish.name}
            </h3>
            <p className="mt-0.5 line-clamp-2 max-h-[2.35rem] overflow-hidden text-[10px] leading-snug text-[var(--g-ink-soft)] break-words">
              {railDescription(dish)}
            </p>
          </div>
          <p
            className={[
              'mt-auto pt-1 text-sm font-semibold tabular-nums',
              soldOut ? 'text-[var(--g-muted)]' : 'text-[var(--g-accent-bright)]',
            ].join(' ')}
          >
            {formatPrice(dish.price)}
          </p>
        </div>
      </button>

      <div className="absolute bottom-2 right-2">
        {!soldOut ? (
          <QuantityControl
            quantity={quantity}
            size="xs"
            onAdd={() => onAdd(dish)}
            onIncrement={() => onIncrement(dish.id)}
            onDecrement={() => onDecrement(dish.id)}
          />
        ) : (
          <span className="rounded-md border border-[var(--g-line)] bg-[var(--g-bg-surface)] px-2 py-1 text-[9px] font-medium uppercase tracking-wide text-[var(--g-muted)]">
            Sold out
          </span>
        )}
      </div>
    </article>
  );
}
