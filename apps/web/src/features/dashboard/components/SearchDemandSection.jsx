import { useState } from 'react';
import { AlertTriangle, ChevronDown, Search } from 'lucide-react';
import { formatNumber, formatRate } from '../lib/format.js';
import { api } from '../../../shared/api/client.js';

const LIST_TOP_LIMIT = 3;
const FILTER_TOP_LIMIT = 3;

function ZeroBadge() {
  return (
    <span className="inline-flex shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase leading-none tracking-wide text-amber-800">
      Zero hits
    </span>
  );
}

/** Compact chip — width follows the term, not the full card. */
function SearchRow({ query, count, uniqueSessions, hasZeroResults = false }) {
  return (
    <li className="w-fit max-w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2 shadow-sm">
      <p className="text-sm font-semibold capitalize text-[var(--ink)]">{query}</p>
      <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1">
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
    <li className="w-fit max-w-full rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-2">
      <p className="text-sm font-semibold capitalize text-[var(--ink)]">{query}</p>
      <p className="mt-1 text-[11px] font-medium text-amber-800">
        0 matched · {formatNumber(zeroResultCount)}×
      </p>
    </li>
  );
}

/** Collapsed-by-default section; summary row stays visible, body opens on click. */
function CollapsedSection({
  title,
  subtitle,
  icon = null,
  tone = 'teal',
  children,
  defaultOpen = false,
}) {
  const panel =
    tone === 'amber'
      ? 'border-amber-200/80 bg-amber-50/40'
      : 'border-[var(--line)] bg-[var(--surface)]';
  const titleTone = tone === 'amber' ? 'text-amber-900' : 'text-[var(--ink)]';

  return (
    <details
      className={`group mt-4 overflow-hidden rounded-xl border ${panel}`}
      open={defaultOpen || undefined}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3.5 py-3 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {icon}
            <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${titleTone}`}>
              {title}
            </p>
          </div>
          {subtitle ? (
            <p className="mt-0.5 truncate text-[11px] text-[var(--muted)]">{subtitle}</p>
          ) : null}
        </div>
        <ChevronDown
          size={18}
          className="shrink-0 text-[var(--muted)] transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="border-t border-inherit px-3.5 py-3">{children}</div>
    </details>
  );
}

/**
 * First `limit` chips visible inside an open section; overflow in a nested dropdown.
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
      : 'border-[var(--line)] bg-white';

  return (
    <div className="space-y-2">
      <ul className="flex flex-wrap gap-2">
        {visible.map((item, index) => renderItem(item, index))}
      </ul>

      {rest.length > 0 ? (
        <details className={`group w-fit max-w-full overflow-hidden rounded-xl border ${panelClass}`}>
          <summary
            className={[
              'flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-semibold',
              summaryClass,
              '[&::-webkit-details-marker]:hidden',
            ].join(' ')}
          >
            <span>
              {moreLabel?.(rest.length) || `Show ${formatNumber(rest.length)} more`}
            </span>
            <ChevronDown
              size={16}
              className="shrink-0 transition-transform group-open:rotate-180"
            />
          </summary>
          <ul className="flex flex-wrap gap-2 border-t border-inherit px-2.5 py-2.5">
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
  restaurantId = null,
  rangeParams = null,
  onCleared = null,
}) {
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState(null);

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

  async function handleClearUnmet() {
    if (!restaurantId || clearing) return;
    const ok = window.confirm(
      'Do you want to clear all unmet demand (zero-result) search terms? This cannot be undone.',
    );
    if (!ok) return;

    setClearError(null);
    setClearing(true);
    try {
      await api.clearAnalyticsZeroResultSearches(restaurantId, rangeParams || {});
      onCleared?.();
    } catch (err) {
      setClearError(err.message || 'Could not clear unmet terms');
    } finally {
      setClearing(false);
    }
  }

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

  const topSearchSubtitle =
    topSearches.length > 0
      ? `${formatNumber(topSearches.length)} term${topSearches.length === 1 ? '' : 's'} · tap to view`
      : null;

  const unmetSubtitle =
    zeroResultSearches.length > 0
      ? `${formatNumber(zeroResultSearches.length)} unmet term${zeroResultSearches.length === 1 ? '' : 's'} · tap to view`
      : null;

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

      {/* Default view: summary KPIs only */}
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

      {/* Detail lists — collapsed by default */}
      {topSearches.length > 0 ? (
        <CollapsedSection title="Top searches" subtitle={topSearchSubtitle}>
          <p className="mb-3 text-[11px] text-[var(--muted)]">
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
        </CollapsedSection>
      ) : null}

      {zeroResultSearches.length > 0 ? (
        <CollapsedSection
          title="Unmet demand (zero results)"
          subtitle={unmetSubtitle}
          tone="amber"
          icon={<AlertTriangle size={14} className="text-amber-600" />}
        >
          <p className="mb-3 text-[11px] text-[var(--muted)]">
            Guests searched but no dishes matched — consider tags, naming, or new items.
          </p>
          <ul className="flex flex-wrap gap-2">
            {zeroResultSearches.map((row) => (
              <ZeroResultRow
                key={row.query}
                query={row.query}
                zeroResultCount={row.zeroResultCount}
              />
            ))}
          </ul>
          {clearError ? (
            <p className="mt-3 text-xs font-medium text-red-600">{clearError}</p>
          ) : null}
          <div className="mt-4 flex justify-end border-t border-amber-200/70 pt-3">
            <button
              type="button"
              disabled={!restaurantId || clearing}
              onClick={handleClearUnmet}
              className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-50 disabled:opacity-60"
            >
              {clearing ? 'Clearing…' : 'Clear'}
            </button>
          </div>
        </CollapsedSection>
      ) : null}

      {otherCount > 0 ? (
        <CollapsedSection
          title="Other searches"
          subtitle={`${formatNumber(otherCount)} one-off term${otherCount === 1 ? '' : 's'} · tap to view`}
        >
          <ul className="flex max-h-64 flex-wrap gap-2 overflow-y-auto">
            {otherSearches.map((row) => (
              <SearchRow
                key={row.query}
                query={row.query}
                count={row.count}
                uniqueSessions={row.uniqueSessions}
              />
            ))}
            {otherCount > otherSearches.length ? (
              <li className="px-1 text-xs text-[var(--muted)]">
                Showing {otherSearches.length} of {formatNumber(otherCount)}.
              </li>
            ) : null}
          </ul>
        </CollapsedSection>
      ) : null}

      {!hasCuratedContent && hasSearchActivity ? (
        <p className="mt-5 text-sm text-[var(--muted)]">
          Searches recorded, but no term repeated enough to highlight yet. Check back after more
          guest activity.
        </p>
      ) : null}

      {hasFilters ? (
        <CollapsedSection
          title="Filter demand"
          subtitle={`${formatNumber(filters.length)} filter${filters.length === 1 ? '' : 's'} · tap to view`}
        >
          <TopThreeWithDropdown
            items={filters}
            limit={FILTER_TOP_LIMIT}
            moreLabel={(n) =>
              `${formatNumber(n)} more filter${n === 1 ? '' : 's'}`
            }
            renderItem={(row) => (
              <li
                key={row.filterId}
                className="w-fit max-w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2 shadow-sm"
              >
                <p className="text-sm font-semibold capitalize text-[var(--ink)]">{row.filterId}</p>
                <p className="mt-1 text-[11px] text-[var(--muted)]">
                  {formatNumber(row.count)} use{row.count === 1 ? '' : 's'}
                </p>
              </li>
            )}
          />
        </CollapsedSection>
      ) : null}
    </section>
  );
}
