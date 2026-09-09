import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowUpRight,
  Building2,
  ClipboardList,
  PauseCircle,
  PlayCircle,
  Users,
} from 'lucide-react';
import { api } from '../../shared/api/client.js';
import { StatusBadge } from '../../shared/ui/StatusBadge.jsx';
import { formatDateTime } from './lib/format.js';

export function SuperAdminHomePage() {
  const dashboardQuery = useQuery({
    queryKey: ['superadmin', 'dashboard'],
    queryFn: () => api.getSuperDashboard(),
  });

  const data = dashboardQuery.data;
  const totals = data?.totals;
  const activity = data?.activity;

  if (dashboardQuery.isLoading) {
    return <DashboardSkeleton />;
  }

  if (dashboardQuery.error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center">
        <p className="font-semibold text-[var(--danger)]">Could not load dashboard</p>
        <p className="mt-2 text-sm text-[var(--muted)]">{dashboardQuery.error.message}</p>
        <button
          type="button"
          onClick={() => dashboardQuery.refetch()}
          className="mt-4 rounded-xl bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 menu-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--teal)]">
            Dashboard
          </p>
          <h2
            className="mt-2 text-3xl tracking-tight text-[var(--ink)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Platform overview
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            Live counts from PostgreSQL — restaurants, sessions, and network activity.
          </p>
        </div>
        <Link
          to="/superadmin/restaurants"
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--ink)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-black"
        >
          Manage restaurants
          <ArrowUpRight size={14} />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          icon={Building2}
          label="Total restaurants"
          value={totals.restaurants}
        />
        <MetricCard
          icon={PlayCircle}
          label="Active restaurants"
          value={totals.activeRestaurants}
          tone="positive"
        />
        <MetricCard
          icon={PauseCircle}
          label="Pending / inactive"
          value={totals.pendingRestaurants + totals.inactiveRestaurants}
          detail={`${totals.pendingRestaurants} pending · ${totals.inactiveRestaurants} inactive`}
        />
        <MetricCard
          icon={ClipboardList}
          label="Orders today"
          value={totals.ordersToday}
          detail="Order module ships in a later phase"
        />
        <MetricCard
          icon={Users}
          label="Total menu sessions"
          value={totals.totalMenuSessions}
          detail={`${totals.sessionsToday} started today`}
        />
        <MetricCard
          icon={Activity}
          label="Platform activity"
          value={totals.eventsToday}
          detail="Analytics events today"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-[var(--line)] bg-white/85 p-5 shadow-[0_18px_40px_-28px_rgba(15,31,28,0.35)] sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-lg text-[var(--ink)]" style={{ fontFamily: 'var(--font-subheading)' }}>
              Recent restaurants
            </h3>
            <Link
              to="/superadmin/restaurants"
              className="text-sm font-semibold text-[var(--teal)] hover:underline"
            >
              View all
            </Link>
          </div>
          {activity.recentRestaurants.length === 0 ? (
            <EmptyBlock text="No restaurants yet. Create the first one from Restaurants." />
          ) : (
            <ul className="space-y-3">
              {activity.recentRestaurants.map((restaurant) => (
                <li
                  key={restaurant.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface-elevated)] px-4 py-3"
                >
                  <div>
                    <p className="font-semibold text-[var(--ink)]">{restaurant.name}</p>
                    <p className="text-xs text-[var(--muted)]">/{restaurant.slug}</p>
                  </div>
                  <StatusBadge status={restaurant.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-[var(--line)] bg-white/85 p-5 shadow-[0_18px_40px_-28px_rgba(15,31,28,0.35)] sm:p-6">
          <h3 className="mb-4 text-lg text-[var(--ink)]" style={{ fontFamily: 'var(--font-subheading)' }}>
            Recent menu sessions
          </h3>
          {activity.recentSessions.length === 0 ? (
            <EmptyBlock text="No customer sessions yet. Browse a live menu to generate activity." />
          ) : (
            <ul className="space-y-3">
              {activity.recentSessions.map((session) => (
                <li
                  key={session.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface-elevated)] px-4 py-3"
                >
                  <div>
                    <p className="font-semibold text-[var(--ink)]">
                      {session.restaurantName || 'Restaurant'}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {session.endedAt ? 'Ended' : 'Open'} · {formatDateTime(session.startedAt)}
                    </p>
                  </div>
                  {session.restaurantSlug ? (
                    <Link
                      to={`/menu/${session.restaurantSlug}`}
                      className="text-xs font-semibold text-[var(--teal)] hover:underline"
                    >
                      Menu
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, detail, tone }) {
  return (
    <article className="rounded-2xl border border-[var(--line)] bg-white/85 p-5 shadow-[0_18px_40px_-28px_rgba(15,31,28,0.35)] transition hover:border-[var(--teal)]/25">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
            {label}
          </p>
          <p
            className={`mt-3 text-3xl font-semibold tracking-tight ${
              tone === 'positive' ? 'text-[var(--teal)]' : 'text-[var(--ink)]'
            }`}
          >
            {value ?? 0}
          </p>
          {detail ? <p className="mt-2 text-xs text-[var(--muted)]">{detail}</p> : null}
        </div>
        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-elevated)] p-2.5 text-[var(--teal)]">
          <Icon size={18} />
        </div>
      </div>
    </article>
  );
}

function EmptyBlock({ text }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--line)] px-4 py-10 text-center text-sm text-[var(--muted)]">
      {text}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-16 w-80 animate-pulse rounded-xl bg-black/5" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-32 animate-pulse rounded-2xl bg-black/5" />
        ))}
      </div>
    </div>
  );
}
