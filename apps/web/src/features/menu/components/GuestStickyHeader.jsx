import { useEffect, useRef, useState } from 'react';
import { Info, Search, SlidersHorizontal, X } from 'lucide-react';
import { resolveMediaUrl } from '../../../shared/lib/mediaUrl.js';

export function GuestStickyHeader({
  restaurant,
  tableLabel,
  searchQuery,
  onSearchChange,
  filterCount = 0,
  onOpenFilters,
  onOpenInfo,
  searchInputRef,
}) {
  const headerRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);
  const logoSrc = resolveMediaUrl(restaurant.logo || '');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const node = headerRef.current;
    if (!node) return undefined;

    const apply = () => {
      const height = Math.ceil(node.getBoundingClientRect().height);
      document.documentElement.style.setProperty('--g-header-h', `${height}px`);
    };

    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <header
      ref={headerRef}
      className={['guest-sticky-header', scrolled ? 'is-scrolled' : ''].join(' ')}
    >
      <div className="mx-auto max-w-lg px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[var(--g-ink)] shadow-[var(--g-shadow)]">
            {logoSrc ? (
              <img
                src={logoSrc}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-sm font-bold text-[var(--g-accent)]">
                {(restaurant.name || 'R').slice(0, 1)}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[1.05rem] font-bold tracking-tight text-[var(--g-ink)]">
              {restaurant.name}
            </h1>
            <p className="mt-0.5 truncate text-xs font-medium text-[var(--g-muted)]">
              {tableLabel ? `${tableLabel} · Dine-in` : 'Dine-in menu'}
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenInfo}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[var(--g-ink)] shadow-[var(--g-shadow)] transition active:scale-95"
            aria-label="Restaurant info"
          >
            <Info size={18} strokeWidth={2.1} />
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2">
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
              placeholder="Search dishes, cuisines…"
              className="h-12 w-full rounded-2xl border-0 bg-white py-3 pl-10 pr-10 text-sm font-medium text-[var(--g-ink)] shadow-[var(--g-shadow)] outline-none placeholder:text-[var(--g-muted)] focus:ring-2 focus:ring-[var(--g-teal)]/20"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[var(--g-muted)] hover:bg-black/[0.04]"
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
              'relative inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-[var(--g-shadow)] transition active:scale-95',
              filterCount > 0
                ? 'bg-[var(--g-ink)] text-[var(--g-accent)]'
                : 'bg-white text-[var(--g-ink)]',
            ].join(' ')}
            aria-label="Filters"
          >
            <SlidersHorizontal size={18} />
            {filterCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--g-accent)] px-1 text-[10px] font-bold text-[var(--g-ink)]">
                {filterCount}
              </span>
            ) : null}
          </button>
        </div>
      </div>
    </header>
  );
}
