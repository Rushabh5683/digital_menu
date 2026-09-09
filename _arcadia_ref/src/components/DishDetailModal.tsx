import React, { useState } from 'react';
import { Dish, IngredientDetail } from '../types';
import { X, Flame, Plus, Check, Scale, AlertCircle, Info, Sparkles, ChevronRight, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatPrice } from '../utils/formatters';

interface DishDetailModalProps {
  dish: Dish | null;
  allDishes: Dish[];
  isShortlisted: boolean;
  isCompared: boolean;
  onClose: () => void;
  onToggleShortlist: (dish: Dish) => void;
  onToggleCompare: (dish: Dish) => void;
  onSelectDish: (dish: Dish) => void;
  onIngredientTapped?: (ingredient: IngredientDetail) => void;
}

export const DishDetailModal: React.FC<DishDetailModalProps> = ({
  dish,
  allDishes,
  isShortlisted,
  isCompared,
  onClose,
  onToggleShortlist,
  onToggleCompare,
  onSelectDish,
  onIngredientTapped,
}) => {
  const [selectedIngredient, setSelectedIngredient] = useState<IngredientDetail | null>(null);

  if (!dish) return null;

  const isVeg = dish.dietaryTags.includes('Vegetarian') || dish.dietaryTags.includes('Vegan');

  // Find similar dishes
  const similarDishes = dish.similarDishIds
    .map((id) => allDishes.find((d) => d.id === id))
    .filter((d): d is Dish => Boolean(d));

  // Find alternative dishes if unavailable
  const alternativeDishes = (dish.suggestedAlternativeIds || [])
    .map((id) => allDishes.find((d) => d.id === id))
    .filter((d): d is Dish => Boolean(d));

  const handleIngredientClick = (ing: IngredientDetail) => {
    setSelectedIngredient(selectedIngredient?.name === ing.name ? null : ing);
    if (onIngredientTapped) {
      onIngredientTapped(ing);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-950/60 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-2xl bg-[#FAF8F5] rounded-t-3xl sm:rounded-2xl border border-stone-200/90 shadow-2xl max-h-[92vh] sm:max-h-[88vh] overflow-y-auto no-scrollbar flex flex-col"
        >
          {/* Top Close Button */}
          <button
            id="dish-detail-close-btn"
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-stone-950/70 hover:bg-stone-950 text-white backdrop-blur-md transition-colors cursor-pointer"
            aria-label="Close dish detail"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Hero Photography */}
          <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full overflow-hidden sm:rounded-t-2xl bg-stone-100 flex-shrink-0">
            <img
              src={dish.image}
              alt={dish.name}
              referrerPolicy="no-referrer"
              className={`h-full w-full object-cover ${!dish.availability ? 'grayscale-[35%]' : ''}`}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/60 via-transparent to-black/20" />

            {/* Badges */}
            <div className="absolute bottom-4 left-4 sm:left-6 flex flex-wrap gap-2 items-center">
              {dish.isSignature && (
                <span className="px-3 py-1 text-xs uppercase font-semibold tracking-wider bg-stone-950/90 text-[#E0CDA9] backdrop-blur-md rounded-full">
                  Signature Dish
                </span>
              )}
              {dish.isChefRecommended && (
                <span className="px-3 py-1 text-xs uppercase font-semibold tracking-wider bg-[#9A7B4F]/95 text-white backdrop-blur-md rounded-full">
                  Chef's Choice
                </span>
              )}
              {dish.isPopular && (
                <span className="px-3 py-1 text-xs uppercase font-semibold tracking-wider bg-white/95 text-stone-900 backdrop-blur-md rounded-full">
                  Guest Favourite
                </span>
              )}
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-5 sm:p-7 space-y-6 flex-1">
            {/* Header: Title, Subtitle, Price */}
            <div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center space-x-2 mb-1.5">
                    <span
                      className={`w-3.5 h-3.5 border flex items-center justify-center rounded-[3px] ${
                        isVeg ? 'border-emerald-600 bg-emerald-50/50' : 'border-rose-700 bg-rose-50/50'
                      }`}
                      title={isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isVeg ? 'bg-emerald-600' : 'bg-rose-700'}`} />
                    </span>
                    <span className="text-[11px] font-medium tracking-[0.2em] text-[#9A7B4F] uppercase">
                      {dish.categoryName}
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-serif font-medium text-stone-900 leading-tight">
                    {dish.name}
                  </h2>
                  {dish.nativeName && (
                    <span className="text-xs text-stone-400 font-serif italic block mt-0.5">
                      {dish.nativeName}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-2xl sm:text-3xl font-serif font-semibold text-stone-900 whitespace-nowrap block">
                    {formatPrice(dish.price)}
                  </span>
                  <span className="text-[11px] text-stone-400 font-normal">Inclusive of all taxes</span>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm sm:text-base text-stone-600 font-normal leading-relaxed mt-3">
                {dish.description}
              </p>
            </div>

            {/* Unavailable Recovery Notice */}
            {!dish.availability && (
              <div className="p-4 rounded-xl bg-amber-50/90 border border-amber-200 text-stone-800 space-y-2">
                <div className="flex items-center space-x-2 text-amber-900 font-serif text-base">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>{dish.name} is resting tonight</span>
                </div>
                <p className="text-xs text-stone-600">
                  {dish.unavailableReason || 'This dish is temporarily unavailable to preserve our fresh sourcing standard.'}
                </p>
                {alternativeDishes.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[11px] font-semibold tracking-wider uppercase text-stone-700 block mb-2">
                      Chef's recommended alternatives:
                    </span>
                    <div className="space-y-2">
                      {alternativeDishes.map((alt) => (
                        <div
                          key={alt.id}
                          onClick={() => onSelectDish(alt)}
                          className="flex items-center justify-between p-3 rounded-xl bg-white border border-stone-200/80 hover:border-[#9A7B4F] transition-all cursor-pointer"
                        >
                          <div>
                            <span className="font-serif font-medium text-stone-900 text-sm block">
                              {alt.name}
                            </span>
                            <span className="text-[11px] text-stone-500">
                              {alt.tasteProfile.join(' · ')} · {formatPrice(alt.price)}
                            </span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-[#9A7B4F]" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sensory Matrix / Key Attributes Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 rounded-xl bg-white border border-stone-200/80 text-xs">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-stone-400 block mb-1">
                  Spice Profile
                </span>
                <span className="font-medium text-stone-800 inline-flex items-center space-x-1">
                  {dish.spiceLevel > 0 && <Flame className="w-3.5 h-3.5 text-amber-600" />}
                  <span>{dish.spiceLabel}</span>
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-stone-400 block mb-1">
                  Richness
                </span>
                <span className="font-medium text-stone-800">{dish.richness} Body</span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-stone-400 block mb-1">
                  Portion
                </span>
                <span className="font-medium text-stone-800">{dish.portion}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-stone-400 block mb-1">
                  Preparation
                </span>
                <span className="font-medium text-stone-800 truncate block" title={dish.preparation}>
                  {dish.preparation}
                </span>
              </div>
            </div>

            {/* "What to Expect" Sensory Breakdown */}
            <div className="p-4 rounded-xl bg-[#FAF6F0] border border-[#E8DFD3] space-y-1">
              <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#9A7B4F] block">
                What to Expect
              </span>
              <p className="text-xs sm:text-sm text-stone-700 font-normal leading-relaxed italic">
                "{dish.whatToExpect}"
              </p>
            </div>

            {/* Interactive Ingredients Section */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.2em] font-semibold text-stone-900">
                  Featured Ingredients
                </span>
                <span className="text-[11px] text-stone-400 font-normal">
                  Tap any ingredient for culinary notes
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {dish.ingredients.map((ing, idx) => {
                  const isSelected = selectedIngredient?.name === ing.name;

                  return (
                    <button
                      key={idx}
                      id={`ingredient-chip-${idx}`}
                      onClick={() => handleIngredientClick(ing)}
                      className={`inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-stone-900 text-stone-50 border-stone-900 shadow-2xs'
                          : 'bg-white hover:bg-stone-50 text-stone-700 border-stone-200/90'
                      }`}
                    >
                      <span>{ing.name}</span>
                      <Info className={`w-3 h-3 ${isSelected ? 'text-[#E0CDA9]' : 'text-stone-300'}`} />
                    </button>
                  );
                })}
              </div>

              {/* Ingredient Note Card */}
              <AnimatePresence>
                {selectedIngredient && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-3.5 bg-white border border-[#9A7B4F]/40 rounded-xl text-xs text-stone-700"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-serif font-semibold text-stone-900 text-sm">
                        {selectedIngredient.name}
                      </span>
                      <button
                        onClick={() => setSelectedIngredient(null)}
                        className="text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-stone-600 leading-relaxed font-normal">
                      {selectedIngredient.note || 'Sourced fresh daily from sustainable partner growers across regional farms.'}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Dietary & Verified Allergens */}
            <div className="pt-3 border-t border-stone-200/60 flex flex-wrap gap-3 items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-stone-500" />
                <span className="font-medium text-stone-800">Dietary Profile:</span>
                <span className="text-stone-600">{dish.dietaryTags.join(', ')}</span>
              </div>
              <div className="text-stone-500">
                <span>Allergens: </span>
                <span className="text-stone-700 font-medium">
                  {dish.allergens.length > 0 ? dish.allergens.join(', ') : 'None listed'}
                </span>
              </div>
            </div>

            {/* Beverage / Wine Pairing */}
            {dish.pairingBeverage && (
              <div className="p-4 rounded-xl bg-white border border-stone-200/80 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase tracking-wider text-[#9A7B4F] font-semibold block">
                    Sommelier Pairing
                  </span>
                  <span className="font-serif font-medium text-stone-900 text-sm">
                    {dish.pairingBeverage}
                  </span>
                </div>
                <Sparkles className="w-4 h-4 text-[#9A7B4F]" />
              </div>
            )}

            {/* Similar Dishes (If You Like This...) */}
            {similarDishes.length > 0 && (
              <div className="space-y-2.5 pt-2">
                <span className="text-xs uppercase tracking-[0.2em] font-semibold text-stone-900 block">
                  If You Enjoy This, Consider Also
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {similarDishes.map((sim) => (
                    <div
                      key={sim.id}
                      onClick={() => onSelectDish(sim)}
                      className="flex items-center space-x-3 p-3 bg-white border border-stone-200/80 rounded-xl hover:border-[#9A7B4F] transition-all cursor-pointer group"
                    >
                      <img
                        src={sim.image}
                        alt={sim.name}
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-serif font-medium text-stone-900 text-sm truncate group-hover:text-[#9A7B4F] transition-colors">
                          {sim.name}
                        </h4>
                        <span className="text-[11px] text-stone-500 truncate block">
                          {sim.tasteProfile.join(' · ')} · {formatPrice(sim.price)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sticky Bottom Actions inside Modal */}
          <div className="sticky bottom-0 z-20 p-4 sm:p-5 bg-white/95 backdrop-blur-md border-t border-stone-200/80 flex items-center justify-between gap-3">
            {/* Compare Toggle */}
            <button
              id="detail-compare-btn"
              onClick={() => onToggleCompare(dish)}
              className={`px-4 py-2.5 rounded-xl border text-xs font-medium tracking-wide flex items-center space-x-1.5 transition-colors cursor-pointer ${
                isCompared
                  ? 'bg-[#9A7B4F] text-white border-[#9A7B4F]'
                  : 'bg-white text-stone-800 border-stone-200 hover:bg-stone-50'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>{isCompared ? 'Comparing' : 'Compare'}</span>
            </button>

            {/* Shortlist Action */}
            <button
              id="detail-shortlist-btn"
              onClick={() => onToggleShortlist(dish)}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-medium tracking-wider uppercase transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-sm active:scale-[0.99] ${
                isShortlisted
                  ? 'bg-stone-950 text-[#E0CDA9]'
                  : 'bg-stone-950 hover:bg-stone-800 text-stone-50'
              }`}
            >
              {isShortlisted ? (
                <>
                  <Check className="w-4 h-4 text-[#E0CDA9]" />
                  <span>Saved to Table Picks</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 text-stone-300" />
                  <span>Add to Table Picks · {formatPrice(dish.price)}</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

