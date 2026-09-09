import React from 'react';
import { Dish } from '../types';
import { ArrowRight, Sparkles, Plus, Check, Scale } from 'lucide-react';
import { formatPrice } from '../utils/formatters';

interface FeaturedDishSectionProps {
  dishes: Dish[];
  shortlistIds: Set<string>;
  comparisonPair: [string, string] | null;
  onOpenDetail: (dish: Dish) => void;
  onToggleShortlist: (dish: Dish, e: React.MouseEvent) => void;
  onToggleCompare: (dish: Dish, e: React.MouseEvent) => void;
}

export const FeaturedDishSection: React.FC<FeaturedDishSectionProps> = ({
  dishes,
  shortlistIds,
  comparisonPair,
  onOpenDetail,
  onToggleShortlist,
  onToggleCompare,
}) => {
  const signatures = dishes.filter((d) => d.isSignature && d.availability).slice(0, 4);

  if (signatures.length === 0) return null;

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8 border-b border-stone-200/60">
      <div className="flex items-end justify-between mb-5">
        <div>
          <span className="text-[11px] font-medium tracking-[0.2em] text-[#9A7B4F] uppercase block mb-1">
            Arcadia Signatures
          </span>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-serif text-stone-900 font-normal">
            Heritage & Modern Gastronomy
          </h2>
        </div>
        <span className="text-xs text-stone-400 font-medium hidden sm:inline-block">
          Crafted daily over woodfire & embers
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
        {signatures.map((dish) => {
          const isShortlisted = shortlistIds.has(dish.id);
          const isCompared = comparisonPair?.includes(dish.id) ?? false;

          return (
            <div
              key={dish.id}
              id={`featured-card-${dish.id}`}
              onClick={() => onOpenDetail(dish)}
              className="group relative flex flex-col sm:flex-row bg-white rounded-sm border border-stone-200/90 overflow-hidden hover:border-[#9A7B4F]/50 transition-all hover:shadow-[0_12px_32px_-6px_rgba(28,25,23,0.08)] cursor-pointer"
            >
              {/* Image side */}
              <div className="relative w-full sm:w-2/5 aspect-[16/11] sm:aspect-auto overflow-hidden bg-stone-100 flex-shrink-0">
                <img
                  src={dish.image}
                  alt={dish.name}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div className="absolute top-2.5 left-2.5">
                  <span className="px-2 py-0.5 text-[10px] uppercase font-semibold tracking-wider bg-stone-950/85 text-[#E0CDA9] backdrop-blur-md rounded-sm">
                    Signature
                  </span>
                </div>
              </div>

              {/* Content side */}
              <div className="p-4 sm:p-5 flex flex-col justify-between flex-1">
                <div>
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-lg sm:text-xl font-serif font-medium text-stone-900 group-hover:text-[#9A7B4F] transition-colors">
                      {dish.name}
                    </h3>
                    <span className="text-base sm:text-lg font-serif font-semibold text-stone-900 whitespace-nowrap">
                      {formatPrice(dish.price)}
                    </span>
                  </div>

                  {dish.nativeName && (
                    <span className="text-[11px] text-stone-400 font-serif italic block mb-1">
                      {dish.nativeName}
                    </span>
                  )}

                  <div className="text-[11px] font-medium tracking-wide text-[#866940] my-1.5">
                    {dish.tasteProfile.join(' · ')}
                  </div>

                  <p className="text-xs text-stone-600 font-normal leading-relaxed line-clamp-2 sm:line-clamp-3">
                    {dish.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-stone-100 mt-3 flex items-center justify-between">
                  <span className="text-[11px] text-stone-500 font-medium">
                    {dish.preparation}
                  </span>

                  <div className="flex items-center space-x-1.5">
                    <button
                      id={`featured-compare-btn-${dish.id}`}
                      onClick={(e) => onToggleCompare(dish, e)}
                      className={`p-1.5 rounded-sm border transition-all cursor-pointer ${
                        isCompared
                          ? 'bg-[#9A7B4F] text-white border-[#9A7B4F]'
                          : 'bg-white text-stone-600 border-stone-200 hover:text-stone-900'
                      }`}
                      title={isCompared ? 'Comparing' : 'Compare'}
                    >
                      <Scale className="w-3.5 h-3.5" />
                    </button>

                    <button
                      id={`featured-shortlist-btn-${dish.id}`}
                      onClick={(e) => onToggleShortlist(dish, e)}
                      className={`p-1.5 rounded-sm border transition-all cursor-pointer ${
                        isShortlisted
                          ? 'bg-stone-900 text-[#E0CDA9] border-stone-900'
                          : 'bg-white text-stone-600 border-stone-200 hover:text-stone-900'
                      }`}
                      title={isShortlisted ? 'Saved' : 'Save'}
                    >
                      {isShortlisted ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    </button>

                    <div className="text-xs font-medium text-stone-800 flex items-center space-x-0.5 group-hover:translate-x-0.5 transition-transform pl-1">
                      <span>View</span>
                      <ArrowRight className="w-3 h-3 text-[#9A7B4F]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
