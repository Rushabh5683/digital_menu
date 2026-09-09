export function DashboardLoadingState() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-2xl bg-white/70 ring-1 ring-[var(--line)]" />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-2xl bg-white/70 ring-1 ring-[var(--line)]" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-64 animate-pulse rounded-2xl bg-white/70 ring-1 ring-[var(--line)]" />
        <div className="h-64 animate-pulse rounded-2xl bg-white/70 ring-1 ring-[var(--line)]" />
      </div>
    </div>
  );
}

export function DashboardErrorState({ message, onRetry }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-700">Dashboard error</p>
      <h2 className="mt-2 text-2xl text-[var(--ink)]" style={{ fontFamily: 'var(--font-display)' }}>
        Couldn&apos;t load analytics
      </h2>
      <p className="mt-2 text-[var(--muted)]">{message || 'Please try again.'}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 rounded-full bg-[var(--ink)] px-5 py-2.5 text-sm font-semibold text-white"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}

export function DashboardEmptyState({ restaurantName }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--line)] bg-white/60 px-6 py-14 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--teal)]">No attention yet</p>
      <h2 className="mt-2 text-3xl text-[var(--ink)]" style={{ fontFamily: 'var(--font-display)' }}>
        Customers haven&apos;t explored the menu in this range
      </h2>
      <p className="mx-auto mt-3 max-w-lg text-[var(--muted)]">
        Open the {restaurantName || 'restaurant'} digital menu, browse sections and dishes, then refresh
        this dashboard. Numbers here come only from live PostgreSQL events.
      </p>
    </div>
  );
}
