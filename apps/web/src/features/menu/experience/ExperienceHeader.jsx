import React from 'react';
import { HelpCircle, UtensilsCrossed, ClipboardList } from 'lucide-react';

/**
 * Sticky experience header — mobile-first, truncates long restaurant names.
 */
export function ExperienceHeader({
  restaurant,
  tableLabel = 'Table',
  shortlistCount = 0,
  hasActiveOrder = false,
  onOpenShortlist,
  onOpenHelpMeChoose,
  onOpenMyOrder,
}) {
  const name = restaurant?.name || 'Menu';

  return (
    <header className="sticky top-0 z-30 w-full luxury-blur border-b border-stone-200/70 bg-[#FAF8F5]/95 backdrop-blur-md pt-[env(safe-area-inset-top)]">
      <div className="flex h-14 items-center justify-between gap-2 px-3 sm:h-16 sm:px-4">
        <div className="min-w-0 flex-1 pr-2">
          <h1 className="truncate font-serif text-[15px] font-medium uppercase leading-tight tracking-[0.08em] text-stone-900 sm:text-lg sm:tracking-[0.12em]">
            {name}
          </h1>
          <p className="mt-0.5 truncate text-[11px] font-medium text-stone-600">{tableLabel}</p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {hasActiveOrder && typeof onOpenMyOrder === 'function' ? (
            <button
              type="button"
              onClick={onOpenMyOrder}
              className="inline-flex h-9 items-center gap-1 rounded-full border border-[#E8DFD3] bg-white px-2.5 text-[11px] font-semibold text-stone-800 shadow-sm active:scale-[0.98]"
              aria-label="My order"
            >
              <ClipboardList className="h-3.5 w-3.5 text-[#9A7B4F]" />
              <span className="hidden xs:inline sm:inline">Order</span>
            </button>
          ) : null}

          <button
            id="header-help-choose-btn"
            type="button"
            onClick={onOpenHelpMeChoose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#9A7B4F]/35 bg-[#9A7B4F]/10 text-stone-900 active:scale-[0.98] sm:w-auto sm:gap-1.5 sm:px-3"
            title="Help Me Choose"
            aria-label="Help Me Choose"
          >
            <HelpCircle className="h-3.5 w-3.5 text-[#9A7B4F]" />
            <span className="hidden text-xs font-medium sm:inline">Choose</span>
          </button>

          <button
            id="header-shortlist-btn"
            type="button"
            onClick={onOpenShortlist}
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-stone-950 text-stone-50 active:scale-[0.98] sm:w-auto sm:gap-1.5 sm:px-3"
            aria-label="View Table Shortlist"
          >
            <UtensilsCrossed className="h-3.5 w-3.5 text-[#E0CDA9]" />
            <span className="hidden text-xs font-medium sm:inline">Picks</span>
            {shortlistCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 inline-flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[#E0CDA9] px-1 text-[9px] font-bold text-stone-900 sm:static sm:ml-0.5">
                {shortlistCount}
              </span>
            ) : null}
          </button>
        </div>
      </div>
    </header>
  );
}
