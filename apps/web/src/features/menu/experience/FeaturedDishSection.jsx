import React from 'react';
import { ArrowRight, Plus, Check, Scale } from 'lucide-react';
import { formatPrice, dishImage } from './lib/formatters.js';
import { DishSteam, categoryShowsSteam } from './DishSteam.jsx';
import { ExperienceQuantityControl } from './ExperienceQuantityControl.jsx';

/**
 * Signature / featured dishes rail — wired for live enriched dishes.
 * Falls back to chef-recommended / popular when no isSignature flags exist.
 */
export function FeaturedDishSection({
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
  restaurantName,
  currency = 'INR',
}) {
  let signatures = dishes.filter((d) => d.isSignature && d.availability).slice(0, 4);
  if (signatures.length === 0) {
    signatures = dishes.filter((d) => d.isChefRecommended && d.availability).slice(0, 4);
  }
  if (signatures.length === 0) {
    signatures = dishes.filter((d) => d.isPopular && d.availability).slice(0, 4);
  }

  if (signatures.length === 0) return null;

  const eyebrow = restaurantName ? `${restaurantName} · Featured` : 'From the kitchen';

  return (
    <section className="border-b border-stone-200/60 px-4 py-6 sm:px-5 sm:py-8">
      <div className="mb-4 flex items-end justify-between gap-3 sm:mb-5">
        <div className="min-w-0">
          <span className="mb-1 block text-[10px] font-medium uppercase tracking-[0.18em] text-[#9A7B4F] sm:text-[11px] sm:tracking-[0.2em]">
            {eyebrow}
          </span>
          <h2 className="font-serif text-xl font-normal text-stone-900 sm:text-2xl">
            Signature Dishes
          </h2>
        </div>
        <span className="hidden shrink-0 text-xs font-medium text-stone-400 sm:inline-block">
          House favourites worth trying
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {signatures.map((dish) => {
          const isShortlisted = shortlistIds?.has(dish.id);
          const isCompared = Boolean(
            comparisonPair?.some((item) =>
              typeof item === 'string' ? item === dish.id : item?.id === dish.id,
            ),
          );

          return (
            <div
              key={dish.id}
              id={`featured-card-${dish.id}`}
              role="button"
              tabIndex={0}
              onClick={() => onOpenDetail?.(dish)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onOpenDetail?.(dish);
              }}
              className="group relative flex cursor-pointer flex-col overflow-hidden rounded-sm border border-stone-200/90 bg-white transition-all hover:border-[#9A7B4F]/50 hover:shadow-[0_12px_32px_-6px_rgba(28,25,23,0.08)] sm:flex-row"
            >
              <div className="relative aspect-[16/11] w-full flex-shrink-0 overflow-hidden bg-stone-100 sm:aspect-auto sm:w-2/5">
                {dishImage(dish) ? (
                  <img
                    src={dishImage(dish)}
                    alt={dish.name}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-[#E8DFD3] to-[#C5A880]" />
                )}
                <DishSteam
                  show={categoryShowsSteam(dish.categoryName) && dish.availability !== false}
                />
                <div className="absolute top-2.5 left-2.5 z-10">
                  <span className="rounded-sm bg-stone-950/85 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#E0CDA9] backdrop-blur-md">
                    Signature
                  </span>
                </div>
              </div>

              <div className="flex flex-1 flex-col justify-between p-4 sm:p-5">
                <div>
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-serif text-lg font-medium text-stone-900 transition-colors group-hover:text-[#9A7B4F] sm:text-xl">
                      {dish.name}
                    </h3>
                    <span className="whitespace-nowrap font-serif text-base font-semibold text-stone-900 sm:text-lg">
                      {formatPrice(dish.price, currency)}
                    </span>
                  </div>

                  {dish.nativeName ? (
                    <span className="mb-1 block font-serif text-[11px] italic text-stone-400">
                      {dish.nativeName}
                    </span>
                  ) : null}

                  <p className="line-clamp-2 text-xs font-normal leading-relaxed text-stone-600 sm:line-clamp-3">
                    {dish.description}
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-stone-100 pt-3">
                  <button
                    id={`featured-compare-btn-${dish.id}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleCompare?.(dish, e);
                    }}
                    className={`inline-flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1.5 text-[11px] font-semibold tracking-wide transition-all ${
                      isCompared
                        ? 'border-[#9A7B4F] bg-[#9A7B4F] text-white'
                        : 'border-stone-200 bg-white text-stone-700 hover:text-stone-900'
                    }`}
                  >
                    <Scale className="h-3.5 w-3.5 shrink-0" />
                    <span>{isCompared ? 'Comparing' : 'Compare'}</span>
                  </button>

                  <button
                    id={`featured-shortlist-btn-${dish.id}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleShortlist?.(dish, e);
                    }}
                    className={`inline-flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1.5 text-[11px] font-semibold tracking-wide transition-all ${
                      isShortlisted
                        ? 'border-stone-900 bg-stone-900 text-[#E0CDA9]'
                        : 'border-stone-200 bg-white text-stone-700 hover:text-stone-900'
                    }`}
                  >
                    {isShortlisted ? (
                      <Check className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <Plus className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span>{isShortlisted ? 'Saved' : 'Save to Picks'}</span>
                  </button>

                  {typeof onAddToOrder === 'function' && dish.availability !== false ? (
                    <ExperienceQuantityControl
                      id={`featured-add-btn-${dish.id}`}
                      quantity={quantities[dish.id] || 0}
                      onAdd={() => onAddToOrder(dish)}
                      onIncrement={() => onIncrement?.(dish.id)}
                      onDecrement={() => onDecrement?.(dish.id)}
                    />
                  ) : (
                    <div className="ml-auto flex items-center space-x-0.5 text-xs font-medium text-stone-800 transition-transform group-hover:translate-x-0.5">
                      <span>View</span>
                      <ArrowRight className="h-3 w-3 text-[#9A7B4F]" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
