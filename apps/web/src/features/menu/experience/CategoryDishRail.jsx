import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ExperienceDishCard } from './ExperienceDishCard.jsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCategoryAttention } from '../../analytics/useCategoryAttention.js';
import { categoryShowsSteam } from './DishSteam.jsx';

export function CategoryDishRail({
  category,
  dishes = [],
  shortlistIds,
  comparisonPair,
  onOpenDetail,
  onToggleShortlist,
  onToggleCompare,
  onAddToOrder,
  currency = 'INR',
}) {
  const sectionAttentionRef = useCategoryAttention(category?.id);
  const scrollContainerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const steamForCategory = categoryShowsSteam(category?.name);

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

  const handleScroll = (direction) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const amount = el.clientWidth;
    el.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  };

  if (!category || dishes.length === 0) return null;

  const comparedIds = new Set(
    (comparisonPair || [])
      .map((item) => (typeof item === 'string' ? item : item?.id))
      .filter(Boolean),
  );

  return (
    <motion.section
      ref={sectionAttentionRef}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      id={`section-${category.id}`}
      data-category-id={category.id}
      className="scroll-mt-28 space-y-3 sm:scroll-mt-32 sm:space-y-4"
    >
      <div className="flex items-end justify-between gap-3 border-b border-stone-200/80 px-4 pb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center space-x-2">
            <h2 className="truncate font-serif text-xl font-normal tracking-tight text-stone-900 sm:text-2xl">
              {category.name}
            </h2>
          </div>
          {category.shortDescription || category.description ? (
            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-stone-500 sm:text-[13px]">
              {category.shortDescription || category.description}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center space-x-3">
          <span className="whitespace-nowrap text-[10px] font-medium uppercase tracking-wider text-stone-400 sm:text-[11px]">
            {dishes.length} {dishes.length === 1 ? 'selection' : 'selections'}
          </span>

          <div className="hidden sm:flex items-center space-x-1.5 pl-3 border-l border-stone-200">
            <button
              type="button"
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
              type="button"
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

      <div className="relative">
        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth pb-4 pt-1 no-scrollbar"
        >
          {dishes.map((dish) => (
            <div
              key={dish.id}
              className="box-border w-full shrink-0 snap-start px-4 sm:px-5"
              style={{ flex: '0 0 100%' }}
            >
              <ExperienceDishCard
                dish={dish}
                isShortlisted={shortlistIds?.has(dish.id)}
                isCompared={comparedIds.has(dish.id)}
                onOpenDetail={onOpenDetail}
                onToggleShortlist={onToggleShortlist}
                onToggleCompare={onToggleCompare}
                onAddToOrder={onAddToOrder}
                currency={currency}
                showSteam={steamForCategory && dish.availability !== false}
              />
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
