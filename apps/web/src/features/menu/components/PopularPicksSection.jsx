import { formatPrice, getDishDietType } from '../lib/menuUtils.js';
import { useDishAttention } from '../../analytics/useDishAttention.js';
import { DishImage } from './DishImage.jsx';

/**
 * Compact favourite chip — round photo, name, price. Tap opens dish details.
 */
function FavouriteChip({ dish, categoryId, onOpen }) {
  const cardRef = useDishAttention(dish.id, {
    categoryId,
    source: 'popular_rail',
  });
  const diet = getDishDietType(dish);
  const isVeg = diet === 'veg' || diet === 'vegan';
  const soldOut = !dish.isAvailable;

  return (
    <button
      type="button"
      ref={cardRef}
      data-dish-id={dish.id}
      data-category-id={categoryId}
      onClick={() => onOpen?.(dish)}
      disabled={soldOut}
      className={[
        'guest-fav-chip snap-start',
        soldOut ? 'guest-fav-chip--sold-out' : '',
      ].join(' ')}
      aria-label={`${dish.name}, ${formatPrice(dish.price)}`}
    >
      <span className="guest-fav-chip__photo">
        <DishImage
          src={dish.imageUrl}
          alt=""
          fallbackLabel={dish.name}
          className={soldOut ? 'grayscale-[0.4]' : ''}
          rounded
        />
        {diet ? (
          <span
            className={[
              'guest-fav-chip__diet',
              isVeg ? 'guest-fav-chip__diet--veg' : 'guest-fav-chip__diet--non',
            ].join(' ')}
            aria-hidden
          />
        ) : null}
      </span>
      <span className="guest-fav-chip__meta">
        <span className="guest-fav-chip__name">{dish.name}</span>
        <span className="guest-fav-chip__price">{formatPrice(dish.price)}</span>
      </span>
    </button>
  );
}

/**
 * Most-selected dishes rail from live DISH_SELECTED analytics.
 * Calm compact chips — no entrance animation.
 */
export function PopularPicksSection({
  dishes = [],
  dishCategoryMap = {},
  onOpenDish,
  showScrollHint = false,
}) {
  if (!dishes.length) return null;

  return (
    <section
      id="section-popular-picks"
      data-section-id="popular-picks"
      className="scroll-mt-[calc(var(--g-header-h)+0.85rem)]"
      aria-labelledby="popular-picks-heading"
    >
      <div className="mb-3 flex items-end justify-between gap-3 px-4">
        <div className="min-w-0">
          <p className="guest-menu-label text-[10px] font-semibold uppercase tracking-[0.18em]">
            Most selected
          </p>
          <h2
            id="popular-picks-heading"
            className="guest-menu-label text-[1.35rem] font-semibold tracking-tight"
          >
            Guest favourites
          </h2>
        </div>
        {showScrollHint ? (
          <span className="shrink-0 text-[10px] font-medium uppercase tracking-widest text-[var(--g-muted)]">
            Swipe →
          </span>
        ) : null}
      </div>

      <div className="guest-fav-chip-rail-scroll no-scrollbar">
        <div className="guest-fav-chip-rail">
          {dishes.map((dish) => (
            <FavouriteChip
              key={dish.id}
              dish={dish}
              categoryId={dishCategoryMap[dish.id]}
              onOpen={onOpenDish}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
