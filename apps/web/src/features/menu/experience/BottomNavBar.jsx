import React from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, Search, Scale, UtensilsCrossed, HelpCircle } from 'lucide-react';

/**
 * Mobile bottom nav — fixed to the viewport (ported to body so parent
 * overflow/transform cannot trap it at document bottom).
 */
export function BottomNavBar({
  shortlistCount = 0,
  hasComparison = false,
  onOpenMenu,
  onOpenHelpMeChoose,
  onOpenComparison,
  onOpenShortlist,
  onFocusSearch,
}) {
  const nav = (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-center">
      <nav
        className="pointer-events-auto flex w-full max-w-lg items-stretch justify-around border-t border-stone-200/80 bg-[#FAF8F5]/96 px-1 pt-1.5 shadow-[0_-4px_24px_rgba(28,25,23,0.06)] backdrop-blur-md luxury-blur"
        style={{ paddingBottom: 'max(0.45rem, env(safe-area-inset-bottom))' }}
      >
        <button
          id="mobile-nav-menu"
          type="button"
          onClick={onOpenMenu}
          className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-stone-700 active:scale-95"
        >
          <BookOpen className="h-4 w-4" />
          <span className="text-[10px] font-medium tracking-tight">Menu</span>
        </button>

        <button
          id="mobile-nav-search"
          type="button"
          onClick={() => {
            if (onFocusSearch) onFocusSearch();
            else {
              const el = document.getElementById('main-search-input');
              el?.focus();
              el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }}
          className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-stone-700 active:scale-95"
        >
          <Search className="h-4 w-4" />
          <span className="text-[10px] font-medium tracking-tight">Search</span>
        </button>

        <button
          id="mobile-nav-help"
          type="button"
          onClick={onOpenHelpMeChoose}
          className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[#9A7B4F] active:scale-95"
        >
          <HelpCircle className="h-4 w-4" />
          <span className="text-[10px] font-semibold tracking-tight">Choose</span>
        </button>

        {hasComparison ? (
          <button
            id="mobile-nav-compare"
            type="button"
            onClick={onOpenComparison}
            className="flex min-w-0 flex-1 animate-pulse flex-col items-center justify-center gap-0.5 px-1 py-1.5 font-semibold text-[#9A7B4F] active:scale-95"
          >
            <Scale className="h-4 w-4" />
            <span className="text-[10px] font-medium tracking-tight">Compare</span>
          </button>
        ) : null}

        <button
          id="mobile-nav-picks"
          type="button"
          onClick={onOpenShortlist}
          className="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-stone-900 active:scale-95"
        >
          <UtensilsCrossed className="h-4 w-4 text-stone-800" />
          <span className="text-[10px] font-semibold tracking-tight">Picks</span>
          {shortlistCount > 0 ? (
            <span className="absolute right-2 top-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#E0CDA9] text-[9px] font-bold text-stone-950">
              {shortlistCount}
            </span>
          ) : null}
        </button>
      </nav>
    </div>
  );

  if (typeof document === 'undefined') return nav;
  return createPortal(nav, document.body);
}
