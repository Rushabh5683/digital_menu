import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Plus,
  Check,
  Scale,
  AlertCircle,
  Info,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatPrice, dishImage } from './lib/formatters.js';
import { getDietMarker, splitDietaryAndServesTags } from '../../../shared/constants/dietaryTags.js';
import { useLockBodyScroll } from '../../../shared/lib/useLockBodyScroll.js';
import { DishSteam, categoryShowsSteam } from './DishSteam.jsx';

function sameCategory(a, b) {
  const left = a?.categoryId || a?.category || null;
  const right = b?.categoryId || b?.category || null;
  if (!left || !right) return false;
  return String(left) === String(right);
}

/** "Serves 3" → "3 people"; "Serves 5+" → "5+ people" */
function formatServesLabel(tag) {
  const raw = String(tag || '').trim();
  const match = raw.match(/^serves\s+(\d+\+?)/i);
  if (!match) return raw;
  const count = match[1];
  return `${count} ${count === '1' ? 'person' : 'people'}`;
}

export function DishDetailModal({
  dish,
  allDishes = [],
  isShortlisted,
  isCompared,
  onClose,
  onToggleShortlist,
  onToggleCompare,
  onSelectDish,
  onIngredientTapped,
  onAddToOrder,
  currency = 'INR',
}) {
  const [selectedIngredient, setSelectedIngredient] = useState(null);
  const [compactHeader, setCompactHeader] = useState(false);
  const scrollRef = useRef(null);
  const heroRef = useRef(null);

  useLockBodyScroll(Boolean(dish));

  useEffect(() => {
    setSelectedIngredient(null);
    setCompactHeader(false);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [dish?.id]);

  if (!dish) return null;

  const dietMarker = getDietMarker(dish.dietaryTags);
  const src = dishImage(dish);
  const { dietary: dietaryOnlyTags, serves: servesTags } = splitDietaryAndServesTags(
    dish.dietaryTags,
  );
  const allergenLabels =
    (dish.allergens || []).length > 0
      ? dish.allergens
      : dietaryOnlyTags.filter((t) => /^Contains\s/i.test(String(t)));

  const similarDishes = (dish.similarDishIds || [])
    .map((id) => allDishes.find((d) => d.id === id))
    .filter((d) => d && sameCategory(dish, d));

  const alternativeDishes = (dish.suggestedAlternativeIds || [])
    .map((id) => allDishes.find((d) => d.id === id))
    .filter((d) => d && sameCategory(dish, d));

  const sameCategoryAvailable = allDishes
    .filter(
      (d) => d.id !== dish.id && sameCategory(dish, d) && d.availability !== false,
    )
    .slice(0, 3);

  let fallbackAlts = alternativeDishes;
  if (fallbackAlts.length === 0 && !dish.availability) {
    const fromSimilar = similarDishes.filter((d) => d.availability).slice(0, 3);
    fallbackAlts = fromSimilar.length > 0 ? fromSimilar : sameCategoryAvailable;
  }

  const handleIngredientClick = (ing) => {
    setSelectedIngredient(selectedIngredient?.name === ing.name ? null : ing);
    onIngredientTapped?.(ing);
  };

  function handleContentScroll() {
    const hero = heroRef.current;
    const scroller = scrollRef.current;
    if (!hero || !scroller) return;
    const threshold = Math.max(72, hero.offsetHeight * 0.55);
    setCompactHeader(scroller.scrollTop > threshold);
  }

  return (
    <AnimatePresence>
      <div className="guest-portal fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-4">
        <button
          type="button"
          className="absolute inset-0 cursor-default bg-stone-900/40"
          aria-label="Close dish detail"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 flex w-full min-w-0 max-w-lg flex-col overflow-hidden rounded-t-3xl border border-stone-200 bg-[#FAF8F5] shadow-2xl sm:rounded-2xl"
          style={{
            maxHeight: 'min(92dvh, calc(100dvh - 0.5rem))',
          }}
        >
          <button
            id="dish-detail-close-btn"
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 z-30 cursor-pointer rounded-full bg-stone-950/70 p-2.5 text-white backdrop-blur-md transition-colors hover:bg-stone-950"
            aria-label="Close dish detail"
          >
            <X className="h-4 w-4" />
          </button>

          <AnimatePresence>
            {compactHeader ? (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-x-0 top-0 z-20 border-b border-stone-200/80 bg-[#FAF8F5]/95 px-4 py-3 pr-14 backdrop-blur-md"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9A7B4F]">
                      {dish.categoryName}
                    </p>
                    <h2 className="truncate font-serif text-base font-medium text-stone-900">
                      {dish.name}
                    </h2>
                  </div>
                  <span className="shrink-0 font-serif text-base font-semibold text-stone-900">
                    {formatPrice(dish.price, currency)}
                  </span>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div
            ref={scrollRef}
            onScroll={handleContentScroll}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain no-scrollbar"
          >
            <div
              ref={heroRef}
              className="relative aspect-[16/11] w-full overflow-hidden bg-stone-100 sm:aspect-[16/9]"
            >
              {src ? (
                <img
                  src={src}
                  alt={dish.name}
                  referrerPolicy="no-referrer"
                  className={`h-full w-full object-cover ${
                    !dish.availability ? 'grayscale-[35%]' : ''
                  }`}
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-[#E8DFD3] to-[#C5A880]" />
              )}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-stone-950/55 via-transparent to-black/20" />
              <DishSteam
                show={
                  categoryShowsSteam(dish.categoryName) && dish.availability !== false
                }
              />
              {dish.isSignature ? (
                <div className="absolute bottom-3 left-3 z-10">
                  <span className="rounded-full bg-stone-950/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#E0CDA9] backdrop-blur-md sm:px-3 sm:text-xs">
                    Signature Dish
                  </span>
                </div>
              ) : null}
            </div>

            <div className="space-y-5 p-4 sm:space-y-6 sm:p-6">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-1.5 flex items-center space-x-2">
                      {dietMarker ? (
                        <span
                          className={`flex h-3.5 w-3.5 items-center justify-center rounded-[3px] border ${
                            dietMarker === 'veg'
                              ? 'border-emerald-600 bg-emerald-50/50'
                              : 'border-rose-700 bg-rose-50/50'
                          }`}
                          title={dietMarker === 'veg' ? 'Vegetarian' : 'Non-Vegetarian'}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              dietMarker === 'veg' ? 'bg-emerald-600' : 'bg-rose-700'
                            }`}
                          />
                        </span>
                      ) : null}
                      <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#9A7B4F]">
                        {dish.categoryName}
                      </span>
                    </div>
                    <h2 className="font-serif text-2xl font-medium leading-tight text-stone-900 sm:text-3xl">
                      {dish.name}
                    </h2>
                    {dish.nativeName ? (
                      <span className="mt-0.5 block font-serif text-xs italic text-stone-400">
                        {dish.nativeName}
                      </span>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="block whitespace-nowrap font-serif text-2xl font-semibold text-stone-900 sm:text-3xl">
                      {formatPrice(dish.price, currency)}
                    </span>
                  </div>
                </div>

                {dish.description ? (
                  <p className="mt-3 text-sm font-normal leading-relaxed text-stone-600 sm:text-base">
                    {dish.description}
                  </p>
                ) : null}
              </div>

              {!dish.availability && (
                <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-stone-800">
                  <div className="flex items-center space-x-2 font-serif text-base text-amber-900">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <span>This dish is resting today</span>
                  </div>
                  <p className="text-xs text-stone-600">
                    {dish.unavailableReason ||
                      'It’s not available to order right now — browse similar dishes below.'}
                  </p>
                  {fallbackAlts.length > 0 && (
                    <div className="pt-2">
                      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-stone-700">
                        Chef&apos;s recommended alternatives:
                      </span>
                      <div className="space-y-2">
                        {fallbackAlts.map((alt) => (
                          <div
                            key={alt.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => onSelectDish?.(alt)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') onSelectDish?.(alt);
                            }}
                            className="flex cursor-pointer items-center justify-between rounded-xl border border-stone-200/80 bg-white p-3 transition-all hover:border-[#9A7B4F]"
                          >
                            <div>
                              <span className="block font-serif text-sm font-medium text-stone-900">
                                {alt.name}
                              </span>
                              <span className="text-[11px] text-stone-500">
                                {(alt.tasteProfile || []).join(' · ')} ·{' '}
                                {formatPrice(alt.price, currency)}
                              </span>
                            </div>
                            <ChevronRight className="h-4 w-4 text-[#9A7B4F]" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {dish.whatToExpect ? (
                <div className="space-y-1 rounded-xl border border-[#E8DFD3] bg-[#FAF6F0] p-4">
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9A7B4F]">
                    What to Expect
                  </span>
                  <p className="text-xs font-normal leading-relaxed text-stone-700 italic sm:text-sm">
                    &quot;{dish.whatToExpect}&quot;
                  </p>
                </div>
              ) : null}

              {(dish.ingredients || []).length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-900">
                      Featured Ingredients
                    </span>
                    <span className="text-[11px] font-normal text-stone-400">
                      Tap any ingredient for culinary notes
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {dish.ingredients.map((ing, idx) => {
                      const isSelected = selectedIngredient?.name === ing.name;
                      return (
                        <button
                          key={idx}
                          id={`ingredient-chip-${idx}`}
                          type="button"
                          onClick={() => handleIngredientClick(ing)}
                          className={`inline-flex cursor-pointer items-center space-x-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${
                            isSelected
                              ? 'border-stone-900 bg-stone-900 text-stone-50 shadow-2xs'
                              : 'border-stone-200/90 bg-white text-stone-700 hover:bg-stone-50'
                          }`}
                        >
                          <span>{ing.name}</span>
                          <Info
                            className={`h-3 w-3 ${
                              isSelected ? 'text-[#E0CDA9]' : 'text-stone-300'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>

                  <AnimatePresence>
                    {selectedIngredient && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="rounded-xl border border-[#9A7B4F]/40 bg-white p-3.5 text-xs text-stone-700"
                      >
                        <div className="mb-1 flex items-center justify-between">
                          <span className="font-serif text-sm font-semibold text-stone-900">
                            {selectedIngredient.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedIngredient(null)}
                            className="cursor-pointer p-1 text-stone-400 hover:text-stone-700"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <p className="font-normal leading-relaxed text-stone-600">
                          {selectedIngredient.note ||
                            'Sourced fresh daily from sustainable partner growers across regional farms.'}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              <div className="overflow-hidden rounded-2xl border border-stone-200/90 bg-white text-sm shadow-[0_1px_0_rgba(28,25,23,0.03)]">
                <div className="flex gap-3 border-b border-stone-100 px-4 py-3.5">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-stone-500" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                      Dietary
                    </p>
                    {dietaryOnlyTags.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {dietaryOnlyTags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-medium text-stone-800"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-1.5 text-sm text-stone-500">No dietary tags added</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 border-b border-stone-100 px-4 py-3.5">
                  <Users className="mt-0.5 h-4 w-4 shrink-0 text-stone-500" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                      Portion size
                    </p>
                    {servesTags.length > 0 ? (
                      <p className="mt-1.5 font-serif text-base font-medium leading-snug text-stone-900">
                        Serves {formatServesLabel(servesTags[0])}
                      </p>
                    ) : (
                      <p className="mt-1.5 text-sm text-stone-500">Portion size not specified</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 px-4 py-3.5">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-stone-500" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                      Allergens
                    </p>
                    <p className="mt-1.5 text-sm font-medium leading-snug text-stone-800">
                      {allergenLabels.length > 0
                        ? allergenLabels.join(', ')
                        : 'None listed'}
                    </p>
                  </div>
                </div>
              </div>

              {dish.pairingBeverage ? (
                <div className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-stone-200/80 bg-white p-4">
                  <div className="min-w-0 space-y-0.5">
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#9A7B4F]">
                      Sommelier Pairing
                    </span>
                    <span className="break-words font-serif text-sm font-medium text-stone-900">
                      {dish.pairingBeverage}
                    </span>
                  </div>
                  <Sparkles className="h-4 w-4 shrink-0 text-[#9A7B4F]" />
                </div>
              ) : null}

              {similarDishes.length > 0 && (
                <div className="space-y-2.5 pt-2">
                  <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-stone-900">
                    More from {dish.categoryName || 'this section'}
                  </span>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {similarDishes.map((sim) => (
                      <div
                        key={sim.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => onSelectDish?.(sim)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') onSelectDish?.(sim);
                        }}
                        className="group flex cursor-pointer items-center space-x-3 rounded-xl border border-stone-200/80 bg-white p-3 transition-all hover:border-[#9A7B4F]"
                      >
                        {dishImage(sim) ? (
                          <img
                            src={dishImage(sim)}
                            alt={sim.name}
                            referrerPolicy="no-referrer"
                            className="h-12 w-12 flex-shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="h-12 w-12 flex-shrink-0 rounded-lg bg-gradient-to-br from-[#E8DFD3] to-[#C5A880]" />
                        )}
                        <div className="min-w-0 flex-1">
                          <h4 className="truncate font-serif text-sm font-medium text-stone-900 transition-colors group-hover:text-[#9A7B4F]">
                            {sim.name}
                          </h4>
                          <span className="block truncate text-[11px] text-stone-500">
                            {(sim.tasteProfile || []).join(' · ')} ·{' '}
                            {formatPrice(sim.price, currency)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0 space-y-2 border-t border-stone-200/80 bg-white/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] backdrop-blur-md sm:p-4 sm:pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
            <div className="flex min-w-0 flex-col gap-2 min-[380px]:flex-row min-[380px]:items-center">
              <button
                id="detail-compare-btn"
                type="button"
                onClick={() => onToggleCompare?.(dish)}
                className={`flex min-h-11 w-full min-w-0 cursor-pointer items-center justify-center gap-1.5 overflow-hidden rounded-xl border px-3 py-2.5 text-xs font-medium tracking-wide transition-colors min-[380px]:w-auto min-[380px]:shrink-0 sm:px-4 ${
                  isCompared
                    ? 'border-[#9A7B4F] bg-[#9A7B4F] text-white'
                    : 'border-stone-200 bg-white text-stone-800 hover:bg-stone-50'
                }`}
              >
                <Scale className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{isCompared ? 'Comparing' : 'Compare'}</span>
              </button>

              <button
                id="detail-shortlist-btn"
                type="button"
                onClick={() => onToggleShortlist?.(dish)}
                className={`flex min-h-11 min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl px-3 py-2.5 text-xs font-medium uppercase tracking-wider shadow-sm transition-all active:scale-[0.99] sm:px-4 sm:text-sm ${
                  isShortlisted
                    ? 'border border-stone-200 bg-stone-100 text-stone-800'
                    : 'border border-stone-200 bg-white text-stone-800 hover:bg-stone-50'
                }`}
              >
                {isShortlisted ? (
                  <>
                    <Check className="h-4 w-4 shrink-0 text-[#9A7B4F]" />
                    <span className="truncate">Saved to Picks</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 shrink-0 text-stone-400" />
                    <span className="truncate">Add to Picks</span>
                  </>
                )}
              </button>
            </div>
            {typeof onAddToOrder === 'function' && dish.availability ? (
              <button
                id="detail-add-order-btn"
                type="button"
                onClick={() => onAddToOrder(dish)}
                className="flex w-full cursor-pointer items-center justify-center space-x-2 rounded-xl bg-stone-950 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-50 shadow-sm transition-all hover:bg-stone-800 active:scale-[0.99] sm:text-sm"
              >
                <Plus className="h-4 w-4 text-[#E0CDA9]" />
                <span>Add to order · {formatPrice(dish.price, currency)}</span>
              </button>
            ) : null}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
