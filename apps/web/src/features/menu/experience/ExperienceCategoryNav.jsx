import React from 'react';

export function ExperienceCategoryNav({
  categories = [],
  activeCategoryId,
  onSelectCategory,
}) {
  const handleScrollTo = (id) => {
    onSelectCategory?.(id);

    if (id === 'all') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const targetEl = document.getElementById(`section-${id}`);
    if (targetEl) {
      const topOffset = targetEl.getBoundingClientRect().top + window.pageYOffset - 118;
      window.scrollTo({ top: Math.max(0, topOffset), behavior: 'smooth' });
    }
  };

  return (
    <nav
      id="experience-category-nav"
      className="sticky top-14 z-20 border-b border-stone-200/70 bg-[#FAF8F5]/95 backdrop-blur-md luxury-blur sm:top-16"
    >
      <div className="px-2 sm:px-4">
        <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar py-2.5">
          <button
            id="cat-btn-all"
            type="button"
            onClick={() => handleScrollTo('all')}
            className={`relative shrink-0 whitespace-nowrap rounded-sm px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.12em] transition-all sm:text-xs sm:tracking-widest ${
              activeCategoryId === 'all'
                ? 'font-semibold text-stone-950'
                : 'text-stone-500'
            }`}
          >
            All
            {activeCategoryId === 'all' ? (
              <span className="absolute bottom-[-10px] left-2 right-2 h-[2px] bg-[#9A7B4F]" />
            ) : null}
          </button>

          {categories.map((cat) => {
            const isSelected = activeCategoryId === cat.id;
            return (
              <button
                key={cat.id}
                id={`cat-btn-${cat.id}`}
                type="button"
                onClick={() => handleScrollTo(cat.id)}
                className={`relative shrink-0 whitespace-nowrap rounded-sm px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.1em] transition-all sm:text-xs sm:tracking-widest ${
                  isSelected ? 'font-semibold text-stone-950' : 'text-stone-500'
                }`}
              >
                <span>{cat.name}</span>
                {isSelected ? (
                  <span className="absolute bottom-[-10px] left-2 right-2 h-[2px] bg-[#9A7B4F]" />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
