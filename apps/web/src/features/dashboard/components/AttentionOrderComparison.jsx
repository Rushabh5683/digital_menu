import { formatNumber, formatRate, formatSeconds } from '../lib/format.js';

/**
 * Side-by-side Attention vs Selection vs Order for top dishes.
 */
export function AttentionOrderComparison({ dishes = [] }) {
  const rows = [...dishes]
    .filter(
      (dish) =>
        dish.totalViews > 0 ||
        dish.selectionCount > 0 ||
        (dish.orderedQuantity || 0) > 0 ||
        dish.totalAttentionSeconds > 0,
    )
    .sort(
      (a, b) =>
        (b.orderedQuantity || 0) - (a.orderedQuantity || 0) ||
        b.averageAttentionSeconds - a.averageAttentionSeconds ||
        b.totalViews - a.totalViews,
    )
    .slice(0, 8);

  const maxAttention = Math.max(...rows.map((row) => row.averageAttentionSeconds || 0), 1);
  const maxSelections = Math.max(...rows.map((row) => row.selectionCount || 0), 1);
  const maxOrders = Math.max(...rows.map((row) => row.orderedQuantity || 0), 1);

  return (
    <section className="rounded-2xl border border-[var(--line)] bg-white/85 p-5 shadow-[0_18px_40px_-28px_rgba(15,31,28,0.45)] sm:p-6">
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--teal)]">
          Compare
        </p>
        <h2 className="mt-1 text-2xl text-[var(--ink)]" style={{ fontFamily: 'var(--font-display)' }}>
          Attention vs Selection vs Orders
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Spot dishes guests notice, tap, and actually buy.
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold">
          <span className="inline-flex items-center gap-1.5 text-[var(--accent-deep)]">
            <span className="h-2 w-2 rounded-full bg-[var(--accent)]" /> Attention
          </span>
          <span className="inline-flex items-center gap-1.5 text-[var(--teal)]">
            <span className="h-2 w-2 rounded-full bg-[var(--teal)]" /> Selection
          </span>
          <span className="inline-flex items-center gap-1.5 text-emerald-800">
            <span className="h-2 w-2 rounded-full bg-emerald-600" /> Ordered qty
          </span>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-[var(--muted)]">
          No dish attention or order data in this range yet.
        </p>
      ) : (
        <ul className="space-y-4">
          {rows.map((dish) => (
            <li key={dish.dishId} className="rounded-xl border border-[var(--line)] bg-[var(--surface)]/50 p-3.5">
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="font-semibold text-[var(--ink)]">{dish.name}</p>
                  {dish.categoryName ? (
                    <p className="text-xs text-[var(--muted)]">{dish.categoryName}</p>
                  ) : null}
                </div>
                <p className="text-xs text-[var(--muted)]">
                  {formatNumber(dish.totalViews)} views · {formatRate(dish.selectionRate)} select ·{' '}
                  {formatRate(dish.orderRate)} order
                </p>
              </div>
              <div className="space-y-1.5">
                <MetricBar
                  label={formatSeconds(dish.averageAttentionSeconds)}
                  width={(dish.averageAttentionSeconds / maxAttention) * 100}
                  color="bg-[var(--accent)]"
                />
                <MetricBar
                  label={`${formatNumber(dish.selectionCount)} sel`}
                  width={(dish.selectionCount / maxSelections) * 100}
                  color="bg-[var(--teal)]"
                />
                <MetricBar
                  label={`${formatNumber(dish.orderedQuantity || 0)} ord`}
                  width={((dish.orderedQuantity || 0) / maxOrders) * 100}
                  color="bg-emerald-600"
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function MetricBar({ label, width, color }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-black/[0.05]">
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${Math.max(width > 0 ? 4 : 0, Math.min(100, width))}%` }}
        />
      </div>
      <span className="w-16 shrink-0 text-right text-[11px] font-semibold text-[var(--muted)]">
        {label}
      </span>
    </div>
  );
}
