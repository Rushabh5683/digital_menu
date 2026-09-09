import { Info } from 'lucide-react';
import { formatNumber } from '../lib/format.js';

const HIDDEN_INFO_SECTIONS = new Set(['dietary', 'ingredients']);

function labelSection(section) {
  const labels = {
    description: 'Description',
    spice: 'Spice level',
    similar: 'Similar dishes',
    details: 'Dish details',
  };
  return labels[section] || section.replace(/_/g, ' ');
}

export function InformationDemandSection({ informationMetrics }) {
  const metrics = informationMetrics || {};
  const topSections = (metrics.topSections || []).filter(
    (row) => !HIDDEN_INFO_SECTIONS.has(row.section),
  );
  const topDishes = metrics.topDishes || [];

  if (!metrics.totalInfoViews) {
    return (
      <section className="rounded-[1.5rem] border border-[var(--line)] bg-white/90 p-6 shadow-[0_22px_50px_-34px_rgba(15,31,28,0.5)]">
        <h2 className="text-lg font-semibold text-[var(--ink)]">Information customers seek</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          No dish detail opens recorded in this range yet.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-[1.5rem] border border-[var(--line)] bg-white/90 p-6 shadow-[0_22px_50px_-34px_rgba(15,31,28,0.5)]">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-[var(--accent)]/15 p-2.5 text-[var(--accent-deep)]">
          <Info size={18} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[var(--ink)]">Information customers seek</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {formatNumber(metrics.totalInfoViews)} detail view
            {metrics.totalInfoViews === 1 ? '' : 's'} — what guests checked before deciding.
          </p>
        </div>
      </div>

      {topSections.length > 0 ? (
        <ul className="mt-5 space-y-2">
          {topSections.slice(0, 6).map((row) => (
            <li
              key={row.section}
              className="flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3"
            >
              <span className="font-medium text-[var(--ink)]">{labelSection(row.section)}</span>
              <span className="text-sm font-semibold text-[var(--muted)]">
                {formatNumber(row.count)}×
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {topDishes.length > 0 ? (
        <div className="mt-5 border-t border-[var(--line)] pt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
            Most opened dishes
          </p>
          <ul className="mt-2 space-y-1.5">
            {topDishes.slice(0, 5).map((row) => (
              <li key={row.dishId} className="flex justify-between text-sm">
                <span className="text-[var(--ink)]">{row.name}</span>
                <span className="text-[var(--muted)]">{formatNumber(row.count)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
