import React from 'react';
import { Dish } from '../types';
import { compareDishes } from '../services/searchAndRecommendation';
import { X, Scale, Check, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { formatPrice } from '../utils/formatters';

interface ComparisonModalProps {
  pair: [Dish, Dish] | null;
  allDishes: Dish[];
  shortlistIds: Set<string>;
  onClose: () => void;
  onOpenDishDetail: (dish: Dish) => void;
  onToggleShortlist: (dish: Dish) => void;
  onChangeDish: (slot: 0 | 1, newDish: Dish) => void;
}

export const ComparisonModal: React.FC<ComparisonModalProps> = ({
  pair,
  allDishes,
  shortlistIds,
  onClose,
  onOpenDishDetail,
  onToggleShortlist,
  onChangeDish,
}) => {
  if (!pair) return null;

  const [dishA, dishB] = pair;
  const { diffs, advice } = compareDishes(dishA, dishB);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-950/65 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 30 }}
        className="relative w-full max-w-3xl bg-[#FAF8F5] rounded-t-3xl sm:rounded-2xl border border-stone-200/90 shadow-2xl p-5 sm:p-7 max-h-[92vh] overflow-y-auto no-scrollbar space-y-6"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-200/70">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-[#9A7B4F]/15 flex items-center justify-center text-[#9A7B4F]">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-lg sm:text-xl font-medium text-stone-900 leading-tight">
                Side-by-Side Dish Comparison
              </h3>
              <span className="text-[11px] text-stone-500 font-normal">
                Evaluating taste profile, spice intensity, and culinary preparation
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

        {/* 2-Column Dish Cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-6">
          {/* Dish A */}
          <div className="p-4 bg-white rounded-2xl border border-stone-200/80 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-stone-100 mb-3">
                <img
                  src={dishA.image}
                  alt={dishA.name}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              </div>
              <h4 className="font-serif font-medium text-stone-900 text-sm sm:text-base leading-snug">
                {dishA.name}
              </h4>
              <span className="font-serif font-semibold text-stone-900 text-sm sm:text-base block mt-0.5">
                {formatPrice(dishA.price)}
              </span>
            </div>

            <div className="pt-3 border-t border-stone-100 mt-3 flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => onToggleShortlist(dishA)}
                className={`flex-1 py-2 px-2.5 rounded-xl text-[11px] font-medium transition-colors flex items-center justify-center space-x-1 cursor-pointer ${
                  shortlistIds.has(dishA.id)
                    ? 'bg-stone-950 text-[#E0CDA9]'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-800'
                }`}
              >
                {shortlistIds.has(dishA.id) ? <Check className="w-3.5 h-3.5 text-[#E0CDA9]" /> : <Plus className="w-3.5 h-3.5" />}
                <span>{shortlistIds.has(dishA.id) ? 'Saved' : 'Add to Picks'}</span>
              </button>
              <button
                onClick={() => {
                  onClose();
                  onOpenDishDetail(dishA);
                }}
                className="py-2 px-2.5 rounded-xl border border-stone-200 text-[11px] text-stone-600 hover:text-stone-900 text-center cursor-pointer hover:bg-stone-50"
              >
                Full Detail
              </button>
            </div>
          </div>

          {/* Dish B */}
          <div className="p-4 bg-white rounded-2xl border border-stone-200/80 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-stone-100 mb-3">
                <img
                  src={dishB.image}
                  alt={dishB.name}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              </div>
              <h4 className="font-serif font-medium text-stone-900 text-sm sm:text-base leading-snug">
                {dishB.name}
              </h4>
              <span className="font-serif font-semibold text-stone-900 text-sm sm:text-base block mt-0.5">
                {formatPrice(dishB.price)}
              </span>
            </div>

            <div className="pt-3 border-t border-stone-100 mt-3 flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => onToggleShortlist(dishB)}
                className={`flex-1 py-2 px-2.5 rounded-xl text-[11px] font-medium transition-colors flex items-center justify-center space-x-1 cursor-pointer ${
                  shortlistIds.has(dishB.id)
                    ? 'bg-stone-950 text-[#E0CDA9]'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-800'
                }`}
              >
                {shortlistIds.has(dishB.id) ? <Check className="w-3.5 h-3.5 text-[#E0CDA9]" /> : <Plus className="w-3.5 h-3.5" />}
                <span>{shortlistIds.has(dishB.id) ? 'Saved' : 'Add to Picks'}</span>
              </button>
              <button
                onClick={() => {
                  onClose();
                  onOpenDishDetail(dishB);
                }}
                className="py-2 px-2.5 rounded-xl border border-stone-200 text-[11px] text-stone-600 hover:text-stone-900 text-center cursor-pointer hover:bg-stone-50"
              >
                Full Detail
              </button>
            </div>
          </div>
        </div>

        {/* "Which Should I Choose?" Hospitality Advice Box */}
        <div className="p-4 rounded-xl bg-[#FAF6F0] border border-[#E8DFD3] space-y-1">
          <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#9A7B4F] block">
            Which Should You Choose?
          </span>
          <p className="text-xs sm:text-sm text-stone-800 font-normal leading-relaxed italic">
            "{advice}"
          </p>
        </div>

        {/* Comparison Matrix Table */}
        <div className="overflow-hidden rounded-xl border border-stone-200/80 bg-white">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-stone-50/80 border-b border-stone-200/80">
                <th className="p-3 font-semibold text-stone-400 uppercase text-[10px] tracking-wider w-1/4">
                  Feature
                </th>
                <th className="p-3 font-serif font-medium text-stone-900 text-xs sm:text-sm w-[37.5%]">
                  {dishA.name}
                </th>
                <th className="p-3 font-serif font-medium text-stone-900 text-xs sm:text-sm w-[37.5%]">
                  {dishB.name}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {diffs.map((row, idx) => (
                <tr key={idx} className="hover:bg-stone-50/50 transition-colors">
                  <td className="p-3 font-medium text-stone-500 text-[11px]">
                    {row.label}
                  </td>
                  <td className="p-3 text-stone-800 leading-snug">
                    {row.valA}
                  </td>
                  <td className="p-3 text-stone-800 leading-snug">
                    {row.valB}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bottom Done Action */}
        <div className="flex justify-end pt-1">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-stone-950 hover:bg-stone-800 text-stone-50 text-xs font-medium tracking-wider uppercase transition-all active:scale-[0.98] cursor-pointer"
          >
            Done Comparing
          </button>
        </div>
      </motion.div>
    </div>
  );
};

