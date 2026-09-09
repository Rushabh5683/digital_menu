import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Category, Dish } from '../types';
import { DishCard } from './DishCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CategoryDishRailProps {
  category: Category;
  dishes: Dish[];
  shortlistIds: Set<string>;
  comparisonPair: [string, string] | null;
  onOpenDetail: (dish: Dish) => void;
  onToggleShortlist: (dish: Dish, e: React.MouseEvent) => void;
  onToggleCompare: (dish: Dish, e: React.MouseEvent) => void;
}

export const CategoryDishRail: React.FC<CategoryDishRailProps> = ({
  category,
  dishes,
  shortlistIds,
  comparisonPair,
  onOpenDetail,
  onToggleShortlist,
  onToggleCompare,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 15);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 15);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [dishes]);

  const handleScroll = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const scrollAmount = Math.min(el.clientWidth * 0.8, 360);
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  if (dishes.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      id={`section-${category.id}`}
      className="scroll-mt-36 sm:scroll-mt-40 space-y-3.5 sm:space-y-4"
    >
      {/* Category Header */}
      <div className="flex items-end justify-between border-b border-stone-200/80 pb-3 px-4 sm:px-6">
        <div className="max-w-2xl">
          <div className="flex items-center space-x-2">
            <h2 className="text-2xl sm:text-3xl font-serif font-normal text-stone-900 tracking-tight">
              {category.name}
            </h2>
          </div>
          <p className="text-xs sm:text-[13px] text-stone-500 font-normal mt-0.5 leading-relaxed">
            {category.shortDescription}
          </p>
        </div>

        {/* Controls: Dish Count & Desktop Arrow Scrollers */}
        <div className="flex items-center space-x-3">
          <span className="text-[11px] sm:text-xs text-stone-400 font-medium tracking-wider uppercase whitespace-nowrap">
            {dishes.length} {dishes.length === 1 ? 'selection' : 'selections'}
          </span>

          {/* Desktop Left/Right Navigation buttons */}
          <div className="hidden sm:flex items-center space-x-1.5 pl-3 border-l border-stone-200">
            <button
              onClick={() => handleScroll('left')}
              disabled={!canScrollLeft}
              className={`p-2 rounded-full border transition-all cursor-pointer ${
                canScrollLeft
                  ? 'border-stone-300 text-stone-700 hover:bg-stone-100 hover:text-stone-900 shadow-2xs'
                  : 'border-stone-100 text-stone-300 cursor-not-allowed opacity-40'
              }`}
              title="Scroll dishes left"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleScroll('right')}
              disabled={!canScrollRight}
              className={`p-2 rounded-full border transition-all cursor-pointer ${
                canScrollRight
                  ? 'border-stone-300 text-stone-700 hover:bg-stone-100 hover:text-stone-900 shadow-2xs'
                  : 'border-stone-100 text-stone-300 cursor-not-allowed opacity-40'
              }`}
              title="Scroll dishes right"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Dish Rail with Snap and Peek */}
      <div className="relative group">
        {/* Left Fade Hint */}
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-4 w-8 sm:w-12 bg-gradient-to-r from-[#FAF8F5] via-[#FAF8F5]/80 to-transparent pointer-events-none z-10" />
        )}

        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          className="flex gap-3.5 sm:gap-5 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory pb-4 pt-1 px-4 sm:px-6"
        >
          {dishes.map((dish) => (
            <div
              key={dish.id}
              className="w-[80vw] max-w-[335px] sm:w-[315px] md:w-[330px] flex-shrink-0 snap-start flex flex-col"
            >
              <DishCard
                dish={dish}
                isShortlisted={shortlistIds.has(dish.id)}
                isCompared={comparisonPair ? comparisonPair.some((id) => id === dish.id) : false}
                onOpenDetail={onOpenDetail}
                onToggleShortlist={onToggleShortlist}
                onToggleCompare={onToggleCompare}
              />
            </div>
          ))}
        </div>

        {/* Right Fade Hint on rail */}
        {canScrollRight && (
          <div
            onClick={() => handleScroll('right')}
            className="absolute right-0 top-0 bottom-4 w-10 sm:w-16 bg-gradient-to-l from-[#FAF8F5] via-[#FAF8F5]/85 to-transparent pointer-events-none z-10 flex items-center justify-end pr-2 transition-opacity"
          >
            <div className="p-1 rounded-full bg-stone-900/10 text-stone-600 hidden sm:block">
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        )}
      </div>
    </motion.section>
  );
};

