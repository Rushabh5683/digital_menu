import React from 'react';
import { BookOpen, Search, Sparkles, Scale, UtensilsCrossed, HelpCircle } from 'lucide-react';

interface BottomNavBarProps {
  shortlistCount: number;
  hasComparison: boolean;
  onOpenMenu: () => void;
  onOpenConcierge: () => void;
  onOpenHelpMeChoose: () => void;
  onOpenComparison: () => void;
  onOpenShortlist: () => void;
  onFocusSearch?: () => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  shortlistCount,
  hasComparison,
  onOpenMenu,
  onOpenConcierge,
  onOpenHelpMeChoose,
  onOpenComparison,
  onOpenShortlist,
  onFocusSearch,
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 sm:hidden luxury-blur border-t border-stone-200/80 px-3 py-2 flex items-center justify-around shadow-[0_-4px_24px_rgba(28,25,23,0.06)] bg-[#FAF8F5]/95 backdrop-blur-md">
      {/* Menu / Explore */}
      <button
        id="mobile-nav-menu"
        onClick={onOpenMenu}
        className="flex flex-col items-center justify-center py-1 px-3 text-stone-700 hover:text-stone-950 active:scale-95 transition-all cursor-pointer"
      >
        <BookOpen className="w-4 h-4 text-stone-700 mb-0.5" />
        <span className="text-[10px] font-medium tracking-tight">Menu</span>
      </button>

      {/* Search Shortcut */}
      <button
        id="mobile-nav-search"
        onClick={() => {
          if (onFocusSearch) {
            onFocusSearch();
          } else {
            const el = document.getElementById('main-search-input');
            if (el) {
              el.focus();
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }
        }}
        className="flex flex-col items-center justify-center py-1 px-3 text-stone-700 hover:text-stone-950 active:scale-95 transition-all cursor-pointer"
      >
        <Search className="w-4 h-4 text-stone-700 mb-0.5" />
        <span className="text-[10px] font-medium tracking-tight">Search</span>
      </button>

      {/* Choose / Concierge */}
      <button
        id="mobile-nav-help"
        onClick={onOpenHelpMeChoose}
        className="flex flex-col items-center justify-center py-1 px-3 text-[#9A7B4F] active:scale-95 transition-all cursor-pointer"
      >
        <HelpCircle className="w-4 h-4 text-[#9A7B4F] mb-0.5" />
        <span className="text-[10px] font-semibold tracking-tight text-[#9A7B4F]">Choose</span>
      </button>

      {/* Compare (if active comparison) */}
      {hasComparison && (
        <button
          id="mobile-nav-compare"
          onClick={onOpenComparison}
          className="flex flex-col items-center justify-center py-1 px-3 text-[#9A7B4F] font-semibold active:scale-95 transition-all cursor-pointer animate-pulse"
        >
          <Scale className="w-4 h-4 mb-0.5" />
          <span className="text-[10px] font-medium tracking-tight">Compare</span>
        </button>
      )}

      {/* Shortlist / Table Picks */}
      <button
        id="mobile-nav-picks"
        onClick={onOpenShortlist}
        className="relative flex flex-col items-center justify-center py-1 px-3 text-stone-900 active:scale-95 transition-all cursor-pointer"
      >
        <UtensilsCrossed className="w-4 h-4 mb-0.5 text-stone-800" />
        <span className="text-[10px] font-semibold tracking-tight">Picks</span>
        {shortlistCount > 0 && (
          <span className="absolute top-0 right-1.5 inline-flex items-center justify-center w-4 h-4 text-[9px] font-bold text-stone-950 bg-[#E0CDA9] rounded-full shadow-2xs">
            {shortlistCount}
          </span>
        )}
      </button>
    </div>
  );
};

