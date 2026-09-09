import { formatNumber, formatRate, formatSeconds } from '../lib/format.js';

export function DishAttentionTable({ dishes }) {
  const rows = [...dishes]
    .filter(
      (dish) =>
        dish.totalViews > 0 ||
        dish.totalAttentionSeconds > 0 ||
        dish.selectionCount > 0 ||
        (dish.orderedQuantity || 0) > 0,
    )
    .sort(
      (a, b) =>
        (b.orderedQuantity || 0) - (a.orderedQuantity || 0) ||
        b.averageAttentionSeconds - a.averageAttentionSeconds ||
        b.totalViews - a.totalViews,
    )
    .slice(0, 12);

  return (
    <section className="rounded-2xl border border-[var(--line)] bg-white/85 p-5 shadow-[0_18px_40px_-28px_rgba(15,31,28,0.45)] sm:p-6">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--teal)]">Dishes</p>
        <h2 className="mt-1 text-2xl text-[var(--ink)]" style={{ fontFamily: 'var(--font-display)' }}>
          Attention → Order
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Views, attention, selections, and actual ordered quantity from live tickets.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] text-xs uppercase tracking-wide text-[var(--muted)]">
              <th className="py-3 pr-3 font-semibold">Dish</th>
              <th className="py-3 pr-3 font-semibold">Views</th>
              <th className="py-3 pr-3 font-semibold">Avg Attention</th>
              <th className="py-3 pr-3 font-semibold">Selections</th>
              <th className="py-3 pr-3 font-semibold">Sel. Rate</th>
              <th className="py-3 pr-3 font-semibold">Ordered</th>
              <th className="py-3 font-semibold">Order Rate</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[var(--muted)]">
                  No dish attention or orders yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.dishId} className="border-b border-[var(--line)]/70 last:border-0">
                  <td className="py-3 pr-3">
                    <p className="font-semibold text-[var(--ink)]">{row.name}</p>
                    {row.categoryName ? (
                      <p className="text-xs text-[var(--muted)]">{row.categoryName}</p>
                    ) : null}
                  </td>
                  <td className="py-3 pr-3 text-[var(--ink-soft)]">{formatNumber(row.totalViews)}</td>
                  <td className="py-3 pr-3 text-[var(--ink-soft)]">
                    {formatSeconds(row.averageAttentionSeconds)}
                  </td>
                  <td className="py-3 pr-3 text-[var(--ink-soft)]">
                    {formatNumber(row.selectionCount)}
                  </td>
                  <td className="py-3 pr-3 text-[var(--ink-soft)]">{formatRate(row.selectionRate)}</td>
                  <td className="py-3 pr-3 font-semibold text-[var(--ink)]">
                    {formatNumber(row.orderedQuantity || 0)}
                  </td>
                  <td className="py-3 text-[var(--ink-soft)]">{formatRate(row.orderRate)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
