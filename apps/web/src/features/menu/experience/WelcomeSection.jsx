import React from 'react';
import { HelpCircle } from 'lucide-react';

export function WelcomeSection({
  tableLabel = 'Table',
  tagline,
  subtitle,
  onOpenHelpMeChoose,
}) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const supporting =
    subtitle ||
    tagline ||
    'Browse the menu, search what you want, or get a few quick suggestions.';

  return (
    <section className="border-b border-stone-200/60 px-4 pb-3 pt-5">
      <div className="flex flex-col gap-3">
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-[#9A7B4F] sm:text-[11px] sm:tracking-[0.2em]">
            <span>{getGreeting()}</span>
            <span className="text-stone-300">·</span>
            <span>{tableLabel}</span>
          </div>
          <h2 className="font-serif text-[1.65rem] font-normal leading-[1.15] text-stone-900 sm:text-3xl">
            What are you in the mood for?
          </h2>
          <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-stone-500 sm:text-sm">
            {supporting}
          </p>
        </div>

        <button
          id="welcome-help-choose-btn"
          type="button"
          onClick={onOpenHelpMeChoose}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#9A7B4F] px-4 py-3 text-sm font-medium tracking-wide text-white transition-all active:scale-[0.98] sm:w-auto sm:self-start sm:py-2.5 sm:text-xs"
        >
          <HelpCircle className="h-4 w-4 text-white/95" />
          <span>Help Me Choose</span>
        </button>
      </div>
    </section>
  );
}
