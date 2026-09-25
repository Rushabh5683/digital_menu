import React, { useEffect, useMemo, useState } from 'react';
import { compareDishes } from './lib/recommendations.js';
import { X, Scale, Check, Plus, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatPrice, dishImage } from './lib/formatters.js';
import { getDietMarker } from '../../../shared/constants/dietaryTags.js';
import { useLockBodyScroll } from '../../../shared/lib/useLockBodyScroll.js';
import { useSheetSwipeDismiss, SheetSwipeAffordance } from './useSheetSwipeDismiss.jsx';

function categoryKeyOf(dish) {
  if (!dish) return '';
  const id = dish.categoryId ?? dish.category;
  if (id != null && String(id).trim() !== '') return `id:${String(id)}`;
  const name = String(dish.categoryName || '').trim();
  if (name) return `name:${name.toLowerCase()}`;
  return 'other';
}

function categoryLabelOf(dish) {
  return String(dish?.categoryName || '').trim() || 'Other';
}

function dishInCategory(dish, categoryKey) {
  return categoryKeyOf(dish) === categoryKey;
}

export function ComparisonModal({
  pair,
  allDishes = [],
  shortlistIds,
  onClose,
  onOpenDishDetail,
  onToggleShortlist,
  onChangeDish,
  currency = 'INR',
}) {
  const [pickingSlot, setPickingSlot] = useState(null); // 0 | 1 | null
  const [pickCategoryKey, setPickCategoryKey] = useState('');

  const dishA = pair?.[0] || null;
  const dishB = pair?.[1] || null;

  const availableDishes = useMemo(
    () => (allDishes || []).filter((d) => d?.availability !== false),
    [allDishes],
  );

  const pickingDish = pickingSlot === 0 ? dishA : pickingSlot === 1 ? dishB : null;
  const otherDish = pickingSlot === 0 ? dishB : pickingSlot === 1 ? dishA : null;

  const categoryOptions = useMemo(() => {
    const map = new Map();
    for (const dish of availableDishes) {
      const key = categoryKeyOf(dish);
      if (!key) continue;
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(key, { key, label: categoryLabelOf(dish), count: 1 });
      }
    }
    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [availableDishes]);

  // When opening Change, default to that dish's category
  useEffect(() => {
    if (pickingSlot == null || !pickingDish) {
      setPickCategoryKey('');
      return;
    }
    setPickCategoryKey(categoryKeyOf(pickingDish));
  }, [pickingSlot, pickingDish?.id]);

  const pickMeta = useMemo(() => {
    if (pickingSlot == null || !pickingDish || !pickCategoryKey) {
      return { choices: [], categoryLabel: '', dietMarker: null };
    }

    const otherId = otherDish?.id;
    const dietMarker = getDietMarker(pickingDish.dietaryTags);
    const categoryLabel =
      categoryOptions.find((c) => c.key === pickCategoryKey)?.label ||
      categoryLabelOf(pickingDish);

    const inCategory = availableDishes.filter(
      (d) =>
        d.id !== otherId &&
        d.id !== pickingDish.id &&
        dishInCategory(d, pickCategoryKey),
    );

    // Prefer same diet within chosen category, but always show category dishes
    if (dietMarker) {
      const dietMatched = inCategory.filter((d) => getDietMarker(d.dietaryTags) === dietMarker);
      if (dietMatched.length > 0) {
        // Put diet matches first, then rest of category
        const rest = inCategory.filter((d) => getDietMarker(d.dietaryTags) !== dietMarker);
        return {
          choices: [...dietMatched, ...rest].slice(0, 16),
          categoryLabel,
          dietMarker,
        };
      }
    }

    return {
      choices: inCategory.slice(0, 16),
      categoryLabel,
      dietMarker,
    };
  }, [
    pickingSlot,
    pickingDish,
    otherDish,
    availableDishes,
    pickCategoryKey,
    categoryOptions,
  ]);

  const quickChoices = pickMeta.choices;

  function openPicker(slot) {
    setPickingSlot((current) => {
      if (current === slot) return null;
      const dish = slot === 0 ? dishA : dishB;
      if (dish) setPickCategoryKey(categoryKeyOf(dish));
      return slot;
    });
  }

  const open = Boolean(pair && dishA && dishB);
  useLockBodyScroll(open);
  const swipe = useSheetSwipeDismiss(onClose, { enabled: open });

  if (!open) return null;

  const { diffs, advice } = compareDishes(dishA, dishB, currency);
  const rows = diffs;
  const canChange = typeof onChangeDish === 'function' && availableDishes.length > 1;

  return (
    <AnimatePresence>
      <div className="guest-portal fixed inset-x-0 top-0 z-[70] flex justify-center" style={{ bottom: 0 }}>
        <div className="relative flex h-full w-full max-w-lg flex-col justify-end">
          <button
            type="button"
            ref={swipe.backdropRef}
            className="absolute inset-0 cursor-default bg-stone-900/40"
            aria-label="Close comparison"
            onClick={onClose}
            style={swipe.backdropStyle}
          />

          <div
            ref={swipe.panelRef}
            className="relative z-10 flex max-h-[min(88dvh,calc(100dvh-0.75rem))] w-full min-w-0 flex-col overflow-hidden rounded-t-3xl border border-stone-200 bg-[#FAF8F5] shadow-2xl"
            style={swipe.panelStyle}
          >
            <SheetSwipeAffordance {...swipe.handleProps} />
            <div
              className="flex shrink-0 items-center justify-between gap-2 border-b border-stone-200/70 px-3.5 py-3"
              {...swipe.handleProps}
            >
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#9A7B4F]/15 text-[#9A7B4F]">
                  <Scale className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <h3 className="truncate font-serif text-base font-medium leading-tight text-stone-900">
                    Compare dishes
                  </h3>
                  <span className="block truncate text-[10px] text-stone-500">
                    Pick the better match for your table
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                onPointerDown={(event) => event.stopPropagation()}
                className="shrink-0 cursor-pointer rounded-full p-2 text-stone-500 hover:bg-stone-200/80 hover:text-stone-900"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div
              ref={swipe.scrollRef}
              className="min-h-0 flex-1 space-y-3.5 overflow-y-auto overscroll-contain px-3.5 py-3.5 no-scrollbar"
              {...swipe.scrollProps}
            >
              {/* Side-by-side from ~360px up; stacked on very narrow phones */}
              <div className="grid min-w-0 grid-cols-1 gap-2 min-[360px]:grid-cols-2">
                {[dishA, dishB].map((dish, slot) => (
                  <div
                    key={`${slot}-${dish.id}`}
                    className={`flex min-w-0 flex-col overflow-hidden rounded-xl border bg-white ${
                      pickingSlot === slot
                        ? 'border-[#9A7B4F] ring-1 ring-[#9A7B4F]/30'
                        : 'border-stone-200/80'
                    }`}
                  >
                    <div className="relative aspect-[5/3] w-full overflow-hidden bg-stone-100">
                      {dishImage(dish) ? (
                        <img
                          src={dishImage(dish)}
                          alt={dish.name}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full bg-gradient-to-br from-[#E8DFD3] to-[#C5A880]" />
                      )}
                      {dish.isSignature ? (
                        <span className="absolute left-1.5 top-1.5 rounded-sm bg-stone-950/85 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-[#E0CDA9]">
                          Signature
                        </span>
                      ) : null}
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-2">
                      <h4 className="line-clamp-2 break-words font-serif text-[13px] font-medium leading-snug text-stone-900">
                        {dish.name}
                      </h4>
                      <span className="font-serif text-sm font-semibold text-stone-900">
                        {formatPrice(dish.price, currency)}
                      </span>

                      {canChange ? (
                        <button
                          type="button"
                          onClick={() => openPicker(slot)}
                          className={`mt-0.5 inline-flex w-full min-h-9 cursor-pointer items-center justify-center gap-1 rounded-full border px-2 py-1.5 text-[10px] font-semibold ${
                            pickingSlot === slot
                              ? 'border-[#9A7B4F] bg-[#9A7B4F]/10 text-[#9A7B4F]'
                              : 'border-stone-200 bg-stone-50 text-stone-700'
                          }`}
                        >
                          <RefreshCw className="h-3 w-3 shrink-0" />
                          <span>{pickingSlot === slot ? 'Cancel' : 'Change'}</span>
                        </button>
                      ) : null}

                      <div className="mt-auto flex gap-1 pt-1">
                        <button
                          type="button"
                          onClick={() => onToggleShortlist?.(dish)}
                          className={`flex min-h-9 min-w-0 flex-1 cursor-pointer items-center justify-center gap-0.5 rounded-full px-1 py-1.5 text-[10px] font-medium ${
                            shortlistIds?.has(dish.id)
                              ? 'bg-stone-950 text-[#E0CDA9]'
                              : 'bg-stone-100 text-stone-800'
                          }`}
                        >
                          {shortlistIds?.has(dish.id) ? (
                            <Check className="h-3 w-3 shrink-0" />
                          ) : (
                            <Plus className="h-3 w-3 shrink-0" />
                          )}
                          <span className="truncate">Picks</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenDishDetail?.(dish);
                          }}
                          className="min-h-9 shrink-0 cursor-pointer rounded-full border border-stone-200 px-2.5 py-1.5 text-[10px] text-stone-600"
                        >
                          Detail
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Change dish — pick category, then dish */}
              <AnimatePresence>
                {pickingSlot != null && canChange ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="space-y-2.5 rounded-xl border border-[#E8DFD3] bg-white p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="block text-[9px] font-semibold uppercase tracking-[0.16em] text-[#9A7B4F]">
                          {pickingSlot === 0 ? 'Change left dish' : 'Change right dish'}
                        </span>
                        <p className="truncate text-[11px] text-stone-500">
                          Pick a category, then a dish
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPickingSlot(null)}
                        className="shrink-0 text-[11px] font-medium text-stone-500"
                      >
                        Close
                      </button>
                    </div>

                    {categoryOptions.length > 0 ? (
                      <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
                        {categoryOptions.map((cat) => {
                          const active = cat.key === pickCategoryKey;
                          return (
                            <button
                              key={cat.key}
                              type="button"
                              onClick={() => setPickCategoryKey(cat.key)}
                              className={`shrink-0 cursor-pointer rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                                active
                                  ? 'border-[#9A7B4F] bg-[#9A7B4F] text-white'
                                  : 'border-stone-200 bg-stone-50 text-stone-700'
                              }`}
                            >
                              {cat.label}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}

                    {quickChoices.length === 0 ? (
                      <p className="text-[11px] text-stone-500">
                        {pickMeta.categoryLabel
                          ? `No other dishes in ${pickMeta.categoryLabel}. Try another category.`
                          : 'No dishes found. Try another category.'}
                      </p>
                    ) : (
                      <div className="max-h-48 space-y-1.5 overflow-y-auto no-scrollbar">
                        {quickChoices.map((option) => {
                          const optionDiet = getDietMarker(option.dietaryTags);
                          return (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => {
                                onChangeDish(pickingSlot, option);
                                setPickingSlot(null);
                              }}
                              className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl border border-stone-100 bg-stone-50/80 px-2 py-2 text-left transition-colors hover:border-[#9A7B4F]/40 hover:bg-[#FAF6F0]"
                            >
                              {dishImage(option) ? (
                                <img
                                  src={dishImage(option)}
                                  alt=""
                                  referrerPolicy="no-referrer"
                                  className="h-10 w-10 shrink-0 rounded-lg object-cover"
                                />
                              ) : (
                                <div className="h-10 w-10 shrink-0 rounded-lg bg-gradient-to-br from-[#E8DFD3] to-[#C5A880]" />
                              )}
                              <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-1.5">
                                  {optionDiet ? (
                                    <span
                                      className={`inline-flex h-3 w-3 shrink-0 items-center justify-center rounded-[2px] border ${
                                        optionDiet === 'veg'
                                          ? 'border-emerald-600'
                                          : 'border-rose-700'
                                      }`}
                                      title={optionDiet === 'veg' ? 'Vegetarian' : 'Non-Vegetarian'}
                                    >
                                      <span
                                        className={`h-1.5 w-1.5 rounded-full ${
                                          optionDiet === 'veg' ? 'bg-emerald-600' : 'bg-rose-700'
                                        }`}
                                      />
                                    </span>
                                  ) : null}
                                  <span className="truncate font-serif text-sm font-medium text-stone-900">
                                    {option.name}
                                  </span>
                                </span>
                                <span className="text-[11px] text-stone-500">
                                  {formatPrice(option.price, currency)}
                                  {option.categoryName ? ` · ${option.categoryName}` : ''}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                ) : null}
              </AnimatePresence>

              {advice ? (
                <div className="space-y-1 rounded-xl border border-[#E8DFD3] bg-[#FAF6F0] p-3">
                  <span className="block text-[9px] font-semibold uppercase tracking-[0.18em] text-[#9A7B4F]">
                    Quick take
                  </span>
                  <p className="break-words text-[11px] leading-relaxed text-stone-800">
                    {advice}
                  </p>
                </div>
              ) : null}

              <div className="min-w-0 overflow-hidden rounded-xl border border-stone-200/80 bg-white">
                {/* Horizontal scroll only inside the table — keeps 3-col compare readable at 320px */}
                <div className="overflow-x-auto overscroll-x-contain">
                  <div className="min-w-[17.5rem]">
                    <div className="grid grid-cols-[3.75rem_minmax(0,1fr)_minmax(0,1fr)] gap-0 border-b border-stone-200/80 bg-stone-50/90 px-2 py-2">
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-stone-400">
                        Vs
                      </span>
                      <span className="truncate px-1 font-serif text-[11px] font-medium text-stone-900">
                        {dishA.name}
                      </span>
                      <span className="truncate px-1 font-serif text-[11px] font-medium text-stone-900">
                        {dishB.name}
                      </span>
                    </div>
                    <div className="divide-y divide-stone-100">
                      {rows.map((row) => (
                        <div
                          key={row.label}
                          className="grid grid-cols-[3.75rem_minmax(0,1fr)_minmax(0,1fr)] gap-0 px-2 py-2.5"
                        >
                          <span className="pr-1 text-[10px] font-medium leading-snug text-stone-500">
                            {row.label.replace(' Profile', '').replace(' Level', '')}
                          </span>
                          <span className="break-words px-1 text-[11px] leading-snug text-stone-800">
                            {row.valA}
                          </span>
                          <span className="break-words px-1 text-[11px] leading-snug text-stone-800">
                            {row.valB}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="shrink-0 border-t border-stone-200/80 bg-white/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
              <button
                type="button"
                onClick={onClose}
                className="w-full min-h-11 cursor-pointer rounded-full bg-stone-950 px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-stone-50 active:scale-[0.98]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    </AnimatePresence>
  );
}
