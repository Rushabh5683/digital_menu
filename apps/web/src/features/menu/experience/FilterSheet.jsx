import React, { useMemo } from 'react';
import { X, RotateCcw, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { DIETARY_TAG_GROUPS } from '../../../shared/constants/dietaryTags.js';
import { useLockBodyScroll } from '../../../shared/lib/useLockBodyScroll.js';
import { useSheetSwipeDismiss } from './useSheetSwipeDismiss.jsx';

const SPICE_TAGS = ['Mild', 'Spicy', 'Hot'];

/** Collect tags that actually appear on this restaurant's live menu. */
export function buildMenuFilterOptions(dishes = []) {
  const present = new Set();
  for (const dish of dishes) {
    for (const tag of dish.dietaryTags || []) {
      const t = String(tag || '').trim();
      if (t) present.add(t);
    }
  }

  const groups = DIETARY_TAG_GROUPS.map((group) => {
    // Spice tags get their own section
    if (group.label === 'Prep & spice') {
      const tags = group.tags.filter((tag) => !SPICE_TAGS.includes(tag) && present.has(tag));
      return { label: group.label, tags };
    }
    return {
      label: group.label,
      tags: group.tags.filter((tag) => present.has(tag)),
    };
  }).filter((group) => group.tags.length > 0);

  const spiceTags = SPICE_TAGS.filter((tag) => present.has(tag));

  // Any legacy/custom tags on dishes that aren't in presets
  const presetSet = new Set(DIETARY_TAG_GROUPS.flatMap((g) => g.tags));
  const extraTags = [...present].filter((tag) => !presetSet.has(tag)).sort();

  return { groups, spiceTags, extraTags };
}

export function FilterSheet({
  isOpen,
  filters,
  dishes = [],
  onClose,
  onUpdateFilters,
  onResetFilters,
}) {
  const menuOptions = useMemo(() => buildMenuFilterOptions(dishes), [dishes]);
  useLockBodyScroll(isOpen);
  const swipe = useSheetSwipeDismiss(onClose, { enabled: isOpen });

  if (!isOpen) return null;

  const toggleDietary = (tag) => {
    const next = filters.dietary.includes(tag)
      ? filters.dietary.filter((t) => t !== tag)
      : [...filters.dietary, tag];
    onUpdateFilters({ ...filters, dietary: next });
  };

  const toggleSpice = (tag) => {
    const current = filters.spiceLevels || [];
    const next = current.includes(tag)
      ? current.filter((l) => l !== tag)
      : [...current, tag];
    onUpdateFilters({ ...filters, spiceLevels: next });
  };

  const totalActive =
    (filters.dietary?.length || 0) +
    (filters.spiceLevels?.length || 0) +
    (filters.richness?.length || 0) +
    (filters.portion?.length || 0);

  const hasAnyOptions =
    menuOptions.groups.length > 0 ||
    menuOptions.spiceTags.length > 0 ||
    menuOptions.extraTags.length > 0;

  return (
    <div
      className="guest-portal fixed inset-x-0 top-0 z-[70] flex justify-center"
      style={{ bottom: 0 }}
    >
      <div className="relative flex h-full w-full max-w-lg flex-col justify-end">
        <button
          type="button"
          className="absolute inset-0 cursor-default bg-stone-900/40"
          aria-label="Close filters"
          onClick={onClose}
          style={swipe.backdropStyle}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 30 }}
          className="relative z-10 flex max-h-[min(88dvh,calc(100dvh-0.75rem))] w-full min-w-0 flex-col overflow-hidden rounded-t-3xl border border-stone-200 bg-[#FAF8F5] shadow-2xl"
          style={swipe.panelStyle}
        >
        <div
          className="flex shrink-0 items-center justify-between gap-2 border-b border-stone-200/70 px-4 py-3.5 sm:px-5"
          {...swipe.handleProps}
        >
          <div className="min-w-0">
            <h3 className="font-serif text-lg font-medium leading-tight text-stone-900">
              Refine menu
            </h3>
            <span className="block truncate text-[11px] font-normal text-stone-500">
              {totalActive > 0
                ? `${totalActive} active · only tags used on this menu`
                : 'Only options used on this menu'}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            onPointerDown={(event) => event.stopPropagation()}
            className="shrink-0 cursor-pointer rounded-full p-2 text-stone-500 transition-colors hover:bg-stone-200/80 hover:text-stone-900"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          ref={swipe.scrollRef}
          className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-4 no-scrollbar sm:px-5"
          {...swipe.scrollProps}
        >
          {!hasAnyOptions ? (
            <p className="text-sm text-stone-500">
              No dietary tags on this menu yet. Add tags in admin to enable filters.
            </p>
          ) : null}

          {menuOptions.groups.map((group) => (
            <div key={group.label} className="space-y-2">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-800">
                {group.label}
              </span>
              <div className="flex flex-wrap gap-2">
                {group.tags.map((tag) => {
                  const active = filters.dietary.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleDietary(tag)}
                      className={`flex cursor-pointer items-center space-x-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                        active
                          ? 'border-stone-950 bg-stone-950 text-[#FAF8F5] shadow-2xs'
                          : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      {active ? <Check className="h-3.5 w-3.5 text-[#E0CDA9]" /> : null}
                      <span>{tag === 'Signature' ? 'Signature Dish' : tag}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {menuOptions.spiceTags.length > 0 ? (
            <div className="space-y-2">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-800">
                Spice
              </span>
              <div className="flex flex-wrap gap-2">
                {menuOptions.spiceTags.map((tag) => {
                  const active = (filters.spiceLevels || []).includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleSpice(tag)}
                      className={`flex cursor-pointer items-center space-x-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                        active
                          ? 'border-stone-950 bg-stone-950 text-[#FAF8F5] shadow-2xs'
                          : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      {active ? <Check className="h-3.5 w-3.5 text-[#E0CDA9]" /> : null}
                      <span>{tag}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {menuOptions.extraTags.length > 0 ? (
            <div className="space-y-2">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-800">
                Other tags on menu
              </span>
              <div className="flex flex-wrap gap-2">
                {menuOptions.extraTags.map((tag) => {
                  const active = filters.dietary.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleDietary(tag)}
                      className={`flex cursor-pointer items-center space-x-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                        active
                          ? 'border-stone-950 bg-stone-950 text-[#FAF8F5] shadow-2xs'
                          : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      {active ? <Check className="h-3.5 w-3.5 text-[#E0CDA9]" /> : null}
                      <span>{tag}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-stone-200 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] sm:px-5">
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex min-h-10 cursor-pointer items-center space-x-1.5 rounded-lg p-1.5 text-xs font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-900"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset All</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="min-h-10 shrink-0 cursor-pointer rounded-full bg-stone-950 px-6 py-2.5 text-xs font-medium uppercase tracking-wider text-stone-50 transition-all hover:bg-stone-800 active:scale-[0.98]"
          >
            Apply ({totalActive})
          </button>
        </div>
        </motion.div>
      </div>
    </div>
  );
}

export const EMPTY_FILTERS = Object.freeze({
  dietary: [],
  spiceLevels: [],
  richness: [],
  portion: [],
});

export function createEmptyFilters() {
  return {
    dietary: [],
    spiceLevels: [],
    richness: [],
    portion: [],
  };
}
