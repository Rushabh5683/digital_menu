import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowUpRight,
  ClipboardList,
  Grid2x2,
  Layers3,
  QrCode,
  Table2,
  Timer,
  UtensilsCrossed,
  Wallet,
  Activity,
} from 'lucide-react';
import { api } from '../../shared/api/client.js';
import { Alert } from '../../shared/ui/Alert.jsx';
import { Button } from '../../shared/ui/Button.jsx';
import { StatusBadge } from '../../shared/ui/StatusBadge.jsx';

function formatMoney(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatSeconds(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  const seconds = Math.round(Number(value));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return rem === 0 ? `${minutes}m` : `${minutes}m ${rem}s`;
}

function formatTime(value) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: 'short',
    }).format(new Date(value));
  } catch {
    return '—';
  }
}

export function AdminOverviewPage() {
  const dashboardQuery = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => api.getAdminDashboard(),
  });

  if (dashboardQuery.isLoading) {
    return <OverviewSkeleton />;
  }

  if (dashboardQuery.error) {
    return (
      <Alert tone="error">
        <p className="font-semibold">Could not load dashboard</p>
        <p className="mt-1">{dashboardQuery.error.message}</p>
        <Button className="mt-4" onClick={() => dashboardQuery.refetch()}>
          Retry
        </Button>
      </Alert>
    );
  }

  const { restaurant, kpis, recentOrders, attention, insights } = dashboardQuery.data;

  return (
    <div className="min-w-0 space-y-6 menu-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--teal)]">
            Overview
          </p>
          <h2
            className="mt-2 text-3xl tracking-tight text-[var(--ink)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {restaurant.name}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            Live orders, attention, and insights for your dining room — scoped to your restaurant
            only.
          </p>
        </div>
        <StatusBadge status={restaurant.status} />
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={ClipboardList} label="Today's orders" value={kpis.ordersToday} />
        <KpiCard icon={Activity} label="Pending orders" value={kpis.pendingOrders} tone="warning" />
        <KpiCard icon={Wallet} label="Today's revenue" value={formatMoney(kpis.revenueToday)} />
        <KpiCard
          icon={UtensilsCrossed}
          label="Menu sessions"
          value={kpis.menuSessions}
          detail={`${kpis.sessionsToday} started today`}
        />
        <KpiCard
          icon={Timer}
          label="Average attention"
          value={formatSeconds(kpis.averageAttentionSeconds)}
          detail="Top section average"
        />
        <KpiCard
          icon={Layers3}
          label="Top attention section"
          value={kpis.topAttentionSection?.name || '—'}
          detail={
            kpis.topAttentionSection
              ? formatSeconds(kpis.topAttentionSection.averageAttentionSeconds)
              : 'Browse the menu to collect signal'
          }
        />
        <KpiCard
          icon={Grid2x2}
          label="Top dish"
          value={kpis.topDish?.name || '—'}
          detail={
            kpis.topDish
              ? formatSeconds(kpis.topDish.averageAttentionSeconds)
              : 'No dish attention yet'
          }
          className="sm:col-span-2 xl:col-span-1"
        />
      </div>

      <section className="rounded-2xl border border-[var(--line)] bg-white/85 p-5 shadow-[0_18px_40px_-28px_rgba(15,31,28,0.35)]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg text-[var(--ink)]" style={{ fontFamily: 'var(--font-subheading)' }}>
            Quick actions
          </h3>
        </div>
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <QuickAction to="/admin/dishes" icon={Grid2x2} label="Add Dish" />
          <QuickAction to="/admin/categories" icon={Layers3} label="Add Category" />
          <QuickAction to="/admin/tables" icon={Table2} label="Add Table" />
          <QuickAction to="/admin/qr-codes" icon={QrCode} label="Generate QR Codes" />
        </div>
      </section>

      <div className="grid min-w-0 gap-6 xl:grid-cols-2">
        <section className="min-w-0 rounded-2xl border border-[var(--line)] bg-white/85 p-5 shadow-[0_18px_40px_-28px_rgba(15,31,28,0.35)] sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg text-[var(--ink)]" style={{ fontFamily: 'var(--font-subheading)' }}>
              Recent orders
            </h3>
            <Link
              to="/admin/day-end#bills"
              className="text-sm font-semibold text-[var(--teal)] hover:underline"
            >
              View all
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <EmptyBlock
              title="No orders today"
              text="Orders placed today (before day end) will appear here. View all opens today’s bills on Day End."
              action={{ to: '/admin/qr-codes', label: 'Set up QR codes' }}
            />
          ) : (
            <ul className="space-y-3">
              {recentOrders.map((order) => (
                <li
                  key={order.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface-elevated)] px-4 py-3"
                >
                  <div>
                    <p className="font-semibold text-[var(--ink)]">#{order.orderNumber}</p>
                    <p className="text-xs text-[var(--muted)]">{formatTime(order.placedAt)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-semibold text-[var(--ink)]">
                      {formatMoney(order.total)}
                    </p>
                    <StatusBadge status={order.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="min-w-0 rounded-2xl border border-[var(--line)] bg-white/85 p-5 shadow-[0_18px_40px_-28px_rgba(15,31,28,0.35)] sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg text-[var(--ink)]" style={{ fontFamily: 'var(--font-subheading)' }}>
              Customer attention
            </h3>
            <Link
              to="/admin/analytics"
              className="text-sm font-semibold text-[var(--teal)] hover:underline"
            >
              Open analytics
            </Link>
          </div>
          <div className="space-y-3">
            <AttentionRow
              label="Leading section"
              value={attention.highestAttentionCategory?.name}
              meta={formatSeconds(attention.highestAttentionCategory?.averageAttentionSeconds)}
            />
            <AttentionRow
              label="Leading dish"
              value={attention.highestAttentionDish?.name}
              meta={formatSeconds(attention.highestAttentionDish?.averageAttentionSeconds)}
            />
            <AttentionRow
              label="Most selected"
              value={attention.mostSelectedDish?.name}
              meta={
                attention.mostSelectedDish
                  ? `${attention.mostSelectedDish.selectionCount} selections`
                  : null
              }
            />
            <AttentionRow
              label="Avg session"
              value={formatSeconds(attention.averageSessionDurationSeconds)}
              meta={`${attention.totalMenuSessions} sessions`}
            />
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-[var(--line)] bg-[var(--ink)] p-5 text-[var(--surface-elevated)] shadow-[0_18px_40px_-28px_rgba(15,31,28,0.55)] sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg" style={{ fontFamily: 'var(--font-subheading)' }}>
            Insights
          </h3>
          <Link to="/admin/analytics" className="text-sm font-semibold text-[var(--accent)] hover:underline">
            Full report
          </Link>
        </div>
        {insights.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-8 text-center text-sm text-white/70">
            Insights appear after guests browse your digital menu.
          </p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {insights.slice(0, 4).map((insight) => (
              <article
                key={insight.id || insight.type}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-4"
              >
                <p className="text-sm font-semibold text-white">{insight.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-white/70">{insight.description}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, detail, tone, className = '' }) {
  return (
    <article
      className={`rounded-2xl border border-[var(--line)] bg-white/85 p-5 shadow-[0_18px_40px_-28px_rgba(15,31,28,0.35)] transition hover:border-[var(--teal)]/25 ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
            {label}
          </p>
          <p
            className={`mt-3 truncate text-2xl font-semibold tracking-tight sm:text-3xl ${
              tone === 'warning' ? 'text-[var(--accent-deep)]' : 'text-[var(--ink)]'
            }`}
          >
            {value}
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

function QuickAction({ to, icon: Icon, label }) {
  return (
    <Link
      to={to}
      className="group inline-flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface-elevated)] px-4 py-3 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--teal)]/30 hover:bg-white"
    >
      <span className="inline-flex items-center gap-2">
        <Icon size={16} className="text-[var(--teal)]" />
        {label}
      </span>
      <ArrowUpRight size={14} className="opacity-40 transition group-hover:opacity-100" />
    </Link>
  );
}

function AttentionRow({ label, value, meta }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-elevated)] px-4 py-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
          {label}
        </p>
        <p className="mt-1 font-semibold text-[var(--ink)]">{value || '—'}</p>
      </div>
      {meta ? <p className="text-xs font-semibold text-[var(--teal)]">{meta}</p> : null}
    </div>
  );
}

function EmptyBlock({ title, text, action }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--line)] px-4 py-10 text-center">
      <p className="font-semibold text-[var(--ink)]">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--muted)]">{text}</p>
      {action ? (
        <Link
          to={action.to}
          className="mt-4 inline-flex text-sm font-semibold text-[var(--teal)] hover:underline"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="min-w-0 space-y-6">
      <div className="h-16 max-w-72 animate-pulse rounded-xl bg-black/5" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="h-32 animate-pulse rounded-2xl bg-black/5" />
        ))}
      </div>
    </div>
  );
}
