import { Search } from 'lucide-react';

export function MenuLoadingState() {
  return (
    <div className="guest-menu guest-menu--premium min-h-screen" aria-busy="true" aria-live="polite">
      <div className="guest-hero relative overflow-hidden bg-[#090A0C] px-5 pb-16 pt-8">
        <div className="guest-img-fallback absolute inset-0 opacity-40" />
        <div className="relative space-y-4">
          <div className="mt-6 h-16 w-16 animate-pulse rounded-2xl bg-white/10" />
          <div className="h-9 w-2/3 animate-pulse rounded bg-white/15" />
          <div className="h-4 w-4/5 animate-pulse rounded bg-white/10" />
        </div>
      </div>
      <div className="relative z-10 -mt-8 rounded-t-[1.85rem] bg-[#0F1115] px-4 pt-4">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/10" />
        <div className="flex gap-2">
          <div className="guest-skeleton h-12 flex-1 rounded-2xl" />
          <div className="guest-skeleton h-12 w-12 rounded-2xl" />
        </div>
        <div className="mt-3 flex gap-2 overflow-hidden pb-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="guest-skeleton h-10 w-24 shrink-0 rounded-full" />
          ))}
        </div>
        <div className="mt-6 flex gap-3 overflow-hidden">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="guest-skeleton h-56 w-44 shrink-0 rounded-[1.35rem]"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function MenuErrorState({ message, onRetry }) {
  return (
    <div className="guest-menu guest-menu--premium mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#E6C687]">
        Menu unavailable
      </p>
      <h1 className="guest-hero-title mt-3 text-3xl font-bold leading-tight text-white">
        We couldn&apos;t load this menu
      </h1>
      <p className="mt-3 max-w-sm text-[#8E929B]">
        {message || 'Please try again in a moment.'}
      </p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-8 h-12 rounded-2xl bg-gradient-to-tr from-[#D4AF37] to-[#F3E5AB] px-6 text-sm font-bold text-black"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function MenuEmptySearch({ query, onClear, suggestedCategories = [] }) {
  return (
    <div className="mx-auto max-w-lg py-14 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--g-line)] bg-[var(--g-bg-elevated)] text-[var(--g-muted)]">
        <Search size={22} strokeWidth={1.75} aria-hidden />
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--g-accent-deep)]">
        No matches
      </p>
      <h2 className="guest-hero-title mt-3 text-2xl font-semibold text-[var(--g-ink)]">
        Nothing for &ldquo;{query}&rdquo;
      </h2>
      <p className="mt-3 text-sm text-[var(--g-muted)]">
        Try another dish name, browse a section below, or clear your filters.
      </p>

      {suggestedCategories.length > 0 ? (
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {suggestedCategories.slice(0, 5).map((category) => (
            <span
              key={category.id}
              className="rounded-full border border-[var(--g-line)] bg-[var(--g-bg-elevated)] px-3 py-1.5 text-xs font-medium text-[var(--g-ink-soft)]"
            >
              {category.name}
            </span>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        onClick={onClear}
        className="mt-6 h-11 rounded-full border border-[var(--g-accent-deep)]/30 bg-[var(--g-accent-soft)] px-5 text-sm font-semibold text-[var(--g-accent-bright)]"
      >
        Clear search & filters
      </button>
    </div>
  );
}
