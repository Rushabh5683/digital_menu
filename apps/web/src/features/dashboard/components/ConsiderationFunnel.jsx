import { ArrowRight } from 'lucide-react';
import { formatNumber, formatRate } from '../lib/format.js';

const STAGE_TONES = {
  attention: {
    bar: 'from-[#c9a227]/90 to-[#c9a227]/40',
    ring: 'border-[var(--accent)]/40',
    chip: 'bg-[var(--accent)]/15 text-[var(--accent-deep)]',
  },
  consideration: {
    bar: 'from-[var(--teal)]/80 to-[var(--teal)]/35',
    ring: 'border-[var(--teal)]/30',
    chip: 'bg-[var(--teal)]/10 text-[var(--teal)]',
  },
  selection: {
    bar: 'from-[#1f4a45]/85 to-[#1f4a45]/35',
    ring: 'border-[var(--ink)]/20',
    chip: 'bg-[var(--ink)]/5 text-[var(--ink)]',
  },
  order: {
    bar: 'from-emerald-600/85 to-emerald-500/35',
    ring: 'border-emerald-500/30',
    chip: 'bg-emerald-500/10 text-emerald-800',
  },
};

export function ConsiderationFunnel({ funnel, orderSummary }) {
  const stages = funnel?.stages || [];
  const conversions = funnel?.conversions || {};
  const maxCount = Math.max(...stages.map((stage) => stage.count || 0), 1);

  if (stages.length === 0) return null;

  const conversionPairs = [
    { key: 'attentionToConsideration', label: 'Attention → Consideration', value: conversions.attentionToConsideration },
    { key: 'considerationToSelection', label: 'Consideration → Selection', value: conversions.considerationToSelection },
    { key: 'selectionToOrder', label: 'Selection → Order', value: conversions.selectionToOrder },
    { key: 'attentionToOrder', label: 'Attention → Order', value: conversions.attentionToOrder },
  ];

  return (
    <section className="min-w-0 overflow-hidden rounded-[1.5rem] border border-[var(--line)] bg-white/90 shadow-[0_22px_50px_-34px_rgba(15,31,28,0.5)]">
      <div
        className="border-b border-[var(--line)] px-5 py-5 sm:px-6"
        style={{
          backgroundImage:
            'linear-gradient(135deg, rgba(31,74,69,0.06), transparent 55%), linear-gradient(225deg, rgba(201,162,39,0.1), transparent 40%)',
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--teal)]">
          Guest journey
        </p>
        <h2
          className="mt-1 text-2xl text-[var(--ink)] sm:text-3xl"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Attention → Consideration → Selection → Order
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">
          How browsing interest turns into real table orders — built from live attention events and
          PostgreSQL order tickets, not estimates.
        </p>
        {orderSummary ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-[var(--line)] bg-white px-3 py-1 text-xs font-semibold text-[var(--ink)]">
              {formatNumber(orderSummary.orderCount)} orders
            </span>
            <span className="rounded-full border border-[var(--line)] bg-white px-3 py-1 text-xs font-semibold text-[var(--ink)]">
              {formatNumber(orderSummary.unitsSold)} units sold
            </span>
          </div>
        ) : null}
      </div>

      <div className="grid min-w-0 gap-0 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)]">
        <div className="min-w-0 space-y-4 p-5 sm:p-6">
          {stages.map((stage, index) => {
            const tone = STAGE_TONES[stage.key] || STAGE_TONES.attention;
            const width = Math.max(8, Math.round(((stage.count || 0) / maxCount) * 100));
            return (
              <div key={stage.key} className="menu-fade-up" style={{ animationDelay: `${index * 70}ms` }}>
                <div className="mb-2 flex items-end justify-between gap-3">
                  <div>
                    <p className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em] ${tone.chip}`}>
                      {stage.label}
                    </p>
                    <p className="mt-1 text-sm text-[var(--muted)]">{stage.description}</p>
                  </div>
                  <p
                    className="text-2xl font-semibold text-[var(--ink)]"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {formatNumber(stage.count)}
                  </p>
                </div>
                <div className={`h-3 overflow-hidden rounded-full border bg-[var(--surface)] ${tone.ring}`}>
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${tone.bar} transition-all duration-700`}
                    style={{ width: `${width}%` }}
                  />
                </div>
                {index < stages.length - 1 ? (
                  <div className="mt-3 flex justify-center text-[var(--muted)]">
                    <ArrowRight size={14} />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="min-w-0 border-t border-[var(--line)] bg-[var(--surface)]/70 p-5 sm:border-l sm:border-t-0 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
            Conversion
          </p>
          <h3
            className="mt-1 text-xl text-[var(--ink)]"
            style={{ fontFamily: 'var(--font-subheading)' }}
          >
            Where interest drops off
          </h3>
          <ul className="mt-4 space-y-3">
            {conversionPairs.map((pair) => (
              <li
                key={pair.key}
                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-white px-3 py-3"
              >
                <span className="text-sm text-[var(--ink-soft)]">{pair.label}</span>
                <span className="text-sm font-bold text-[var(--ink)]">{formatRate(pair.value)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
