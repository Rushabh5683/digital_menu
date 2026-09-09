import { useState } from 'react';
import { ArrowLeftRight, ChevronDown, ChevronUp } from 'lucide-react';
import { formatNumber } from '../lib/format.js';

function ComparisonPairRow({ row }) {
  return (
    <li className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3">
      <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[var(--ink)]">
        <span>{row.dishAName}</span>
        <ArrowLeftRight size={14} className="text-[var(--muted)]" />
        <span>{row.dishBName}</span>
      </div>
      <p className="mt-1 text-xs text-[var(--muted)]">
        {formatNumber(row.count)} comparison{row.count === 1 ? '' : 's'} ·{' '}
        {formatNumber(row.uniqueSessions)} session{row.uniqueSessions === 1 ? '' : 's'}
        {row.sharePercent != null ? ` · ${row.sharePercent}% of comparisons` : ''}
      </p>
    </li>
  );
}

export function ComparisonSection({ comparisonReport = null }) {
  const [showOther, setShowOther] = useState(false);

  const summary = comparisonReport?.summary ?? null;
  const topPairs = comparisonReport?.topPairs ?? [];
  const otherPairs = comparisonReport?.otherPairs ?? [];
  const otherCount = comparisonReport?.otherCount ?? 0;
  const hasActivity = (summary?.totalComparisons ?? 0) > 0;

  if (!hasActivity) {
    return (
      <section className="rounded-[1.5rem] border border-[var(--line)] bg-white/90 p-6 shadow-[0_22px_50px_-34px_rgba(15,31,28,0.5)]">
        <h2 className="text-lg font-semibold text-[var(--ink)]">Frequently compared</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Not enough comparison behaviour yet. When guests open multiple dish details while deciding,
          pairs will appear here.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-[1.5rem] border border-[var(--line)] bg-white/90 p-6 shadow-[0_22px_50px_-34px_rgba(15,31,28,0.5)]">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-[var(--teal)]/10 p-2.5 text-[var(--teal)]">
          <ArrowLeftRight size={18} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[var(--ink)]">Frequently compared</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Top dish pairs guests weighed while deciding — not a full comparison log.
          </p>
        </div>
      </div>

      {summary ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
              Comparisons
            </p>
            <p className="mt-1 text-xl font-semibold text-[var(--ink)]">
              {formatNumber(summary.totalComparisons)}
            </p>
            <p className="text-xs text-[var(--muted)]">
              across {formatNumber(summary.comparisonSessions)} session
              {summary.comparisonSessions === 1 ? '' : 's'}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 sm:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
              Most compared pair
            </p>
            {summary.topPair ? (
              <>
                <p className="mt-1 text-sm font-semibold text-[var(--ink)]">
                  {summary.topPair.dishAName}
                  <ArrowLeftRight size={12} className="mx-1.5 inline text-[var(--muted)]" />
                  {summary.topPair.dishBName}
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {formatNumber(summary.topPair.count)} comparisons
                  {summary.topPair.sharePercent != null
                    ? ` · ${summary.topPair.sharePercent}% of all comparisons`
                    : ''}
                </p>
              </>
            ) : (
              <p className="mt-1 text-sm text-[var(--muted)]">—</p>
            )}
          </div>
        </div>
      ) : null}

      {topPairs.length > 0 ? (
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
            Top pairs
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Repeated comparisons only (2+ times or 2+ sessions).
          </p>
          <ul className="mt-3 space-y-3">
            {topPairs.map((row) => (
              <ComparisonPairRow key={`${row.dishAId}-${row.dishBId}`} row={row} />
            ))}
          </ul>
        </div>
      ) : null}

      {otherCount > 0 ? (
        <div className="mt-6 border-t border-[var(--line)] pt-4">
          <button
            type="button"
            onClick={() => setShowOther((open) => !open)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--teal)] hover:underline"
          >
            {showOther ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {showOther ? 'Hide' : 'Show'} {formatNumber(otherCount)} other comparison
            {otherCount === 1 ? '' : 's'}
            {summary?.uniquePairs
              ? ` (${formatNumber(summary.uniquePairs)} unique pairs total)`
              : ''}
          </button>
          {showOther ? (
            <ul className="mt-3 max-h-64 space-y-3 overflow-y-auto">
              {otherPairs.map((row) => (
                <ComparisonPairRow key={`${row.dishAId}-${row.dishBId}`} row={row} />
              ))}
              {otherCount > otherPairs.length ? (
                <li className="px-2 text-xs text-[var(--muted)]">
                  Showing {otherPairs.length} of {formatNumber(otherCount)} other pairs.
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
      ) : null}

      {!topPairs.length && hasActivity ? (
        <p className="mt-5 text-sm text-[var(--muted)]">
          Comparisons recorded, but no pair repeated enough to highlight yet. Check back after more
          guest activity.
        </p>
      ) : null}
    </section>
  );
}
