import React from 'react';
import { Search, X, SlidersHorizontal, Sparkles } from 'lucide-react';

interface SearchBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  onOpenFilterSheet: () => void;
  activeFilterCount: number;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  query,
  onQueryChange,
  onOpenFilterSheet,
  activeFilterCount,
}) => {
  const suggestedQueries = [
    'something light',
    'vegetarian starter',
    'something spicy',
    'similar to butter chicken',
    'good for sharing',
    'high protein',
    'what is mild?',
    'creamy and comforting',
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-4">
      {/* Search Input Box with rounded-2xl luxury finish */}
      <div className="relative flex items-center bg-white rounded-2xl border border-stone-200/90 shadow-[0_2px_12px_-2px_rgba(28,25,23,0.04)] focus-within:border-[#9A7B4F] focus-within:ring-2 focus-within:ring-[#9A7B4F]/20 transition-all">
        <div className="pl-4 pr-2 text-stone-400">
          <Search className="w-4 h-4 text-stone-400" />
        </div>

        <input
          id="main-search-input"
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search dishes, ingredients or what you're craving..."
          className="w-full py-3 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 placeholder:italic bg-transparent outline-none font-normal"
        />

        {query && (
          <button
            onClick={() => onQueryChange('')}
            className="p-1.5 mr-1 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Filter Toggle Button */}
        <button
          id="search-filter-sheet-btn"
          onClick={onOpenFilterSheet}
          className={`flex items-center space-x-1.5 px-3.5 py-2 mr-1.5 text-xs font-medium rounded-xl border transition-all cursor-pointer ${
            activeFilterCount > 0
              ? 'bg-stone-900 text-stone-50 border-stone-900 shadow-2xs'
              : 'bg-stone-50 text-stone-700 border-stone-200/90 hover:bg-stone-100'
          }`}
          title="Dietary and Spice Filters"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#9A7B4F]" />
          <span className="hidden sm:inline">Filters</span>
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-stone-900 bg-[#E0CDA9] rounded-full">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Suggested Natural Language Intent Pills */}
      {!query && (
        <div className="mt-2.5 flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-1">
          <span className="text-[11px] text-stone-400 flex items-center space-x-1 flex-shrink-0 mr-1">
            <Sparkles className="w-3 h-3 text-[#9A7B4F]" />
            <span>Try:</span>
          </span>
          {suggestedQueries.map((sug, idx) => (
            <button
              key={idx}
              onClick={() => onQueryChange(sug)}
              className="flex-shrink-0 px-3 py-1 text-[11px] rounded-full bg-stone-100/90 hover:bg-[#FAF6F0] hover:border-[#9A7B4F]/40 border border-transparent text-stone-600 hover:text-stone-900 transition-colors whitespace-nowrap cursor-pointer"
            >
              "{sug}"
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

