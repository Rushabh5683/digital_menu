import { useEffect, useRef } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';

/**
 * Sticky chrome: search + filters + category pills.
 */
export function GuestStickyChrome({
  searchQuery,
  onSearchChange,
  onSearchCommit,
  filterCount = 0,
  dietaryFilters = [],
  onToggleFilter,
  onClearFilters,
  onOpenFilters,
  searchInputRef,
  categories,
  activeCategoryId,
  resultCount = null,
  onSelectCategory,
  categoriesHidden = false,
}) {
  const chromeRef = useRef(null);
  const scrollerRef = useRef(null);
  const itemRefs = useRef({});

  useEffect(() => {
    const node = chromeRef.current;
    if (!node) return undefined;
    const apply = () => {
      const height = Math.ceil(node.getBoundingClientRect().height);
      document.documentElement.style.setProperty('--g-header-h', `${height}px`);
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(node);
    return () => observer.disconnect();
  }, [categoriesHidden, categories?.length, dietaryFilters.length]);

  useEffect(() => {
    if (!activeCategoryId) return;
    const node = itemRefs.current[activeCategoryId];
    const scroller = scrollerRef.current;
    if (!node || !scroller) return;
    const left = node.offsetLeft - scroller.clientWidth / 2 + node.clientWidth / 2;
    scroller.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
  }, [activeCategoryId]);

  const showActiveFilters = dietaryFilters.length > 0;

  return (
    <div ref={chromeRef} className="guest-sticky-chrome sticky top-0 z-40">
      <div className="guest-sheet-cap w-full rounded-t-[1.75rem] border-t border-[var(--g-line-strong)] bg-[var(--g-bg-surface)]/95 px-4 pb-3 pt-4 shadow-[0_-8px_28px_rgba(60,40,15,0.08)] backdrop-blur-xl">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--g-line-strong)]" />

        <div className="flex items-center gap-2">
          <label className="relative block min-w-0 flex-1">
            <span className="sr-only">Search dishes</span>
            <Search
              size={17}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--g-muted)]"
            />
            <input
              ref={searchInputRef}
              type="text"
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              onBlur={() => onSearchCommit?.()}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  onSearchCommit?.();
                  event.currentTarget.blur();
                }
              }}
              placeholder="Search dishes, cuisines…"
              className="h-12 w-full rounded-2xl border border-[var(--g-line)] bg-[var(--g-bg-elevated)] py-3 pl-10 pr-10 text-sm font-medium text-[var(--g-ink)] outline-none placeholder:text-[var(--g-muted)] focus:border-[var(--g-accent-deep)]/40 focus:ring-2 focus:ring-[var(--g-accent)]/15"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[var(--g-muted)] transition active:scale-90"
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            ) : null}
          </label>

          <button
            type="button"
            onClick={onOpenFilters}
            className={[
              'relative inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border backdrop-blur-md transition-all active:scale-95',
              filterCount > 0
                ? 'border-[var(--g-accent-deep)]/45 bg-[var(--g-accent-soft)] text-[var(--g-accent-bright)]'
                : 'border-[var(--g-line)] bg-[var(--g-bg-elevated)] text-[var(--g-muted)]',
            ].join(' ')}
            aria-label="Filters"
          >
            <SlidersHorizontal size={18} />
            {filterCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#D4AF37] px-1 text-[10px] font-bold text-black">
                {filterCount}
              </span>
            ) : null}
          </button>
        </div>

        {showActiveFilters ? (
          <div className="mt-2 flex w-full items-center gap-2">
            <div className="flex min-w-0 flex-1 snap-x snap-mandatory gap-2 overflow-x-auto pb-0.5 no-scrollbar">
              {dietaryFilters.map((filterId) => (
                <button
                  key={filterId}
                  type="button"
                  onClick={() => onToggleFilter?.(filterId)}
                  className="guest-pill-sm inline-flex shrink-0 snap-start items-center gap-1 border border-[var(--g-accent-deep)]/30 bg-[var(--g-accent-soft)] text-[var(--g-accent-bright)]"
                >
                  {filterId.replace(/-/g, ' ')}
                  <X size={10} />
                </button>
              ))}
            </div>
            {resultCount != null ? (
              <span className="shrink-0 text-[10px] text-[var(--g-muted)]">
                {resultCount} {resultCount === 1 ? 'dish' : 'dishes'}
              </span>
            ) : null}
            <button
              type="button"
              onClick={onClearFilters}
              className="shrink-0 text-[10px] font-medium text-[var(--g-accent-bright)]"
            >
              Clear
            </button>
          </div>
        ) : null}

        {!categoriesHidden && categories?.length > 0 ? (
          <nav id="menu-category-nav" className="mt-3" aria-label="Menu categories">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--g-accent-deep)]">
              Select Your Category
            </p>
            <div
              ref={scrollerRef}
              className="flex w-full snap-x snap-mandatory gap-2 overflow-x-auto overflow-y-visible py-1 no-scrollbar"
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
                    onClick={() => onSelectCategory?.(category.id)}
                    className={[
                      'guest-pill-nav shrink-0 snap-start',
                      isActive
                        ? 'border border-[var(--g-accent-deep)]/50 bg-[var(--g-accent-soft)] font-medium text-[var(--g-accent-deep)]'
                        : 'border border-[var(--g-line)] bg-[var(--g-bg-elevated)] text-[var(--g-ink-soft)] hover:text-[var(--g-ink)]',
                    ].join(' ')}
                  >
                    {category.name}
                  </button>
                );
              })}
            </div>
          </nav>
        ) : (
          <div className="h-2" />
        )}
      </div>
    </div>
  );
}
