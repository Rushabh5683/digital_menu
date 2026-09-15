import React, { useEffect, useRef, useState } from 'react';
import { X, Trash2, Plus, Minus, UtensilsCrossed, UserCheck, ShoppingBag, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLockBodyScroll } from '../../../shared/lib/useLockBodyScroll.js';
import { formatPrice, dishImage, parsePrice } from './lib/formatters.js';

/**
 * Table picks sheet — mobile-first bottom sheet aligned to the phone shell (max-w-lg).
 */
export function ShortlistDrawer({
  isOpen,
  shortlist = [],
  allDishes = [],
  tableLabel = 'Table',
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  onClearAll,
  onSelectDish,
  onAddToOrder,
  currency = 'INR',
}) {
  const [showServerMode, setShowServerMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const prevOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !prevOpenRef.current) {
      setSelectedIds(new Set(shortlist.map((item) => item.dish.id)));
      setShowServerMode(false);
    }
    if (!isOpen) {
      setSelectedIds(new Set());
    }
    prevOpenRef.current = isOpen;
  }, [isOpen, shortlist]);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedIds((prev) => {
      const valid = new Set(shortlist.map((item) => item.dish.id));
      return new Set([...prev].filter((id) => valid.has(id)));
    });
  }, [shortlist, isOpen]);

  useLockBodyScroll(isOpen);

  if (!isOpen) return null;

  const selectedItems = shortlist.filter((item) => selectedIds.has(item.dish.id));
  const allSelected = shortlist.length > 0 && selectedIds.size === shortlist.length;
  const selectedCount = selectedItems.length;

  const subtotal = shortlist.reduce(
    (sum, item) => sum + parsePrice(item.dish.price) * item.quantity,
    0,
  );
  const selectedSubtotal = selectedItems.reduce(
    (sum, item) => sum + parsePrice(item.dish.price) * item.quantity,
    0,
  );

  function toggleSelected(dishId) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(dishId)) next.delete(dishId);
      else next.add(dishId);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(shortlist.map((item) => item.dish.id)));
    }
  }

  const hasBread = shortlist.some((item) =>
    /bread|naan|roti|side/.test(
      String(item.dish.category || item.dish.categoryName || '').toLowerCase(),
    ),
  );
  const suggestedBread = allDishes.find((d) =>
    /naan|roti|bread|paratha/.test(String(d.name || '').toLowerCase()),
  );

  return (
    <div
      className="guest-portal fixed inset-x-0 top-0 z-50 flex flex-col justify-end"
      style={{ bottom: 'calc(3.85rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-stone-900/40"
        aria-label="Close shortlist"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 36 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 36 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 mx-auto flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-stone-200 bg-[#FAF8F5] shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-stone-200 bg-[#FDFBF7] p-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#9A7B4F]/15 text-[#9A7B4F]">
              <UtensilsCrossed className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-serif text-lg font-medium leading-tight text-stone-900">
                {tableLabel} · Picks
              </h3>
              <span className="block text-[11px] font-normal text-stone-500">
                {shortlist.length} item{shortlist.length !== 1 ? 's' : ''} saved for your table
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-stone-500 transition-colors hover:bg-stone-200/80 hover:text-stone-900"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {showServerMode ? (
          <div className="flex-1 space-y-6 overflow-y-auto overscroll-contain bg-white p-6 no-scrollbar">
            <div className="space-y-1.5 rounded-2xl bg-stone-950 p-5 text-center text-stone-50 shadow-sm">
              <div className="flex items-center justify-center space-x-1.5 font-serif text-xs uppercase tracking-widest text-[#E0CDA9]">
                <UserCheck className="mr-1 h-4 w-4 text-[#E0CDA9]" />
                <span>Ready for Server</span>
              </div>
              <h4 className="font-serif text-2xl font-normal">{tableLabel} · Dinner Order</h4>
              <p className="text-xs font-normal text-stone-300">
                Present this curated card to your floor captain or server to place your order.
              </p>
            </div>

            <div className="divide-y divide-stone-100 border-b border-t border-stone-200/80">
              {shortlist.map(({ dish, quantity }) => (
                <div key={dish.id} className="flex items-start justify-between py-3.5">
                  <div>
                    <span className="font-serif text-base font-medium text-stone-900">
                      {quantity}× {dish.name}
                    </span>
                    <span className="mt-0.5 block text-xs text-stone-500">
                      {(dish.tasteProfile || []).join(' · ')} · {dish.spiceLabel}
                    </span>
                  </div>
                  <span className="font-serif text-sm font-semibold text-stone-900">
                    {formatPrice(parsePrice(dish.price) * quantity, currency)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-1 font-serif text-base font-semibold text-stone-900">
              <span>Estimated Total:</span>
              <span>{formatPrice(subtotal, currency)}</span>
            </div>

            <button
              type="button"
              onClick={() => setShowServerMode(false)}
              className="w-full cursor-pointer rounded-xl border border-stone-300 py-3 text-xs font-medium uppercase tracking-wider text-stone-700 transition-colors hover:bg-stone-50"
            >
              ← Return to Edit Items
            </button>
          </div>
        ) : (
          <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain bg-[#FAF8F5] p-5 no-scrollbar">
            {shortlist.length === 0 ? (
              <div className="flex min-h-[40vh] flex-col items-center justify-center space-y-3 p-6 text-center text-stone-400">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-stone-100 text-stone-300">
                  <UtensilsCrossed className="h-7 w-7 stroke-[1.2]" />
                </div>
                <h4 className="font-serif text-lg font-medium text-stone-700">Your table picks are empty</h4>
                <p className="max-w-xs text-xs font-normal leading-relaxed text-stone-500">
                  Explore the menu and tap{' '}
                  <span className="font-medium text-stone-800">&quot;+ Add to Table Picks&quot;</span> to
                  collect items before ordering.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between px-0.5">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-stone-500">
                    Choose picks to order
                  </p>
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="cursor-pointer text-[11px] font-semibold text-[#9A7B4F] underline-offset-2 hover:underline"
                  >
                    {allSelected ? 'Deselect all' : 'Select all'}
                  </button>
                </div>

                <div className="space-y-3">
                  {shortlist.map(({ dish, quantity }) => {
                    const isSelected = selectedIds.has(dish.id);
                    return (
                    <div
                      key={dish.id}
                      className={[
                        'flex min-w-0 items-center gap-2.5 rounded-2xl border p-3 shadow-2xs transition-colors sm:gap-3 sm:p-3.5',
                        isSelected
                          ? 'border-[#9A7B4F]/45 bg-[#FAF6F0]'
                          : 'border-stone-200/90 bg-white opacity-80',
                      ].join(' ')}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSelected(dish.id)}
                        className={[
                          'flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-md border transition-colors',
                          isSelected
                            ? 'border-[#9A7B4F] bg-[#9A7B4F] text-white'
                            : 'border-stone-300 bg-white text-transparent',
                        ].join(' ')}
                        aria-label={isSelected ? `Deselect ${dish.name}` : `Select ${dish.name}`}
                        aria-pressed={isSelected}
                      >
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </button>

                      {dishImage(dish) ? (
                        <img
                          src={dishImage(dish)}
                          alt={dish.name}
                          referrerPolicy="no-referrer"
                          className="h-13 w-13 flex-shrink-0 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="h-13 w-13 flex-shrink-0 rounded-xl bg-gradient-to-br from-[#E8DFD3] to-[#C5A880]" />
                      )}
                      <div className="min-w-0 flex-1">
                        <h4
                          onClick={() => {
                            onClose();
                            onSelectDish?.(dish);
                          }}
                          className="cursor-pointer truncate font-serif text-sm font-medium text-stone-900 hover:text-[#9A7B4F]"
                        >
                          {dish.name}
                        </h4>
                        <span className="mt-0.5 block truncate text-[11px] text-stone-500">
                          {formatPrice(dish.price, currency)} each · {dish.spiceLabel}
                        </span>
                      </div>

                      <div className="flex shrink-0 items-center space-x-1.5 rounded-full border border-stone-200/70 bg-stone-100/90 p-0.5">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity?.(dish.id, -1)}
                          className="cursor-pointer rounded-full p-1 text-stone-600 transition-colors hover:bg-white"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-4 text-center text-xs font-semibold text-stone-800">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity?.(dish.id, 1)}
                          className="cursor-pointer rounded-full p-1 text-stone-600 transition-colors hover:bg-white"
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => onRemoveItem?.(dish.id)}
                        className="shrink-0 cursor-pointer p-1.5 text-stone-400 transition-colors hover:text-red-600"
                        title="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    );
                  })}
                </div>

                {!hasBread && suggestedBread ? (
                  <div className="flex min-w-0 items-start justify-between gap-3 rounded-2xl border border-[#E8DFD3] bg-[#FAF6F0] p-3.5 text-xs">
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#9A7B4F]">
                        Complete your curries
                      </span>
                      <span className="block break-words font-serif font-medium text-stone-900">
                        Pair with {suggestedBread.name} (+{formatPrice(suggestedBread.price, currency)})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onSelectDish?.(suggestedBread)}
                      className="shrink-0 cursor-pointer rounded-xl border border-[#9A7B4F]/40 bg-white px-3 py-1.5 text-[11px] font-medium text-stone-800 transition-colors hover:bg-[#9A7B4F] hover:text-white"
                    >
                      View
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </div>
        )}

        {shortlist.length > 0 && !showServerMode ? (
          <div className="shrink-0 space-y-3 border-t border-stone-200/90 bg-white p-5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-normal text-stone-500">
                {selectedCount === shortlist.length
                  ? 'Table subtotal'
                  : `Selected (${selectedCount})`}
              </span>
              <span className="font-serif text-lg font-semibold text-stone-900">
                {formatPrice(
                  selectedCount === shortlist.length ? subtotal : selectedSubtotal,
                  currency,
                )}
              </span>
            </div>

            {typeof onAddToOrder === 'function' ? (
              <button
                id="shortlist-add-to-order-btn"
                type="button"
                disabled={selectedCount === 0}
                onClick={() => onAddToOrder(selectedItems)}
                className="flex w-full cursor-pointer items-center justify-center space-x-2 rounded-xl bg-[#9A7B4F] py-3 text-xs font-medium uppercase tracking-wider text-white shadow-xs transition-all hover:bg-[#866940] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45 sm:text-sm"
              >
                <ShoppingBag className="h-4 w-4" />
                <span>
                  {selectedCount === 0
                    ? 'Select picks to add'
                    : selectedCount === 1
                      ? 'Add 1 pick to order'
                      : `Add ${selectedCount} picks to order`}
                </span>
              </button>
            ) : null}

            <button
              id="shortlist-server-view-btn"
              type="button"
              onClick={() => setShowServerMode(true)}
              className="flex w-full cursor-pointer items-center justify-center space-x-2 rounded-xl bg-stone-950 py-3 text-xs font-medium uppercase tracking-wider text-stone-50 shadow-xs transition-all hover:bg-stone-800 active:scale-[0.99] sm:text-sm"
            >
              <UserCheck className="h-4 w-4 text-[#E0CDA9]" />
              <span>Show Summary to Server</span>
            </button>

            <div className="flex items-center justify-between text-[11px] text-stone-400">
              <button
                type="button"
                onClick={onClearAll}
                className="cursor-pointer underline transition-colors hover:text-red-700"
              >
                Clear all picks
              </button>
              <span>{tableLabel}</span>
            </div>
          </div>
        ) : null}
      </motion.div>
    </div>
  );
}
