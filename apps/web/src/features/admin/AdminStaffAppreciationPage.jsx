import { useQuery } from '@tanstack/react-query';
import { HeartHandshake, LoaderCircle, RefreshCw } from 'lucide-react';
import { api } from '../../shared/api/client.js';
import { Button } from '../../shared/ui/Button.jsx';
import { useAuth, UserRoles } from '../auth/AuthContext.jsx';

function formatMoney(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatWhen(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatOrderNo(orderNumber) {
  const raw = String(orderNumber || '').trim();
  if (!raw) return '—';
  const parts = raw.split('-');
  const seq = parts[parts.length - 1];
  if (/^\d+$/.test(seq)) return seq.replace(/^0+(?=\d)/, '') || seq;
  return raw;
}

/**
 * Captain (and admin) view of staff appreciation collected on settled bills.
 */
export function AdminStaffAppreciationPage() {
  const { user } = useAuth();
  const isCaptain = user?.role === UserRoles.RESTAURANT_CAPTAIN;

  const query = useQuery({
    queryKey: ['admin', 'staff-appreciation'],
    queryFn: () => api.getAdminStaffAppreciation(),
    refetchInterval: 30_000,
  });

  const summary = query.data?.summary;
  const today = query.data?.today || [];
  const recent = query.data?.recent || [];

  return (
    <div className="min-w-0 space-y-6 menu-fade-up">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--teal)]">
            {isCaptain ? 'Your collections' : 'Team collections'}
          </p>
          <h2
            className="mt-2 text-3xl tracking-tight text-[var(--ink)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Staff appreciation
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            {isCaptain
              ? 'Amounts guests left for you when bills were settled. Not part of the food bill.'
              : 'Guest staff appreciation assigned to captains when orders are completed.'}
          </p>
        </div>
        <Button
          variant="secondary"
          disabled={query.isFetching}
          onClick={() => query.refetch()}
        >
          <RefreshCw size={14} className={query.isFetching ? 'animate-spin' : ''} />
          Refresh
        </Button>
      </header>

      {query.isLoading ? (
        <div className="flex min-h-[12rem] items-center justify-center gap-2 text-[var(--muted)]">
          <LoaderCircle size={18} className="animate-spin" />
          Loading…
        </div>
      ) : query.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {query.error.message || 'Could not load staff appreciation'}
        </div>
      ) : (
        <>
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
            <article className="min-w-0 rounded-2xl border border-[var(--line)] bg-white/95 p-5 shadow-[0_12px_28px_-24px_rgba(15,31,28,0.35)]">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
                Today
              </p>
              <p
                className="mt-2 text-3xl tracking-tight text-[var(--ink)]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {formatMoney(summary?.todayTotal)}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {summary?.todayCount || 0} collection
                {(summary?.todayCount || 0) === 1 ? '' : 's'}
              </p>
            </article>
            <article className="min-w-0 rounded-2xl border border-[var(--line)] bg-white/95 p-5 shadow-[0_12px_28px_-24px_rgba(15,31,28,0.35)]">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
                All time
              </p>
              <p
                className="mt-2 text-3xl tracking-tight text-[var(--ink)]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {formatMoney(summary?.allTimeTotal)}
              </p>
              <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-[var(--muted)]">
                <HeartHandshake size={12} className="text-[var(--teal)]" />
                Staff appreciation
              </p>
            </article>
          </div>

          <section className="rounded-2xl border border-[var(--line)] bg-white/95 p-5 shadow-[0_12px_28px_-24px_rgba(15,31,28,0.35)]">
            <h3 className="text-lg font-semibold text-[var(--ink)]">
              {isCaptain ? 'Today’s collections' : 'Today across captains'}
            </h3>
            {today.length === 0 ? (
              <p className="mt-6 py-4 text-center text-sm text-[var(--muted)]">
                No staff appreciation recorded today yet.
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {today.map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)]/50 px-3.5 py-3"
                  >
                    <div>
                      <p className="font-semibold text-[var(--ink)]">
                        #{formatOrderNo(row.order?.orderNumber)}
                        {row.order?.tableLabel ? ` · ${row.order.tableLabel}` : ''}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        {formatWhen(row.createdAt)}
                        {!isCaptain && row.captain?.name ? ` · ${row.captain.name}` : ''}
                        {row.paymentLabel ? ` · ${row.paymentLabel}` : ''}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-[var(--ink)]">{formatMoney(row.amount)}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {!isCaptain && recent.length > 0 ? (
            <section className="rounded-2xl border border-[var(--line)] bg-white/95 p-5 shadow-[0_12px_28px_-24px_rgba(15,31,28,0.35)]">
              <h3 className="text-lg font-semibold text-[var(--ink)]">Recent</h3>
              <ul className="mt-4 space-y-2">
                {recent.map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--line)]/80 px-3.5 py-2.5"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[var(--ink)]">
                        #{formatOrderNo(row.order?.orderNumber)}
                        {row.captain?.name ? ` · ${row.captain.name}` : ''}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        {formatWhen(row.createdAt)}
                        {row.paymentLabel ? ` · ${row.paymentLabel}` : ''}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-[var(--ink)]">
                      {formatMoney(row.amount)}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
