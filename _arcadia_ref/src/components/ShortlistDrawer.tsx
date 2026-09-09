import React, { useState } from 'react';
import { Dish } from '../types';
import { X, Trash2, Plus, Minus, UtensilsCrossed, UserCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { formatPrice } from '../utils/formatters';

interface ShortlistDrawerProps {
  isOpen: boolean;
  shortlist: { dish: Dish; quantity: number }[];
  allDishes: Dish[];
  onClose: () => void;
  onUpdateQuantity: (dishId: string, delta: number) => void;
  onRemoveItem: (dishId: string) => void;
  onClearAll: () => void;
  onSelectDish: (dish: Dish) => void;
}

export const ShortlistDrawer: React.FC<ShortlistDrawerProps> = ({
  isOpen,
  shortlist,
  allDishes,
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  onClearAll,
  onSelectDish,
}) => {
  const [showServerMode, setShowServerMode] = useState(false);

  if (!isOpen) return null;

  const subtotal = shortlist.reduce((sum, item) => sum + item.dish.price * item.quantity, 0);

  // Check if breads or beverages are missing to provide gentle hospitality suggestions
  const hasBread = shortlist.some((item) => item.dish.category === 'breads-sides');
  const suggestedBread = allDishes.find((d) => d.id === 'truffle-chilli-naan');

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-stone-950/65 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 40 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md bg-[#FAF8F5] h-full shadow-2xl flex flex-col justify-between border-l border-stone-200/90"
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-stone-200/80 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-[#9A7B4F]/15 flex items-center justify-center text-[#9A7B4F]">
              <UtensilsCrossed className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-medium text-stone-900 leading-tight">
                Table 14 · Selection Shortlist
              </h3>
              <span className="text-[11px] text-stone-500 font-normal">
                {shortlist.length} item{shortlist.length !== 1 ? 's' : ''} saved for your table
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-stone-200/80 text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Server Presentation Mode View */}
        {showServerMode ? (
          <div className="flex-1 p-6 overflow-y-auto no-scrollbar space-y-6 bg-white">
            <div className="p-5 rounded-2xl bg-stone-950 text-stone-50 text-center space-y-1.5 shadow-sm">
              <div className="flex items-center justify-center space-x-1.5 text-[#E0CDA9] text-xs font-serif uppercase tracking-widest">
                <UserCheck className="w-4 h-4 mr-1 text-[#E0CDA9]" />
                <span>Ready for Server</span>
              </div>
              <h4 className="font-serif text-2xl font-normal">Table 14 · Dinner Order</h4>
              <p className="text-xs text-stone-300 font-normal">
                Present this curated card to your floor captain or server to place your order.
              </p>
            </div>

            <div className="divide-y divide-stone-100 border-t border-b border-stone-200/80">
              {shortlist.map(({ dish, quantity }) => (
                <div key={dish.id} className="py-3.5 flex items-start justify-between">
                  <div>
                    <span className="font-serif font-medium text-stone-900 text-base">
                      {quantity}× {dish.name}
                    </span>
                    <span className="text-xs text-stone-500 block mt-0.5">
                      {dish.tasteProfile.join(' · ')} · {dish.spiceLabel}
                    </span>
                  </div>
                  <span className="font-serif font-semibold text-stone-900 text-sm">
                    {formatPrice(dish.price * quantity)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-base font-serif font-semibold text-stone-900 pt-1">
              <span>Estimated Total:</span>
              <span>{formatPrice(subtotal)}</span>
            </div>

            <button
              onClick={() => setShowServerMode(false)}
              className="w-full py-3 rounded-xl border border-stone-300 text-stone-700 text-xs uppercase tracking-wider font-medium hover:bg-stone-50 transition-colors cursor-pointer"
            >
              ← Return to Edit Items
            </button>
          </div>
        ) : (
          /* Normal Shortlist Items List */
          <div className="flex-1 p-5 overflow-y-auto no-scrollbar space-y-4">
            {shortlist.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400 space-y-3">
                <div className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center text-stone-300">
                  <UtensilsCrossed className="w-7 h-7 stroke-[1.2]" />
                </div>
                <h4 className="font-serif text-lg text-stone-700 font-medium">Your table shortlist is empty</h4>
                <p className="text-xs text-stone-500 max-w-xs leading-relaxed font-normal">
                  Explore our menu dishes and tap <span className="font-medium text-stone-800">"+ Add to Table Picks"</span> to collect items before ordering.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {shortlist.map(({ dish, quantity }) => (
                    <div
                      key={dish.id}
                      className="p-3.5 bg-white rounded-2xl border border-stone-200/90 shadow-2xs flex items-center justify-between gap-3"
                    >
                      <img
                        src={dish.image}
                        alt={dish.name}
                        referrerPolicy="no-referrer"
                        className="w-13 h-13 rounded-xl object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4
                          onClick={() => {
                            onClose();
                            onSelectDish(dish);
                          }}
                          className="font-serif font-medium text-stone-900 text-sm truncate hover:text-[#9A7B4F] cursor-pointer"
                        >
                          {dish.name}
                        </h4>
                        <span className="text-[11px] text-stone-500 block truncate mt-0.5">
                          {formatPrice(dish.price)} each · {dish.spiceLabel}
                        </span>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center space-x-1.5 bg-stone-100/90 rounded-full p-0.5 border border-stone-200/70">
                        <button
                          onClick={() => onUpdateQuantity(dish.id, -1)}
                          className="p-1 hover:bg-white rounded-full text-stone-600 transition-colors cursor-pointer"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-4 text-center text-xs font-semibold text-stone-800">
                          {quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(dish.id, 1)}
                          className="p-1 hover:bg-white rounded-full text-stone-600 transition-colors cursor-pointer"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        onClick={() => onRemoveItem(dish.id)}
                        className="p-1 text-stone-400 hover:text-red-600 transition-colors cursor-pointer"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Hospitality Pairing Upsell Prompts */}
                {!hasBread && suggestedBread && (
                  <div className="p-3.5 rounded-2xl bg-[#FAF6F0] border border-[#E8DFD3] flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase tracking-wider text-[#9A7B4F] font-semibold block">
                        Complete your curries
                      </span>
                      <span className="font-serif font-medium text-stone-900">
                        Pair with {suggestedBread.name} (+{formatPrice(suggestedBread.price)})
                      </span>
                    </div>
                    <button
                      onClick={() => onSelectDish(suggestedBread)}
                      className="px-3 py-1.5 bg-white border border-[#9A7B4F]/40 rounded-xl text-[11px] font-medium text-stone-800 hover:bg-[#9A7B4F] hover:text-white transition-colors cursor-pointer"
                    >
                      View
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Drawer Footer / Subtotal & Actions */}
        {shortlist.length > 0 && !showServerMode && (
          <div className="p-5 bg-white border-t border-stone-200/90 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-stone-500 font-normal">Table Subtotal:</span>
              <span className="font-serif text-lg font-semibold text-stone-900">
                {formatPrice(subtotal)}
              </span>
            </div>

            <button
              id="shortlist-server-view-btn"
              onClick={() => setShowServerMode(true)}
              className="w-full py-3 rounded-xl bg-stone-950 hover:bg-stone-800 text-stone-50 text-xs sm:text-sm font-medium tracking-wider uppercase transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-xs active:scale-[0.99]"
            >
              <UserCheck className="w-4 h-4 text-[#E0CDA9]" />
              <span>Show Summary to Server</span>
            </button>

            <div className="flex justify-between items-center text-[11px] text-stone-400">
              <button
                onClick={onClearAll}
                className="hover:text-red-700 transition-colors underline cursor-pointer"
              >
                Clear all picks
              </button>
              <span>Table 14</span>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

