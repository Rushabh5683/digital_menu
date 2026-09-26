import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { AttentionChart } from './components/AttentionChart.jsx';
import { ComparisonSection } from './components/ComparisonSection.jsx';
import { ConversionPanel } from './components/ConversionPanel.jsx';
import { CustomerInsights } from './components/CustomerInsights.jsx';
import {
  DashboardEmptyState,
  DashboardErrorState,
  DashboardLoadingState,
} from './components/DashboardStates.jsx';
import { DateRangeSelector } from './components/DateRangeSelector.jsx';
import { DishAttentionTable } from './components/DishAttentionTable.jsx';
import { GuestJourneySection } from './components/GuestJourneySection.jsx';
import { HighAttentionLowSelection } from './components/HighAttentionLowSelection.jsx';
import { InformationDemandSection } from './components/InformationDemandSection.jsx';
import { OverviewCards } from './components/OverviewCards.jsx';
import { SearchDemandSection } from './components/SearchDemandSection.jsx';
import { useDashboardData } from './hooks/useDashboardData.js';
import { staffMenuPreviewPath } from '../menu/lib/staffPreview.js';

export function DashboardPage({ restaurantSlugOverride, embedded = false } = {}) {
  const { restaurantSlug: routeSlug } = useParams();
  const restaurantSlug = restaurantSlugOverride || routeSlug;
  const [rangePreset, setRangePreset] = useState('all');
  const {
    restaurant,
    overview,
    categories,
    dishes,
    insights,
    highAttentionLowSelection,
    range,
    isLoading,
    isFetching,
    isEmpty,
    error,
    refetch,
  } = useDashboardData(restaurantSlug, rangePreset);

  return (
    <div className={embedded ? 'min-w-0' : 'min-h-screen min-w-0 bg-[var(--surface)]'}>
      <div
        className="border-b border-[var(--line)] bg-[var(--ink)] text-[var(--surface-elevated)]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 15% 20%, rgba(201,162,39,0.22), transparent 35%), radial-gradient(circle at 90% 0%, rgba(244,246,242,0.08), transparent 40%)',
        }}
      >
        <div
          className={
            embedded
              ? 'flex min-w-0 flex-wrap items-end justify-between gap-4 py-6'
              : 'mx-auto flex max-w-[1600px] min-w-0 flex-wrap items-end justify-between gap-4 px-4 py-8 sm:px-6 lg:px-8'
          }
        >
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">
              Guest signals
            </p>
            <h1
              className="mt-2 text-3xl tracking-tight sm:text-4xl"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {restaurant?.name || 'Loading…'}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-white/70 sm:text-base">
              What guests search for, what confuses them, and what they order — from live menu
              activity.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {restaurantSlug ? (
              <Link
                to={staffMenuPreviewPath(restaurantSlug)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
              >
                Open menu
                <ExternalLink size={14} />
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--ink)]"
            >
              <RefreshCw size={14} className={isFetching ? 'animate-spin' : undefined} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div
        className={
          embedded
            ? 'min-w-0 space-y-6 py-6'
            : 'mx-auto max-w-[1600px] min-w-0 space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8'
        }
      >
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--ink)]">What needs attention</p>
            <p className="text-sm text-[var(--muted)]">{range.label}</p>
          </div>
          <DateRangeSelector value={rangePreset} onChange={setRangePreset} />
        </div>

        {isLoading ? <DashboardLoadingState /> : null}

        {!isLoading && error ? (
          <DashboardErrorState message={error.message} onRetry={refetch} />
        ) : null}

        {!isLoading && !error && isEmpty ? (
          <DashboardEmptyState restaurantName={restaurant?.name} />
        ) : null}

        {!isLoading && !error && !isEmpty && overview ? (
          <>
            <OverviewCards overview={overview} />
            <SearchDemandSection
              searchDemandReport={overview.searchDemandReport}
              filterDemand={overview.filterDemand}
              restaurantId={restaurant?.id}
              rangeParams={{
                ...(range.from ? { from: range.from } : {}),
                ...(range.to ? { to: range.to } : {}),
              }}
              onCleared={refetch}
            />
            <div className="grid min-w-0 gap-6 xl:grid-cols-2">
              <InformationDemandSection informationMetrics={overview.informationMetrics} />
              <GuestJourneySection guestJourneyReport={overview.guestJourneyReport} />
            </div>
            <AttentionChart categories={categories} />
            <DishAttentionTable dishes={dishes} />
            <div className="grid min-w-0 gap-6 xl:grid-cols-2">
              <HighAttentionLowSelection dishes={highAttentionLowSelection} />
              <ComparisonSection comparisonReport={overview.comparisonReport} />
            </div>
            <CustomerInsights insights={insights} />
            <ConversionPanel
              funnel={overview.funnel}
              orderSummary={overview.orderSummary}
              dishes={dishes}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
