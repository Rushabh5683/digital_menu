import React from 'react';
import { ExperienceDishCard } from './ExperienceDishCard.jsx';
import { Sparkles, Compass, ArrowRight, RotateCcw } from 'lucide-react';
import { formatPrice, dishImage } from './lib/formatters.js';

export function SearchResultsView({
  searchResult,
  shortlistIds,
  comparisonPair,
  onOpenDetail,
  onToggleShortlist,
  onToggleCompare,
  onAddToOrder,
  onClearSearch,
  onRecoveryDishClicked,
  currency = 'INR',
}) {
  if (!searchResult) return null;

  return (
    <div className="px-4 py-5 sm:py-6">
      <div className="flex items-center justify-between pb-3.5 mb-6 border-b border-stone-200/60">
        <div>
          <div className="flex items-center space-x-1.5 text-xs text-[#9A7B4F] font-medium tracking-wider uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Search Discovery</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-serif text-stone-900 font-normal mt-0.5">
            {searchResult.contextualHeadline}
          </h2>
        </div>

        <button
          type="button"
          onClick={onClearSearch}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Search</span>
        </button>
      </div>

      {!searchResult.isZeroResult && (
        <div className="grid grid-cols-1 gap-4">
          {searchResult.results.map(({ dish, relevanceReason }) => (
            <div key={dish.id} className="flex flex-col space-y-2">
              <ExperienceDishCard
                dish={dish}
                isShortlisted={shortlistIds?.has(dish.id)}
                isCompared={Boolean(
                  comparisonPair?.some((item) =>
                    typeof item === 'string' ? item === dish.id : item?.id === dish.id,
                  ),
                )}
                onOpenDetail={onOpenDetail}
                onToggleShortlist={onToggleShortlist}
                onToggleCompare={onToggleCompare}
                onAddToOrder={onAddToOrder}
                currency={currency}
                analyticsSource="search_results"
              />
              <div className="px-3.5 py-2 rounded-xl bg-[#FAF6F0] border border-[#E8DFD3] text-[11px] text-[#785E39] font-normal italic flex items-center space-x-1.5 shadow-2xs">
                <span className="font-serif not-italic font-semibold text-[#9A7B4F]">Why this:</span>
                <span className="truncate">{relevanceReason}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {searchResult.isZeroResult && (
        <div className="p-6 sm:p-8 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-6">
          <div className="max-w-xl">
            <div className="flex items-center space-x-2 text-stone-900 font-serif text-lg mb-1">
              <Compass className="w-5 h-5 text-[#9A7B4F]" />
              <span>We couldn&apos;t find an exact match for &quot;{searchResult.query}&quot;</span>
            </div>
            <p className="text-xs sm:text-sm text-stone-600 font-normal leading-relaxed">
              Our kitchen prepares heritage recipes made to order. Here are culinary alternatives with matching flavors and textures:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {searchResult.recoveryAlternatives?.map(({ dish, reason }) => (
              <div
                key={dish.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (onRecoveryDishClicked) onRecoveryDishClicked(dish);
                  onOpenDetail(dish);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (onRecoveryDishClicked) onRecoveryDishClicked(dish);
                    onOpenDetail(dish);
                  }
                }}
                className="group p-4 bg-white rounded-2xl border border-stone-200 hover:border-[#9A7B4F] shadow-2xs hover:shadow-md transition-all cursor-pointer flex space-x-3.5 items-start"
              >
                {dishImage(dish) ? (
                  <img
                    src={dishImage(dish)}
                    alt={dish.name}
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 object-cover rounded-xl flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl flex-shrink-0 bg-gradient-to-br from-[#E8DFD3] to-[#C5A880]" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-1">
                    <h4 className="font-serif font-medium text-stone-900 text-sm group-hover:text-[#9A7B4F] transition-colors truncate">
                      {dish.name}
                    </h4>
                    <span className="font-serif font-semibold text-stone-900 text-xs">
                      {formatPrice(dish.price, currency)}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#866940] italic mt-0.5 leading-snug">
                    &quot;{reason}&quot;
                  </p>
                  <div className="mt-2 text-[10px] font-medium tracking-wider uppercase text-stone-400 group-hover:text-stone-800 flex items-center space-x-1">
                    <span>Explore Dish</span>
                    <ArrowRight className="w-3 h-3 text-[#9A7B4F]" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
