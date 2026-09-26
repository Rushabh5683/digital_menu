import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  analyzeMenuForGuidance,
  buildHelpMeChooseSteps,
  answersFromHelpChoice,
  getMenuAwareRecommendations,
  summarizeGuidanceAnswers,
} from './lib/helpMeChoose.js';
import { X, ArrowRight, RotateCcw, ChevronRight, HelpCircle } from 'lucide-react';
import { formatPrice, dishImage } from './lib/formatters.js';
import { useLockBodyScroll } from '../../../shared/lib/useLockBodyScroll.js';
import { useSheetSwipeDismiss, SheetSwipeAffordance } from './useSheetSwipeDismiss.jsx';

export function HelpMeChooseModal({
  isOpen,
  onClose,
  onSelectDish,
  onCompleted,
  dishes = [],
  categories = [],
  popularIds = [],
  restaurantName = 'our restaurant',
  currency = 'INR',
}) {
  const analysis = useMemo(
    () => analyzeMenuForGuidance(dishes, { restaurantName, categories, popularIds }),
    [dishes, categories, popularIds, restaurantName],
  );

  const steps = useMemo(() => buildHelpMeChooseSteps(analysis), [analysis]);
  const currentStep = steps[0];

  const [answers, setAnswers] = useState({});
  const [recommendations, setRecommendations] = useState(null);
  const [showingResults, setShowingResults] = useState(false);

  const resetFlow = useCallback(() => {
    setAnswers({});
    setRecommendations(null);
    setShowingResults(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    resetFlow();
  }, [isOpen, analysis.counts.total, resetFlow]);

  useLockBodyScroll(isOpen);
  const swipe = useSheetSwipeDismiss(onClose, { enabled: isOpen });

  const handleClose = useCallback(() => {
    swipe.cancelGesture?.();
    swipe.hardReset?.();
    onClose?.();
  }, [onClose, swipe.cancelGesture, swipe.hardReset]);

  if (!isOpen) return null;

  const isResults = showingResults;

  function finish(finalAnswers) {
    const recs = getMenuAwareRecommendations(finalAnswers, dishes, analysis, { limit: null });
    setAnswers(finalAnswers);
    setRecommendations(recs);
    setShowingResults(true);
    onCompleted?.({ answers: finalAnswers, recommendations: recs });
  }

  function selectOption(opt) {
    finish(answersFromHelpChoice(opt));
  }

  const answerSummary = summarizeGuidanceAnswers(answers, analysis);

  const resultsTitle = (() => {
    if (!recommendations?.length) return 'No matching dishes right now';
    if (answers.mood === 'vegetarian') {
      return `${recommendations.length} vegetarian dish${recommendations.length === 1 ? '' : 'es'}`;
    }
    if (answers.mood === 'light') {
      return `${recommendations.length} lighter dish${recommendations.length === 1 ? '' : 'es'}`;
    }
    if (answers.mood === 'filling') {
      return `${recommendations.length} filling dish${recommendations.length === 1 ? '' : 'es'}`;
    }
    if (answers.mood === 'explore') {
      return `${recommendations.length} most-ordered pick${recommendations.length === 1 ? '' : 's'}`;
    }
    if (answers.categoryId && analysis.categories) {
      const cat = analysis.categories.find((c) => String(c.id) === String(answers.categoryId));
      if (cat?.name) {
        return `${recommendations.length} dish${recommendations.length === 1 ? '' : 'es'} in ${cat.name}`;
      }
    }
    return `${recommendations.length} dish${recommendations.length === 1 ? '' : 'es'} for you`;
  })();

  return (
    <div className="guest-portal fixed inset-x-0 top-0 z-[70] flex justify-center" style={{ bottom: 0 }}>
      <div className="relative flex h-full w-full max-w-lg flex-col justify-end">
        <button
          type="button"
          ref={swipe.backdropRef}
          className="absolute inset-0 cursor-default bg-stone-900/40"
          aria-label="Close Help Me Choose"
          onClick={handleClose}
          style={swipe.backdropStyle}
        />

        <div
          ref={swipe.panelRef}
          className="relative z-10 flex max-h-[min(88dvh,calc(100dvh-0.75rem))] w-full min-w-0 flex-col overflow-hidden rounded-t-3xl border border-stone-200 bg-[#FAF8F5] shadow-2xl"
          style={swipe.panelStyle}
          {...swipe.surfaceProps}
        >
          <SheetSwipeAffordance {...swipe.handleProps} />
          <div
            className="flex shrink-0 items-center justify-between gap-2 border-b border-stone-200/70 px-4 py-3"
            {...swipe.handleProps}
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#9A7B4F]/15 text-[#9A7B4F]">
                <HelpCircle className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h3 className="truncate font-serif text-base font-medium leading-tight text-stone-900">
                  Help Me Choose
                </h3>
                <span className="block truncate text-[11px] font-normal text-stone-500">
                  {restaurantName}
                </span>
              </div>
            </div>

            <button
              type="button"
              data-swipe-ignore="true"
              onClick={handleClose}
              onPointerDown={(event) => event.stopPropagation()}
              className="shrink-0 cursor-pointer rounded-full p-2 text-stone-500 transition-colors hover:bg-stone-200/80 hover:text-stone-900"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div
            ref={swipe.scrollRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 no-scrollbar"
          >
            {!isResults && analysis.counts.total === 0 ? (
              <div className="space-y-3 py-6 text-center">
                <p className="font-serif text-lg text-stone-900">No dishes available tonight</p>
                <p className="text-xs text-stone-500">
                  Publish menu items for {restaurantName} to unlock guided recommendations.
                </p>
              </div>
            ) : null}

            {!isResults && currentStep ? (
              <div className="space-y-3.5">
                <div>
                  <h4 className="font-serif text-lg font-normal leading-snug text-stone-900 sm:text-xl">
                    {currentStep.title}
                  </h4>
                  <p className="mt-0.5 text-xs leading-relaxed text-stone-500">
                    {currentStep.subtitle}
                  </p>
                </div>

                <div className="space-y-2">
                  {currentStep.options.map((opt) => (
                    <button
                      key={String(opt.id)}
                      id={`help-option-${opt.id}`}
                      type="button"
                      onClick={() => selectOption(opt)}
                      className="flex w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-2xl border border-stone-200/80 bg-white p-3.5 text-left text-stone-800 transition-all active:scale-[0.99] hover:border-[#9A7B4F]/40"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="block truncate font-serif text-sm font-medium text-stone-900">
                          {opt.label}
                        </span>
                        <span className="mt-0.5 block text-[11px] font-normal leading-relaxed text-stone-500">
                          {opt.desc}
                        </span>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-[#9A7B4F]" />
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {isResults && recommendations ? (
              <div className="space-y-4">
                <div>
                  <span className="mb-1 block text-[10px] font-medium uppercase tracking-[0.18em] text-[#9A7B4F]">
                    From {restaurantName}
                  </span>
                  <h4 className="font-serif text-xl font-normal leading-tight text-stone-900">
                    {resultsTitle}
                  </h4>
                  <p className="mt-1 text-xs text-stone-600">
                    From this restaurant&apos;s live menu
                    {answerSummary ? ` · ${answerSummary}` : ''}.
                  </p>
                </div>

                {recommendations.length === 0 ? (
                  <p className="rounded-2xl border border-stone-200 bg-white px-4 py-6 text-center text-sm text-stone-500">
                    No matches in this selection. Try another option.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {recommendations.map(({ dish, explanation }, idx) => (
                      <div
                        key={dish.id}
                        id={`help-rec-${idx}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          handleClose();
                          onSelectDish?.(dish);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            handleClose();
                            onSelectDish?.(dish);
                          }
                        }}
                        className="group flex cursor-pointer items-start gap-3 rounded-2xl border border-stone-200/90 bg-white p-3 transition-all active:scale-[0.99] hover:border-[#9A7B4F]"
                      >
                        {dishImage(dish) ? (
                          <img
                            src={dishImage(dish)}
                            alt={dish.name}
                            referrerPolicy="no-referrer"
                            className="h-14 w-14 shrink-0 rounded-xl object-cover"
                          />
                        ) : (
                          <div className="h-14 w-14 shrink-0 rounded-xl bg-gradient-to-br from-[#E8DFD3] to-[#C5A880]" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h5 className="min-w-0 flex-1 break-words font-serif text-sm font-medium leading-snug text-stone-900 group-hover:text-[#9A7B4F]">
                              {dish.name}
                            </h5>
                            <span className="shrink-0 font-serif text-sm font-semibold text-stone-900">
                              {formatPrice(dish.price, currency)}
                            </span>
                          </div>
                          {dish.categoryName ? (
                            <p className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                              {dish.categoryName}
                            </p>
                          ) : null}
                          {explanation ? (
                            <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-stone-500">
                              {explanation}
                            </p>
                          ) : null}
                          <div className="mt-2 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#9A7B4F]">
                            <span>View dish</span>
                            <ArrowRight className="h-3 w-3" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center justify-between gap-2 border-t border-stone-200/80 bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
            {isResults ? (
              <button
                type="button"
                onClick={resetFlow}
                className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full px-2 py-2 text-xs font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-900"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Start over</span>
              </button>
            ) : (
              <span className="min-w-0 text-[11px] text-stone-400">Tap a section to continue</span>
            )}

            <button
              type="button"
              onClick={handleClose}
              className="min-h-10 shrink-0 cursor-pointer rounded-full bg-stone-950 px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-stone-50 transition-all hover:bg-stone-800 active:scale-[0.98]"
            >
              {isResults ? 'Done' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
