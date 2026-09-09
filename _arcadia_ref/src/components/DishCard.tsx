import React from 'react';
import { motion } from 'motion/react';
import { Dish } from '../types';
import { Flame, Plus, Check, Scale, AlertCircle } from 'lucide-react';
import { formatPrice } from '../utils/formatters';

interface DishCardProps {
  dish: Dish;
  isShortlisted: boolean;
  isCompared: boolean;
  onOpenDetail: (dish: Dish) => void;
  onToggleShortlist: (dish: Dish, e: React.MouseEvent) => void;
  onToggleCompare: (dish: Dish, e: React.MouseEvent) => void;
}

export const DishCard: React.FC<DishCardProps> = ({
  dish,
  isShortlisted,
  isCompared,
  onOpenDetail,
  onToggleShortlist,
  onToggleCompare,
}) => {
  const isVeg = dish.dietaryTags.includes('Vegetarian') || dish.dietaryTags.includes('Vegan');

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-20px' }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3, scale: 1.012 }}
      whileTap={{ scale: 0.988 }}
      id={`dish-card-${dish.id}`}
      onClick={() => onOpenDetail(dish)}
      className={`group relative flex flex-col justify-between h-full rounded-2xl sm:rounded-[22px] border bg-white p-3.5 sm:p-4.5 transition-all duration-300 cursor-pointer ${
        !dish.availability
          ? 'border-stone-200/60 bg-stone-50/75 opacity-85'
          : 'border-stone-200/80 shadow-[0_4px_20px_-2px_rgba(28,25,23,0.04)] hover:border-[#9A7B4F]/40 hover:shadow-[0_14px_34px_-6px_rgba(28,25,23,0.09)]'
      }`}
    >
      <div>
        {/* Card Image Container with mathematical inner border-radius */}
        <div className="relative aspect-[16/10.5] w-full overflow-hidden rounded-xl sm:rounded-[16px] bg-stone-100 mb-3.5">
          <img
            src={dish.image}
            alt={dish.name}
            loading="lazy"
            referrerPolicy="no-referrer"
            className={`h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 ${
              !dish.availability ? 'grayscale-[35%]' : ''
            }`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/40 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

          {/* Editorial Badges */}
          <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5 items-center z-10">
            {dish.isSignature && (
              <span className="px-2.5 py-0.5 text-[10px] uppercase font-semibold tracking-wider bg-stone-950/90 text-[#E0CDA9] backdrop-blur-md rounded-full shadow-xs">
                Signature
              </span>
            )}
            {dish.isChefRecommended && !dish.isSignature && (
              <span className="px-2.5 py-0.5 text-[10px] uppercase font-semibold tracking-wider bg-[#9A7B4F]/95 text-white backdrop-blur-md rounded-full shadow-xs">
                Chef's Pick
              </span>
            )}
            {dish.isPopular && !dish.isSignature && !dish.isChefRecommended && (
              <span className="px-2.5 py-0.5 text-[10px] uppercase font-semibold tracking-wider bg-white/95 text-stone-900 backdrop-blur-md rounded-full shadow-xs">
                Popular
              </span>
            )}
          </div>

          {/* Unavailable Banner Overlay */}
          {!dish.availability && (
            <div className="absolute inset-0 bg-stone-950/70 backdrop-blur-[2px] flex flex-col items-center justify-center p-3 text-center text-white">
              <AlertCircle className="w-5 h-5 text-amber-300 mb-1" />
              <span className="text-xs font-serif tracking-widest uppercase font-medium">Resting for tonight</span>
              <span className="text-[10px] text-stone-300 mt-0.5">Tap to explore chef alternatives</span>
            </div>
          )}

          {/* Action Buttons: Compare & Shortlist with soft tactile styling */}
          <div className="absolute top-2.5 right-2.5 flex items-center space-x-1.5 z-10">
            {/* Compare Button */}
            <button
              id={`card-compare-btn-${dish.id}`}
              onClick={(e) => onToggleCompare(dish, e)}
              className={`p-2 rounded-full backdrop-blur-md transition-all cursor-pointer shadow-xs ${
                isCompared
                  ? 'bg-[#9A7B4F] text-white'
                  : 'bg-white/90 text-stone-700 hover:bg-white hover:text-stone-950'
              }`}
              title={isCompared ? 'Comparing this dish' : 'Add to side-by-side comparison'}
            >
              <Scale className="w-3.5 h-3.5" />
            </button>

            {/* Shortlist / Table Picks Button */}
            <button
              id={`card-shortlist-btn-${dish.id}`}
              onClick={(e) => onToggleShortlist(dish, e)}
              className={`p-2 rounded-full backdrop-blur-md transition-all cursor-pointer shadow-xs ${
                isShortlisted
                  ? 'bg-stone-950 text-[#E0CDA9]'
                  : 'bg-white/90 text-stone-700 hover:bg-white hover:text-stone-950'
              }`}
              title={isShortlisted ? 'Saved to table picks' : 'Save to table picks'}
            >
              {isShortlisted ? <Check className="w-3.5 h-3.5 text-[#E0CDA9]" /> : <Plus className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Dietary symbol + Name + Price header */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-start space-x-2 min-w-0">
            {/* Standard Indian Veg / Non-Veg food indicator dot */}
            <span
              className={`mt-1 flex-shrink-0 w-3.5 h-3.5 border flex items-center justify-center rounded-[3px] ${
                isVeg ? 'border-emerald-600 bg-emerald-50/50' : 'border-rose-700 bg-rose-50/50'
              }`}
              title={isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isVeg ? 'bg-emerald-600' : 'bg-rose-700'
                }`}
              />
            </span>
            <div className="min-w-0">
              <h3 className="text-lg sm:text-[19px] font-serif font-medium text-stone-900 group-hover:text-[#9A7B4F] transition-colors leading-snug truncate">
                {dish.name}
              </h3>
              {dish.nativeName && (
                <span className="text-[11px] text-stone-400 font-serif italic block -mt-0.5">
                  {dish.nativeName}
                </span>
              )}
            </div>
          </div>

          <span className="text-base sm:text-lg font-serif font-semibold text-stone-900 whitespace-nowrap pl-1">
            {formatPrice(dish.price)}
          </span>
        </div>

        {/* Sensory Taste Notes (Highlight characteristics) */}
        <div className="flex items-center space-x-1.5 my-1.5 text-[11px] font-medium tracking-wide text-[#866940]">
          <span>{dish.tasteProfile.join(' · ')}</span>
        </div>

        {/* Refined One-line Description */}
        <p className="text-xs sm:text-[13px] text-stone-600 font-normal leading-relaxed line-clamp-2 mb-3">
          {dish.description}
        </p>
      </div>

      {/* Card Footer: Spice level, portion, and dietary badges */}
      <div className="pt-3 border-t border-stone-100/90 flex items-center justify-between text-[11px] text-stone-500 font-normal">
        <div className="flex items-center space-x-2">
          {/* Spice indicator */}
          {dish.spiceLevel > 0 ? (
            <span className="inline-flex items-center space-x-1 text-stone-700 font-medium">
              <Flame className={`w-3.5 h-3.5 ${dish.spiceLevel >= 2 ? 'text-amber-600' : 'text-amber-500'}`} />
              <span>{dish.spiceLabel}</span>
            </span>
          ) : (
            <span className="text-stone-400">Delicate / Zero spice</span>
          )}

          <span className="text-stone-300">·</span>

          {/* Portion guidance */}
          <span>{dish.portion}</span>
        </div>

        {/* Additional dietary pills */}
        <div className="flex items-center space-x-1">
          {dish.dietaryTags.includes('Vegan') && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/60 font-medium">
              Vegan
            </span>
          )}
          {dish.dietaryTags.includes('Gluten-Free') && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/60 font-medium">
              GF
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

