import React, { useState } from 'react';
import { X, Plus, Check, Scale, AlertCircle, Info, Sparkles, ChevronRight, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatPrice, dishImage } from './lib/formatters.js';
import { getDietMarker } from '../../../shared/constants/dietaryTags.js';
import { DishSteam, categoryShowsSteam } from './DishSteam.jsx';

function sameCategory(a, b) {
  const left = a?.categoryId || a?.category || null;
  const right = b?.categoryId || b?.category || null;
  if (!left || !right) return false;
  return String(left) === String(right);
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

  if (!dish) return null;

  const dietMarker = getDietMarker(dish.dietaryTags);
  const src = dishImage(dish);
  const allergenLabels =
    (dish.allergens || []).length > 0
      ? dish.allergens
      : (dish.dietaryTags || []).filter((t) => /^Contains\s/i.test(String(t)));

  const similarDishes = (dish.similarDishIds || [])
    .map((id) => allDishes.find((d) => d.id === id))
    .filter((d) => d && sameCategory(dish, d));

  const alternativeDishes = (dish.suggestedAlternativeIds || [])
    .map((id) => allDishes.find((d) => d.id === id))
    .filter((d) => d && sameCategory(dish, d));

  // Same-category available peers when the dish is resting and no admin alternatives exist
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

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] flex items-end justify-center bg-stone-950/65 p-0 backdrop-blur-sm sm:items-center sm:p-4">
        <button
          type="button"
          className="absolute inset-0 cursor-default"
          aria-label="Close dish detail"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 flex w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-stone-200/90 bg-[#FAF8F5] shadow-2xl sm:rounded-2xl"
          style={{
            maxHeight: 'min(92dvh, calc(100dvh - 0.5rem))',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
        >
          <button
            id="dish-detail-close-btn"
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 z-20 cursor-pointer rounded-full bg-stone-950/70 p-2.5 text-white backdrop-blur-md transition-colors hover:bg-stone-950"
            aria-label="Close dish detail"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="relative aspect-[16/11] w-full flex-shrink-0 overflow-hidden bg-stone-100 sm:aspect-[16/9]">
            {src ? (
              <img
                src={src}
                alt={dish.name}
                referrerPolicy="no-referrer"
                className={`h-full w-full object-cover ${!dish.availability ? 'grayscale-[35%]' : ''}`}
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-[#E8DFD3] to-[#C5A880]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/60 via-transparent to-black/20" />
            <DishSteam
              show={categoryShowsSteam(dish.categoryName) && dish.availability !== false}
            />

            <div className="absolute bottom-3 left-3 z-10 flex flex-wrap items-center gap-1.5 sm:bottom-4 sm:left-4 sm:gap-2">
              {dish.isSignature && (
                <span className="rounded-full bg-stone-950/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#E0CDA9] backdrop-blur-md sm:px-3 sm:text-xs">
                  Signature Dish
                </span>
              )}
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-4 no-scrollbar sm:space-y-6 sm:p-6">
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

              <p className="mt-3 text-sm font-normal leading-relaxed text-stone-600 sm:text-base">
                {dish.description}
              </p>
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
                    <span className="text-[11px] font-semibold tracking-wider uppercase text-stone-700 block mb-2">
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
                          className="flex items-center justify-between p-3 rounded-xl bg-white border border-stone-200/80 hover:border-[#9A7B4F] transition-all cursor-pointer"
                        >
                          <div>
                            <span className="font-serif font-medium text-stone-900 text-sm block">
                              {alt.name}
                            </span>
                            <span className="text-[11px] text-stone-500">
                              {(alt.tasteProfile || []).join(' · ')} · {formatPrice(alt.price, currency)}
                            </span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-[#9A7B4F]" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="p-4 rounded-xl bg-[#FAF6F0] border border-[#E8DFD3] space-y-1">
              <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#9A7B4F] block">
                What to Expect
              </span>
              <p className="text-xs sm:text-sm text-stone-700 font-normal leading-relaxed italic">
                &quot;{dish.whatToExpect}&quot;
              </p>
            </div>

            {(dish.ingredients || []).length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.2em] font-semibold text-stone-900">
                    Featured Ingredients
                  </span>
                  <span className="text-[11px] text-stone-400 font-normal">
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
                        className={`inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-stone-900 text-stone-50 border-stone-900 shadow-2xs'
                            : 'bg-white hover:bg-stone-50 text-stone-700 border-stone-200/90'
                        }`}
                      >
                        <span>{ing.name}</span>
                        <Info className={`w-3 h-3 ${isSelected ? 'text-[#E0CDA9]' : 'text-stone-300'}`} />
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
                      className="p-3.5 bg-white border border-[#9A7B4F]/40 rounded-xl text-xs text-stone-700"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-serif font-semibold text-stone-900 text-sm">
                          {selectedIngredient.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedIngredient(null)}
                          className="text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-stone-600 leading-relaxed font-normal">
                        {selectedIngredient.note ||
                          'Sourced fresh daily from sustainable partner growers across regional farms.'}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <div className="space-y-2.5 border-t border-stone-200/60 pt-3 text-xs">
              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-stone-500" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <span className="font-medium text-stone-800">Dietary tags</span>
                  {(dish.dietaryTags || []).length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {dish.dietaryTags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-stone-200/90 bg-white px-2.5 py-1 text-[11px] font-medium text-stone-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-stone-500">No tags added</span>
                  )}
                </div>
              </div>
              <div className="pl-6 text-stone-500">
                <span>Allergens: </span>
                <span className="font-medium text-stone-700">
                  {allergenLabels.length > 0 ? allergenLabels.join(', ') : 'None listed'}
                </span>
              </div>
            </div>

            {dish.pairingBeverage ? (
              <div className="p-4 rounded-xl bg-white border border-stone-200/80 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase tracking-wider text-[#9A7B4F] font-semibold block">
                    Sommelier Pairing
                  </span>
                  <span className="font-serif font-medium text-stone-900 text-sm">
                    {dish.pairingBeverage}
                  </span>
                </div>
                <Sparkles className="w-4 h-4 text-[#9A7B4F]" />
              </div>
            ) : null}

            {similarDishes.length > 0 && (
              <div className="space-y-2.5 pt-2">
                <span className="text-xs uppercase tracking-[0.2em] font-semibold text-stone-900 block">
                  More from {dish.categoryName || 'this section'}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {similarDishes.map((sim) => (
                    <div
                      key={sim.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelectDish?.(sim)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') onSelectDish?.(sim);
                      }}
                      className="flex items-center space-x-3 p-3 bg-white border border-stone-200/80 rounded-xl hover:border-[#9A7B4F] transition-all cursor-pointer group"
                    >
                      {dishImage(sim) ? (
                        <img
                          src={dishImage(sim)}
                          alt={sim.name}
                          referrerPolicy="no-referrer"
                          className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg flex-shrink-0 bg-gradient-to-br from-[#E8DFD3] to-[#C5A880]" />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-serif font-medium text-stone-900 text-sm truncate group-hover:text-[#9A7B4F] transition-colors">
                          {sim.name}
                        </h4>
                        <span className="text-[11px] text-stone-500 truncate block">
                          {(sim.tasteProfile || []).join(' · ')} · {formatPrice(sim.price, currency)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="shrink-0 space-y-2 border-t border-stone-200/80 bg-white/95 p-3 backdrop-blur-md sm:p-4">
            <div className="flex items-center justify-between gap-2 sm:gap-3">
              <button
                id="detail-compare-btn"
                type="button"
                onClick={() => onToggleCompare?.(dish)}
                className={`flex items-center space-x-1.5 rounded-xl border px-3 py-2.5 text-xs font-medium tracking-wide transition-colors cursor-pointer sm:px-4 ${
                  isCompared
                    ? 'border-[#9A7B4F] bg-[#9A7B4F] text-white'
                    : 'border-stone-200 bg-white text-stone-800 hover:bg-stone-50'
                }`}
              >
                <Scale className="h-3.5 w-3.5" />
                <span>{isCompared ? 'Comparing' : 'Compare'}</span>
              </button>

              <button
                id="detail-shortlist-btn"
                type="button"
                onClick={() => onToggleShortlist?.(dish)}
                className={`flex flex-1 cursor-pointer items-center justify-center space-x-2 rounded-xl px-3 py-2.5 text-xs font-medium uppercase tracking-wider shadow-sm transition-all active:scale-[0.99] sm:px-4 sm:text-sm ${
                  isShortlisted
                    ? 'border border-stone-200 bg-stone-100 text-stone-800'
                    : 'border border-stone-200 bg-white text-stone-800 hover:bg-stone-50'
                }`}
              >
                {isShortlisted ? (
                  <>
                    <Check className="h-4 w-4 text-[#9A7B4F]" />
                    <span className="truncate">Saved to Picks</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 text-stone-400" />
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
