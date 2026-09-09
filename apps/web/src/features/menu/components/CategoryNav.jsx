import { useEffect, useRef } from 'react';
import { scrollToCategory } from '../hooks/useActiveCategory.js';

export function CategoryNav({ categories, activeCategoryId, hidden = false }) {
  const scrollerRef = useRef(null);
  const itemRefs = useRef({});

  useEffect(() => {
    if (!activeCategoryId) return;
    const node = itemRefs.current[activeCategoryId];
    const scroller = scrollerRef.current;
    if (!node || !scroller) return;
    const left =
      node.offsetLeft - scroller.clientWidth / 2 + node.clientWidth / 2;
    scroller.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
  }, [activeCategoryId]);

  if (hidden || categories.length === 0) return null;

  return (
    <nav
      id="menu-category-nav"
      className="guest-category-sticky border-b border-[var(--g-line)]"
      aria-label="Menu categories"
    >
      <div
        ref={scrollerRef}
        className="mx-auto flex max-w-lg gap-2 overflow-x-auto px-4 py-2.5 no-scrollbar"
      >
        {categories.map((category) => {
          const isActive = category.id === activeCategoryId;
          return (
            <button
              key={category.id}
              type="button"
              ref={(node) => {
                itemRefs.current[category.id] = node;
              }}
              onClick={() => scrollToCategory(category.id)}
              className={[
                'shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition',
                isActive
                  ? 'bg-[var(--g-ink)] text-white shadow-[var(--g-shadow)]'
                  : 'bg-white/80 text-[var(--g-muted)] hover:text-[var(--g-ink)]',
              ].join(' ')}
            >
              {category.name}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
