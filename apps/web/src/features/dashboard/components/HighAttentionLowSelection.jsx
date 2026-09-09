import { AlertTriangle } from 'lucide-react';
import { formatRate, formatSeconds } from '../lib/format.js';

export function HighAttentionLowSelection({ dishes }) {
  return (
    <section className="rounded-2xl border border-[var(--line)] bg-white/85 p-5 shadow-[0_18px_40px_-28px_rgba(15,31,28,0.45)] sm:p-6">
      <div className="mb-4 flex items-start gap-3">
        <div className="rounded-xl bg-[var(--accent)]/20 p-2 text-[var(--accent-deep)]">
          <AlertTriangle size={18} />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-deep)]">
            Opportunity
          </p>
          <h2 className="mt-1 text-2xl text-[var(--ink)]" style={{ fontFamily: 'var(--font-display)' }}>
            High attention / low selection
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Guests linger on these dishes but select them less often than peers.
          </p>
        </div>
      </div>

      {dishes.length === 0 ? (
        <div className="rounded-xl bg-[var(--surface)] px-4 py-8 text-center text-sm text-[var(--muted)]">
          No high-attention / low-selection gaps in this range.
        </div>
      ) : (
        <ul className="space-y-3">
          {dishes.map((dish) => (
            <li
              key={dish.dishId}
              className="rounded-xl border border-[var(--line)] bg-[var(--surface-elevated)] px-4 py-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-[var(--ink)]">{dish.name}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">{dish.reason}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-semibold text-[var(--teal)]">
                    {formatSeconds(dish.averageAttentionSeconds)} avg
                  </p>
                  <p className="text-[var(--muted)]">{formatRate(dish.selectionRate)} selected</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
