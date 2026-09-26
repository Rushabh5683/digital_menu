import { useState } from 'react';
import { AlertTriangle, ChevronDown, Search } from 'lucide-react';
import { formatNumber, formatRate } from '../lib/format.js';

const LIST_TOP_LIMIT = 3;
const FILTER_TOP_LIMIT = 3;

function ZeroBadge({ label = 'Some zero results' }) {
  return (
    <span className="inline-flex max-w-full rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase leading-none tracking-wide text-amber-800">
      {label}
    </span>
  );
}

/** Term on top; badge + counts stacked underneath (not a wide side badge). */
function SearchRow({ query, count, uniqueSessions, hasZeroResults = false }) {
  return (
    <li className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3.5 py-2.5">
      <p className="truncate text-sm font-semibold capitalize text-[var(--ink)]">{query}</p>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
        <p className="text-[11px] text-[var(--muted)]">
          <span className="font-semibold text-[var(--teal)]">
            {formatNumber(count)} search{count === 1 ? '' : 'es'}
          </span>
          {uniqueSessions != null ? (
            <span>
              {' '}
              · {formatNumber(uniqueSessions)} session{uniqueSessions === 1 ? '' : 's'}
            </span>
          ) : null}
        </p>
        {hasZeroResults ? <ZeroBadge /> : null}
      </div>
    </li>
  );
}

function ZeroResultRow({ query, zeroResultCount }) {
  return (
    <li className="rounded-xl border border-amber-200/80 bg-amber-50/60 px-3.5 py-2.5">
      <p className="truncate text-sm font-semibold capitalize text-[var(--ink)]">{query}</p>
      <p className="mt-1 text-[11px] font-medium text-amber-800">
        0 dishes matched · {formatNumber(zeroResultCount)}×
      </p>
    </li>
  );
}

/**
 * Always show the first `limit` items. Anything else sits in a native
 * details/summary dropdown so the control is obvious even on mobile.
 */
function TopThreeWithDropdown({
  items,
  limit = LIST_TOP_LIMIT,
  renderItem,
  moreLabel,
  tone = 'teal',
}) {
  if (!items.length) return null;

  const visible = items.slice(0, limit);
  const rest = items.slice(limit);
  const summaryClass =
    tone === 'amber'
      ? 'text-amber-800 hover:bg-amber-50'
      : 'text-[var(--teal)] hover:bg-[var(--teal)]/5';
  const panelClass =
    tone === 'amber'
      ? 'border-amber-200/70 bg-amber-50/40'
      : 'border-[var(--line)] bg-[var(--surface)]';

  return (
    <div className="mt-3 space-y-2">
      <ul className="space-y-2">{visible.map((item, index) => renderItem(item, index))}</ul>

      {rest.length > 0 ? (
        <details className={`group overflow-hidden rounded-xl border ${panelClass}`}>
          <summary
            className={[
              'flex cursor-pointer list-none items-center justify-between gap-2 px-3.5 py-2.5 text-sm font-semibold',
              summaryClass,
              '[&::-webkit-details-marker]:hidden',
            ].join(' ')}
          >
            <span>
              {moreLabel?.(rest.length) ||
                `Show ${formatNumber(rest.length)} more`}
            </span>
            <ChevronDown
              size={16}
              className="shrink-0 transition-transform group-open:rotate-180"
            />
          </summary>
          <ul className="space-y-2 border-t border-inherit px-2.5 py-2.5">
            {rest.map((item, index) => renderItem(item, limit + index))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

export function SearchDemandSection({
  searchDemandReport = null,
  filterDemand = [],
}) {
  const summary = searchDemandReport?.summary ?? null;
  const topSearches = searchDemandReport?.topSearches ?? [];
  const zeroResultSearches = searchDemandReport?.zeroResultSearches ?? [];
  const otherSearches = searchDemandReport?.otherSearches ?? [];
  const otherCount = searchDemandReport?.otherCount ?? 0;
  const filters = filterDemand || [];

  const hasSearchActivity = (summary?.totalSearches ?? 0) > 0;
  const hasFilters = filters.length > 0;
  const hasCuratedContent =
    topSearches.length > 0 || zeroResultSearches.length > 0 || otherCount > 0;

  if (!hasSearchActivity && !hasFilters) {
    return (
      <section className="rounded-[1.5rem] border border-[var(--line)] bg-white/90 p-6 shadow-[0_22px_50px_-34px_rgba(15,31,28,0.5)]">
        <h2 className="text-lg font-semibold text-[var(--ink)]">What are customers looking for?</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          No search or filter activity recorded in this range yet.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-[1.5rem] border border-[var(--line)] bg-white/90 p-6 shadow-[0_22px_50px_-34px_rgba(15,31,28,0.5)]">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-[var(--teal)]/10 p-2.5 text-[var(--teal)]">
          <Search size={18} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[var(--ink)]">What are customers looking for?</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Top demand signals and menu gaps — not a raw search log.
          </p>
        </div>
      </div>

      {summary && hasSearchActivity ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
              Searches
            </p>
            <p className="mt-1 text-xl font-semibold text-[var(--ink)]">
              {formatNumber(summary.totalSearches)}
            </p>
            <p className="text-xs text-[var(--muted)]">
              across {formatNumber(summary.searchSessions)} session
              {summary.searchSessions === 1 ? '' : 's'}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
              Top term
            </p>
            {summary.topTerm ? (
              <>
                <p className="mt-1 text-xl font-semibold capitalize text-[var(--ink)]">
                  {summary.topTerm.query}
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {formatNumber(summary.topTerm.count)} searches
                  {summary.topTerm.sharePercent != null
                    ? ` · ${summary.topTerm.sharePercent}% of searches`
                    : ''}
                </p>
              </>
            ) : (
              <p className="mt-1 text-sm text-[var(--muted)]">—</p>
            )}
          </div>
          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
              Zero-result rate
            </p>
            <p className="mt-1 text-xl font-semibold text-[var(--ink)]">
              {summary.zeroResultRate != null ? formatRate(summary.zeroResultRate) : '—'}
            </p>
            <p className="text-xs text-[var(--muted)]">
              {formatNumber(summary.zeroResultSearches)} search
              {summary.zeroResultSearches === 1 ? '' : 'es'} found nothing
            </p>
          </div>
        </div>
      ) : null}

      {topSearches.length > 0 ? (
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
            Top searches
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Repeated terms only (2+ searches or 2+ sessions). Showing top {LIST_TOP_LIMIT}.
          </p>
          <TopThreeWithDropdown
            items={topSearches}
            moreLabel={(n) =>
              `${formatNumber(n)} more search${n === 1 ? '' : 'es'}`
            }
            renderItem={(row) => (
              <SearchRow
                key={row.query}
                query={row.query}
                count={row.count}
                uniqueSessions={row.uniqueSessions}
                hasZeroResults={Boolean(row.hasZeroResults)}
              />
            )}
          />
        </div>
      ) : null}

      {zeroResultSearches.length > 0 ? (
        <div className={topSearches.length > 0 ? 'mt-6 border-t border-[var(--line)] pt-6' : 'mt-6'}>
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber-600" />
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
              Unmet demand (zero results)
            </p>
          </div>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Guests searched but no dishes matched — consider tags, naming, or new items.
            Showing top {LIST_TOP_LIMIT}.
          </p>
          <TopThreeWithDropdown
            items={zeroResultSearches}
            tone="amber"
            moreLabel={(n) =>
              `${formatNumber(n)} more unmet term${n === 1 ? '' : 's'}`
            }
            renderItem={(row) => (
              <ZeroResultRow
                key={row.query}
                query={row.query}
                zeroResultCount={row.zeroResultCount}
              />
            )}
          />
        </div>
      ) : null}

      {otherCount > 0 ? (
        <div className="mt-6 border-t border-[var(--line)] pt-4">
          <details className="group overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3.5 py-2.5 text-sm font-semibold text-[var(--teal)] hover:bg-[var(--teal)]/5 [&::-webkit-details-marker]:hidden">
              <span>
                {formatNumber(otherCount)} other search{otherCount === 1 ? '' : 'es'}
                {summary?.uniqueTerms
                  ? ` · ${formatNumber(summary.uniqueTerms)} unique terms total`
                  : ''}
              </span>
              <ChevronDown
                size={16}
                className="shrink-0 transition-transform group-open:rotate-180"
              />
            </summary>
            <ul className="max-h-64 space-y-2 overflow-y-auto border-t border-[var(--line)] px-2.5 py-2.5">
              {otherSearches.map((row) => (
                <SearchRow
                  key={row.query}
                  query={row.query}
                  count={row.count}
                  uniqueSessions={row.uniqueSessions}
                />
              ))}
              {otherCount > otherSearches.length ? (
                <li className="px-2 text-xs text-[var(--muted)]">
                  Showing {otherSearches.length} of {formatNumber(otherCount)} one-off searches.
                </li>
              ) : null}
            </ul>
          </details>
        </div>
      ) : null}

      {!hasCuratedContent && hasSearchActivity ? (
        <p className="mt-5 text-sm text-[var(--muted)]">
          Searches recorded, but no term repeated enough to highlight yet. Check back after more
          guest activity.
        </p>
      ) : null}

      {hasFilters ? (
        <div
          className={
            hasCuratedContent || (summary && hasSearchActivity)
              ? 'mt-6 border-t border-[var(--line)] pt-6'
              : 'mt-5'
          }
        >
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
            Filter demand
          </p>
          <TopThreeWithDropdown
            items={filters}
            limit={FILTER_TOP_LIMIT}
            moreLabel={(n) =>
              `${formatNumber(n)} more filter${n === 1 ? '' : 's'}`
            }
            renderItem={(row) => (
              <li
                key={row.filterId}
                className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3.5 py-2.5"
              >
                <p className="text-sm font-semibold capitalize text-[var(--ink)]">{row.filterId}</p>
                <p className="mt-1 text-[11px] text-[var(--muted)]">
                  {formatNumber(row.count)} use{row.count === 1 ? '' : 's'}
                </p>
              </li>
            )}
          />
        </div>
      ) : null}
    </section>
  );
}
