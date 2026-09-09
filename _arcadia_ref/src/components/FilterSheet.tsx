import React from 'react';
import { DietaryTag, PortionGuidance, RichnessLevel } from '../types';
import { X, RotateCcw, Check } from 'lucide-react';
import { motion } from 'motion/react';

export interface FilterState {
  dietary: DietaryTag[];
  spiceLevels: number[];
  richness: RichnessLevel[];
  portion: PortionGuidance[];
}

interface FilterSheetProps {
  isOpen: boolean;
  filters: FilterState;
  onClose: () => void;
  onUpdateFilters: (filters: FilterState) => void;
  onResetFilters: () => void;
}

export const FilterSheet: React.FC<FilterSheetProps> = ({
  isOpen,
  filters,
  onClose,
  onUpdateFilters,
  onResetFilters,
}) => {
  if (!isOpen) return null;

  const dietaryOptions: DietaryTag[] = ['Vegetarian', 'Vegan', 'Gluten-Free', 'Halal', 'Dairy-Free'];
  const spiceOptions = [
    { level: 0, label: 'No Spice' },
    { level: 1, label: 'Mild' },
    { level: 2, label: 'Medium' },
    { level: 3, label: 'Hot / Fiery' },
  ];
  const richnessOptions: RichnessLevel[] = ['Light', 'Medium', 'Rich'];
  const portionOptions: PortionGuidance[] = ['Individual', 'Good for 2', 'Best shared'];

  const toggleDietary = (tag: DietaryTag) => {
    const next = filters.dietary.includes(tag)
      ? filters.dietary.filter((t) => t !== tag)
      : [...filters.dietary, tag];
    onUpdateFilters({ ...filters, dietary: next });
  };

  const toggleSpice = (lvl: number) => {
    const next = filters.spiceLevels.includes(lvl)
      ? filters.spiceLevels.filter((l) => l !== lvl)
      : [...filters.spiceLevels, lvl];
    onUpdateFilters({ ...filters, spiceLevels: next });
  };

  const toggleRichness = (r: RichnessLevel) => {
    const next = filters.richness.includes(r)
      ? filters.richness.filter((item) => item !== r)
      : [...filters.richness, r];
    onUpdateFilters({ ...filters, richness: next });
  };

  const togglePortion = (p: PortionGuidance) => {
    const next = filters.portion.includes(p)
      ? filters.portion.filter((item) => item !== p)
      : [...filters.portion, p];
    onUpdateFilters({ ...filters, portion: next });
  };

  const totalActive =
    filters.dietary.length + filters.spiceLevels.length + filters.richness.length + filters.portion.length;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-950/65 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 30 }}
        className="relative w-full max-w-md bg-[#FAF8F5] rounded-t-3xl sm:rounded-2xl border border-stone-200/90 shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto no-scrollbar space-y-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-stone-200/70">
          <div>
            <h3 className="font-serif text-lg font-medium text-stone-900 leading-tight">
              Refine Menu Selections
            </h3>
            <span className="text-[11px] text-stone-500 font-normal">
              {totalActive > 0 ? `${totalActive} active filters` : 'Filter by dietary, spice, or portion'}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-stone-200/80 text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dietary Section */}
        <div className="space-y-2">
          <span className="text-[11px] uppercase tracking-[0.18em] font-semibold text-stone-800 block">
            Dietary Preferences
          </span>
          <div className="flex flex-wrap gap-2">
            {dietaryOptions.map((tag) => {
              const active = filters.dietary.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => toggleDietary(tag)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer flex items-center space-x-1.5 ${
                    active
                      ? 'bg-stone-950 text-[#FAF8F5] border-stone-950 shadow-2xs'
                      : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  {active && <Check className="w-3.5 h-3.5 text-[#E0CDA9]" />}
                  <span>{tag}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Spice Level Section */}
        <div className="space-y-2">
          <span className="text-[11px] uppercase tracking-[0.18em] font-semibold text-stone-800 block">
            Spice Level
          </span>
          <div className="grid grid-cols-2 gap-2">
            {spiceOptions.map((opt) => {
              const active = filters.spiceLevels.includes(opt.level);
              return (
                <button
                  key={opt.level}
                  onClick={() => toggleSpice(opt.level)}
                  className={`p-3 rounded-xl text-xs font-medium border transition-colors cursor-pointer text-left flex items-center justify-between ${
                    active
                      ? 'bg-stone-950 text-[#FAF8F5] border-stone-950 shadow-2xs'
                      : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <span>{opt.label}</span>
                  {active && <Check className="w-3.5 h-3.5 text-[#E0CDA9]" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Richness Section */}
        <div className="space-y-2">
          <span className="text-[11px] uppercase tracking-[0.18em] font-semibold text-stone-800 block">
            Body & Richness
          </span>
          <div className="flex gap-2">
            {richnessOptions.map((r) => {
              const active = filters.richness.includes(r);
              return (
                <button
                  key={r}
                  onClick={() => toggleRichness(r)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer text-center ${
                    active
                      ? 'bg-stone-950 text-[#FAF8F5] border-stone-950 shadow-2xs'
                      : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  {r}
                </button>
              );
            })}
          </div>
        </div>

        {/* Portion Section */}
        <div className="space-y-2">
          <span className="text-[11px] uppercase tracking-[0.18em] font-semibold text-stone-800 block">
            Portion Size
          </span>
          <div className="flex gap-2">
            {portionOptions.map((p) => {
              const active = filters.portion.includes(p);
              return (
                <button
                  key={p}
                  onClick={() => togglePortion(p)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer text-center ${
                    active
                      ? 'bg-stone-950 text-[#FAF8F5] border-stone-950 shadow-2xs'
                      : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions Footer */}
        <div className="pt-3 border-t border-stone-200 flex items-center justify-between">
          <button
            onClick={onResetFilters}
            className="inline-flex items-center space-x-1.5 text-xs font-medium text-stone-500 hover:text-stone-900 cursor-pointer p-1.5 rounded-lg hover:bg-stone-100"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All</span>
          </button>

          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-stone-950 hover:bg-stone-800 text-stone-50 text-xs font-medium tracking-wider uppercase transition-all active:scale-[0.98] cursor-pointer shadow-xs"
          >
            Apply ({totalActive})
          </button>
        </div>
      </motion.div>
    </div>
  );
};

