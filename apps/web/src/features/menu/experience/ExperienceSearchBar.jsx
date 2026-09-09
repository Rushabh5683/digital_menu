import React from 'react';
import { Search, X, SlidersHorizontal } from 'lucide-react';

export function ExperienceSearchBar({
  query,
  onQueryChange,
  onOpenFilterSheet,
  activeFilterCount = 0,
}) {
  return (
    <div className="w-full px-4 py-3">
      <div className="relative flex items-center rounded-2xl border border-stone-200/90 bg-white shadow-[0_2px_12px_-2px_rgba(28,25,23,0.04)] focus-within:border-[#9A7B4F] focus-within:ring-2 focus-within:ring-[#9A7B4F]/20">
        <div className="pl-3 pr-1.5 text-stone-400 sm:pl-4 sm:pr-2">
          <Search className="h-4 w-4" />
        </div>

        <input
          id="main-search-input"
          type="search"
          enterKeyHint="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search dishes or cravings…"
          className="min-w-0 flex-1 bg-transparent py-3 text-sm text-stone-900 outline-none placeholder:italic placeholder:text-stone-400"
        />

        {query ? (
          <button
            type="button"
            onClick={() => onQueryChange('')}
            className="p-1.5 text-stone-400"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}

        <button
          id="search-filter-sheet-btn"
          type="button"
          onClick={onOpenFilterSheet}
          className={`mr-1.5 flex shrink-0 items-center gap-1 rounded-xl border px-2.5 py-2 text-xs font-medium sm:px-3.5 ${
            activeFilterCount > 0
              ? 'border-stone-900 bg-stone-900 text-stone-50'
              : 'border-stone-200/90 bg-stone-50 text-stone-700'
          }`}
          title="Dietary and Spice Filters"
        >
          <SlidersHorizontal className="h-3.5 w-3.5 text-[#9A7B4F]" />
          <span className="text-[11px]">Filter</span>
          {activeFilterCount > 0 ? (
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#E0CDA9] text-[10px] font-bold text-stone-900">
              {activeFilterCount}
            </span>
          ) : null}
        </button>
      </div>
    </div>
  );
}
