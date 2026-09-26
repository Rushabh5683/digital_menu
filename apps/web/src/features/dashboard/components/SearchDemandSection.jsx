import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { formatNumber, formatRate } from '../lib/format.js';

const LIST_TOP_LIMIT = 3;
const FILTER_TOP_LIMIT = 3;

function SearchRow({ query, count, uniqueSessions, badge = null }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="font-medium capitalize text-[var(--ink)]">{query}</span>
        {badge}
      </div>
      <span className="shrink-0 text-right text-sm text-[var(--muted)]">
        <span className="font-semibold text-[var(--teal)]">
          {formatNumber(count)} search{count === 1 ? '' : 'es'}
        </span>
        {uniqueSessions != null ? (
          <span className="block text-xs">
            · {formatNumber(uniqueSessions)} session{uniqueSessions === 1 ? '' : 's'}
          </span>
        ) : null}
      </span>
    </li>
  );
}

function ExpandableList({
  items,
  limit = LIST_TOP_LIMIT,
  renderItem,
  moreLabel,
  tone = 'teal',
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = items.slice(0, limit);
  const rest = items.slice(limit);

  if (items.length === 0) return null;

  const toggleClass =
    tone === 'amber'
      ? 'text-amber-800 hover:underline'
      : 'text-[var(--teal)] hover:underline';

  return (
    <>
      <ul className="mt-3 space-y-2">
        {visible.map((item, index) => renderItem(item, index))}
        {expanded
          ? rest.map((item, index) => renderItem(item, limit + index))
          : null}
      </ul>
      {rest.length > 0 ? (
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className={`mt-3 inline-flex items-center gap-1.5 text-sm font-semibold ${toggleClass}`}
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          {expanded
            ? 'Show less'
            : moreLabel?.(rest.length) ||
              `Show ${formatNumber(rest.length)} more`}
        </button>
      ) : null}
    </>
  );
}

export function SearchDemandSection({
  searchDemandReport = null,
  filterDemand = [],
}) {
  const [showOther, setShowOther] = useState(false);

  const summary = searchDemandReport?.summary ?? null;
  const topSearches = searchDemandReport?.topSearches ?? [];
  const zeroResultSearches = searchDemandReport?.zeroResultSearches ?? [];
  const otherSearches = searchDemandReport?.otherSearches ?? [];
  const otherCount = searchDemandReport?.otherCount ?? 0;
  const topFilters = filterDemand.slice(0, FILTER_TOP_LIMIT);
  const moreFilters = filterDemand.slice(FILTER_TOP_LIMIT);
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  const hasSearchActivity = (summary?.totalSearches ?? 0) > 0;
  const hasFilters = filterDemand.length > 0;
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
            Repeated terms only (2+ searches or 2+ sessions).
          </p>
          <ExpandableList
            items={topSearches}
            moreLabel={(n) =>
              `Show ${formatNumber(n)} more search${n === 1 ? '' : 'es'}`
            }
            renderItem={(row) => (
              <SearchRow
                key={row.query}
                query={row.query}
                count={row.count}
                uniqueSessions={row.uniqueSessions}
                badge={
                  row.hasZeroResults ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                      Some zero results
                    </span>
                  ) : null
                }
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
          </p>
          <ExpandableList
            items={zeroResultSearches}
            tone="amber"
            moreLabel={(n) =>
              `Show ${formatNumber(n)} more unmet term${n === 1 ? '' : 's'}`
            }
            renderItem={(row) => (
              <li
                key={row.query}
                className="flex items-center justify-between gap-3 rounded-xl border border-amber-200/80 bg-amber-50/60 px-4 py-3"
              >
                <span className="font-medium capitalize text-[var(--ink)]">{row.query}</span>
                <span className="shrink-0 text-sm font-semibold text-amber-800">
                  0 dishes matched · {formatNumber(row.zeroResultCount)}×
                </span>
              </li>
            )}
          />
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
            {showOther ? 'Hide' : 'Show'} {formatNumber(otherCount)} other search
            {otherCount === 1 ? '' : 'es'}
            {summary?.uniqueTerms
              ? ` (${formatNumber(summary.uniqueTerms)} unique terms total)`
              : ''}
          </button>
          {showOther ? (
            <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
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
          ) : null}
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
          <ul className="mt-3 space-y-2">
            {topFilters.map((row) => (
              <li
                key={row.filterId}
                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-2.5"
              >
                <span className="font-medium capitalize text-[var(--ink)]">{row.filterId}</span>
                <span className="text-sm text-[var(--muted)]">
                  {formatNumber(row.count)} use{row.count === 1 ? '' : 's'}
                </span>
              </li>
            ))}
            {showMoreFilters
              ? moreFilters.map((row) => (
                  <li
                    key={row.filterId}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-2.5"
                  >
                    <span className="font-medium capitalize text-[var(--ink)]">{row.filterId}</span>
                    <span className="text-sm text-[var(--muted)]">
                      {formatNumber(row.count)} use{row.count === 1 ? '' : 's'}
                    </span>
                  </li>
                ))
              : null}
          </ul>
          {moreFilters.length > 0 ? (
            <button
              type="button"
              onClick={() => setShowMoreFilters((open) => !open)}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--teal)] hover:underline"
            >
              {showMoreFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {showMoreFilters
                ? 'Show less'
                : `Show ${formatNumber(moreFilters.length)} more filter${moreFilters.length === 1 ? '' : 's'}`}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
