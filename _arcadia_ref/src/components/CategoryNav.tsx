import React, { useEffect } from 'react';
import { Category } from '../types';

interface CategoryNavProps {
  categories: Category[];
  activeCategoryId: string;
  onSelectCategory: (id: string) => void;
}

export const CategoryNav: React.FC<CategoryNavProps> = ({
  categories,
  activeCategoryId,
  onSelectCategory,
}) => {
  const handleScrollTo = (id: string) => {
    onSelectCategory(id);

    if (id === 'all') {
      const firstSection = document.getElementById('menu-content-top');
      if (firstSection) {
        const topOffset = firstSection.getBoundingClientRect().top + window.pageYOffset - 130;
        window.scrollTo({ top: Math.max(0, topOffset), behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    const targetEl = document.getElementById(`section-${id}`);
    if (targetEl) {
      const topOffset = targetEl.getBoundingClientRect().top + window.pageYOffset - 130;
      window.scrollTo({ top: Math.max(0, topOffset), behavior: 'smooth' });
    }
  };

  return (
    <nav className="sticky top-16 sm:top-18 z-20 luxury-blur border-b border-stone-200/70 bg-[#FAF8F5]/90 backdrop-blur-md transition-all">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto no-scrollbar py-3">
          <button
            id="cat-btn-all"
            onClick={() => handleScrollTo('all')}
            className={`flex-shrink-0 px-3.5 py-1.5 text-xs sm:text-[13px] tracking-widest uppercase font-medium transition-all relative rounded-sm cursor-pointer whitespace-nowrap ${
              activeCategoryId === 'all'
                ? 'text-stone-950 font-semibold'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            All Courses
            {activeCategoryId === 'all' && (
              <span className="absolute bottom-[-12px] left-0 right-0 h-[2px] bg-[#9A7B4F]" />
            )}
          </button>

          {categories.map((cat) => {
            const isSelected = activeCategoryId === cat.id;

            return (
              <button
                key={cat.id}
                id={`cat-btn-${cat.id}`}
                onClick={() => handleScrollTo(cat.id)}
                className={`flex-shrink-0 px-3.5 py-1.5 text-xs sm:text-[13px] tracking-widest uppercase font-medium transition-all relative rounded-sm cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'text-stone-950 font-semibold'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                <span>{cat.name}</span>
                {isSelected && (
                  <span className="absolute bottom-[-12px] left-0 right-0 h-[2px] bg-[#9A7B4F]" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
