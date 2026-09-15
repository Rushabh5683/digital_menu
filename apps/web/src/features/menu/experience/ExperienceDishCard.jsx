import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Check, Scale, AlertCircle } from 'lucide-react';
import { formatPrice, dishImage } from './lib/formatters.js';
import { useDishAttention } from '../../analytics/useDishAttention.js';
import { getDietMarker } from '../../../shared/constants/dietaryTags.js';
import { DishSteam, categoryShowsSteam } from './DishSteam.jsx';
import { ExperienceQuantityControl } from './ExperienceQuantityControl.jsx';

export function ExperienceDishCard({
  dish,
  isShortlisted,
  isCompared,
  quantity = 0,
  onOpenDetail,
  onToggleShortlist,
  onToggleCompare,
  onAddToOrder,
  onIncrement,
  onDecrement,
  currency = 'INR',
  analyticsSource = 'category_rail',
  showSteam,
}) {
  const attentionRef = useDishAttention(dish?.id, {
    categoryId: dish?.categoryId || dish?.category || null,
    source: analyticsSource,
  });

  if (!dish) return null;

  const dietMarker = getDietMarker(dish.dietaryTags);
  const src = dishImage(dish);
  const steamVisible =
    showSteam ??
    (categoryShowsSteam(dish.categoryName) && dish.availability !== false);

  return (
    <motion.div
      ref={attentionRef}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-20px' }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      whileTap={{ scale: 0.99 }}
      id={`dish-card-${dish.id}`}
      data-dish-id={dish.id}
      onClick={() => onOpenDetail?.(dish)}
      className={`group relative flex h-full cursor-pointer flex-col justify-between rounded-2xl border bg-white p-3.5 transition-[border-color,box-shadow] duration-300 sm:rounded-[22px] sm:p-4.5 ${
        !dish.availability
          ? 'border-stone-200/60 bg-stone-50/75 opacity-85'
          : 'border-stone-200/80 shadow-[0_4px_20px_-2px_rgba(28,25,23,0.04)] hover:border-[#9A7B4F]/55 hover:shadow-[0_10px_28px_-8px_rgba(28,25,23,0.12)]'
      }`}
    >
      <div>
        <div className="relative mb-3.5 aspect-[16/10.5] w-full overflow-hidden rounded-xl bg-stone-100 sm:rounded-[16px]">
          {src ? (
            <img
              src={src}
              alt={dish.name}
              loading="lazy"
              referrerPolicy="no-referrer"
              className={`h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 ${
                !dish.availability ? 'grayscale-[35%]' : ''
              }`}
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-[#E8DFD3] via-[#D4C4A8] to-[#C5A880]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/25 via-transparent to-transparent" />

          <DishSteam show={steamVisible} />

          <div className="absolute top-2.5 left-2.5 z-10 flex flex-wrap items-center gap-1.5">
            {dish.isSignature ? (
              <span className="rounded-full bg-stone-950/90 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#E0CDA9] shadow-xs backdrop-blur-md">
                Signature
              </span>
            ) : null}
          </div>

          {!dish.availability && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-950/55 p-3 text-center text-white backdrop-blur-[1px]">
              <AlertCircle className="mb-1.5 h-5 w-5 text-amber-200" />
              <span className="font-serif text-sm font-medium tracking-wide">
                This dish is resting today
              </span>
              <span className="mt-1 text-[10px] text-stone-300">Tap for details &amp; alternatives</span>
            </div>
          )}
        </div>

        <div className="mb-1 flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start space-x-2">
            {dietMarker ? (
              <span
                className={`mt-1 flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-[3px] border ${
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
            <div className="min-w-0">
              <h3 className="truncate font-serif text-lg font-medium leading-snug text-stone-900 transition-colors group-hover:text-[#9A7B4F] sm:text-[19px]">
                {dish.name}
              </h3>
              {dish.nativeName ? (
                <span className="-mt-0.5 block font-serif text-[11px] italic text-stone-400">
                  {dish.nativeName}
                </span>
              ) : null}
            </div>
          </div>

          <span className="whitespace-nowrap pl-1 font-serif text-base font-semibold text-stone-900 sm:text-lg">
            {formatPrice(dish.price, currency)}
          </span>
        </div>

        <p className="mb-3 line-clamp-2 text-xs font-normal leading-relaxed text-stone-600 sm:text-[13px]">
          {dish.description}
        </p>
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-1.5 border-t border-stone-100/90 pt-3">
        <button
          id={`card-compare-btn-${dish.id}`}
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
          id={`card-shortlist-btn-${dish.id}`}
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
            id={`card-add-btn-${dish.id}`}
            quantity={quantity}
            onAdd={() => onAddToOrder(dish)}
            onIncrement={() => onIncrement?.(dish.id)}
            onDecrement={() => onDecrement?.(dish.id)}
          />
        ) : null}
      </div>
    </motion.div>
  );
}
