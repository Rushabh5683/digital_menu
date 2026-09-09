import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Banknote,
  CalendarRange,
  CheckCircle2,
  CircleDollarSign,
  LoaderCircle,
  Lock,
  MoonStar,
  Receipt,
  RefreshCw,
  ShoppingBag,
  Utensils,
} from 'lucide-react';
import { api } from '../../shared/api/client.js';
import { Alert } from '../../shared/ui/Alert.jsx';
import { Button } from '../../shared/ui/Button.jsx';
import { ConfirmDialog } from '../../shared/ui/Modal.jsx';

function formatMoney(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatOrderNo(orderNumber) {
  const raw = String(orderNumber || '').trim();
  if (!raw) return '—';
  const parts = raw.split('-');
  const seq = parts[parts.length - 1];
  if (/^\d+$/.test(seq)) return seq.replace(/^0+(?=\d)/, '') || seq;
  return raw;
}

function formatTime(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatDateTime(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function toInputDate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDayHeading(ymd) {
  if (!ymd) return 'Today';
  const [y, m, d] = ymd.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = toInputDate();
  if (ymd === today) return 'Today';
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function KpiCard({ icon: Icon, label, value, hint }) {
  return (
    <article className="rounded-2xl border border-[var(--line)] bg-white/95 p-4 shadow-[0_12px_28px_-24px_rgba(15,31,28,0.35)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
            {label}
          </p>
          <p
            className="mt-2 truncate text-2xl tracking-tight text-[var(--ink)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {value}
          </p>
          {hint ? <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p> : null}
        </div>
        <div className="rounded-xl bg-[var(--teal)]/10 p-2.5 text-[var(--teal)]">
          <Icon size={18} />
        </div>
      </div>
    </article>
  );
}

/**
 * PetPooja-style Day End closeout — one business day settlement summary + End Operations.
 */
export function AdminDayEndPage() {
  const queryClient = useQueryClient();
  const today = toInputDate();
  const [day, setDay] = useState(today);
  const [confirmClose, setConfirmClose] = useState(false);
  const [closeError, setCloseError] = useState(null);
  const isToday = day === today;

  const reportParams = useMemo(() => {
    if (isToday) return { preset: 'today' };
    return { preset: 'custom', from: day, to: day };
  }, [day, isToday]);

  const statusQuery = useQuery({
    queryKey: ['admin', 'day-end', 'status', day],
    queryFn: async () => {
      const payload = await api.getAdminDayEnd({ businessDate: day });
      return payload.dayEnd;
    },
    placeholderData: keepPreviousData,
  });

  const reportQuery = useQuery({
    queryKey: ['admin', 'day-end', 'sales', reportParams],
    queryFn: async () => {
      const payload = await api.getAdminSalesReport(reportParams);
      return payload.report;
    },
    placeholderData: keepPreviousData,
  });

  const openTicketsQuery = useQuery({
    queryKey: ['admin', 'day-end', 'open-tickets'],
    queryFn: async () => {
      const payload = await api.listAdminOrders({
        status: 'PLACED,ACCEPTED,PREPARING,READY',
        limit: 50,
      });
      return payload.orders || [];
    },
    refetchInterval: 20_000,
  });

  const cancelledQuery = useQuery({
    queryKey: ['admin', 'day-end', 'cancelled', day],
    queryFn: async () => {
      const payload = await api.listAdminOrders({
        status: 'CANCELLED,REJECTED',
        date: day,
        limit: 100,
      });
      return payload.orders || [];
    },
  });

  const closeMutation = useMutation({
    mutationFn: () => api.closeAdminDayEnd({ businessDate: day }),
    onSuccess: async () => {
      setConfirmClose(false);
      setCloseError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'day-end'] }),
        statusQuery.refetch(),
        reportQuery.refetch(),
        openTicketsQuery.refetch(),
      ]);
    },
    onError: (error) => {
      setCloseError(error?.message || 'Could not end day operations');
    },
  });

  const report = reportQuery.data;
  const summary = report?.summary;
  const payments = report?.payments || [];
  const items = report?.items || [];
  const bills = report?.bills || report?.recentOrders || [];
  const openTickets = openTicketsQuery.data || [];
  const cancelled = cancelledQuery.data || [];
  const dayEnd = statusQuery.data;
  const isClosed = Boolean(dayEnd?.isClosed);
  const closeInfo = dayEnd?.close;
  const canClose = Boolean(dayEnd?.canClose) && !isClosed;
  const hasOpenTickets = openTickets.length > 0;

  function refreshAll() {
    statusQuery.refetch();
    reportQuery.refetch();
    openTicketsQuery.refetch();
    cancelledQuery.refetch();
  }

  function requestClose() {
    setCloseError(null);
    if (hasOpenTickets) {
      setCloseError(
        `Settle or cancel ${openTickets.length} open ticket${openTickets.length === 1 ? '' : 's'} on Live Orders first.`,
      );
      return;
    }
    setConfirmClose(true);
  }

  return (
    <div className="space-y-6 pb-28 menu-fade-up">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--teal)]">
            Day end
          </p>
          <h2
            className="mt-2 text-3xl tracking-tight text-[var(--ink)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {formatDayHeading(day)} closeout
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            Settled bills for this business day — payments, items, and bill list. End day operations
            when the kitchen is clear, like PetPooja Day End.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm">
            <CalendarRange size={14} className="text-[var(--muted)]" />
            <input
              type="date"
              value={day}
              max={today}
              onChange={(e) => {
                setDay(e.target.value || today);
                setCloseError(null);
              }}
              className="bg-transparent text-sm font-semibold text-[var(--ink)] outline-none"
            />
          </label>
          <Button size="sm" variant="secondary" onClick={refreshAll}>
            <RefreshCw
              size={14}
              className={
                reportQuery.isFetching || statusQuery.isFetching ? 'animate-spin' : undefined
              }
            />
            Refresh
          </Button>
        </div>
      </header>

      {isClosed && closeInfo ? (
        <div className="flex flex-wrap items-start gap-3 rounded-2xl border border-emerald-200/90 bg-emerald-50/80 px-4 py-3.5 text-emerald-950">
          <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-700" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Day operations closed</p>
            <p className="mt-1 text-sm text-emerald-900/85">
              Closed at {formatDateTime(closeInfo.closedAt)}
              {closeInfo.closedBy?.name ? ` by ${closeInfo.closedBy.name}` : ''}
              . Sales snapshot is locked for this business date.
            </p>
          </div>
          <Lock size={16} className="shrink-0 text-emerald-700/70" />
        </div>
      ) : null}

      {openTickets.length > 0 && !isClosed ? (
        <Alert tone="warning">
          <div className="flex flex-wrap items-start gap-3">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                {openTickets.length} open ticket{openTickets.length === 1 ? '' : 's'} still active
              </p>
              <p className="mt-1 text-sm opacity-90">
                Settle or cancel them on Live Orders before you can end day operations.
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {openTickets.slice(0, 8).map((order) => (
                  <li key={order.id}>
                    <Link
                      to={`/admin/orders/${order.id}`}
                      className="inline-flex rounded-full border border-amber-300/80 bg-white/70 px-2.5 py-1 text-xs font-semibold text-amber-950 hover:bg-white"
                    >
                      #{formatOrderNo(order.orderNumber)} · {order.status}
                      {order.table?.tableNumber != null
                        ? ` · T${String(order.table.tableNumber).padStart(2, '0')}`
                        : ''}
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                to="/admin/orders"
                className="mt-3 inline-flex text-sm font-semibold underline underline-offset-2"
              >
                Go to Live Orders
              </Link>
            </div>
          </div>
        </Alert>
      ) : !isClosed ? (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200/80 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-900">
          <MoonStar size={16} />
          <span className="font-semibold">No open kitchen tickets</span>
          <span className="text-emerald-800/80">— ready to end day operations.</span>
        </div>
      ) : null}

      {closeError ? (
        <Alert tone="error">
          {closeError}
          {hasOpenTickets ? (
            <div className="mt-3">
              <Link to="/admin/orders" className="text-sm font-semibold underline underline-offset-2">
                Open Live Orders
              </Link>
            </div>
          ) : null}
        </Alert>
      ) : null}

      {reportQuery.error ? (
        <Alert tone="error">
          {reportQuery.error.message}
          <div className="mt-3">
            <Button size="sm" onClick={() => reportQuery.refetch()}>
              Retry
            </Button>
          </div>
        </Alert>
      ) : null}

      {reportQuery.isLoading && !report ? (
        <div className="flex min-h-[12rem] items-center justify-center gap-2 text-[var(--muted)]">
          <LoaderCircle className="animate-spin" size={18} />
          Loading Day End…
        </div>
      ) : null}

      {summary ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              icon={CircleDollarSign}
              label="Gross sales"
              value={formatMoney(summary.grossSales)}
              hint="Completed bills only"
            />
            <KpiCard
              icon={Receipt}
              label="Bills settled"
              value={String(summary.orderCount)}
              hint={`Avg ${formatMoney(summary.averageTicket)}`}
            />
            <KpiCard
              icon={ShoppingBag}
              label="Items sold"
              value={String(summary.unitsSold)}
              hint={`Food ${formatMoney(summary.foodSubtotal)}`}
            />
            <KpiCard
              icon={Banknote}
              label="Tax collected"
              value={formatMoney(summary.taxAmount)}
              hint={
                cancelled.length > 0
                  ? `${cancelled.length} cancelled / rejected`
                  : 'CGST + SGST'
              }
            />
          </div>

          {summary.cgstAmount > 0 || summary.sgstAmount > 0 || summary.roundOffAmount ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
                  CGST
                </p>
                <p className="mt-1 font-semibold text-[var(--ink)]">
                  {formatMoney(summary.cgstAmount)}
                </p>
              </div>
              <div className="rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
                  SGST
                </p>
                <p className="mt-1 font-semibold text-[var(--ink)]">
                  {formatMoney(summary.sgstAmount)}
                </p>
              </div>
              <div className="rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
                  Round off
                </p>
                <p className="mt-1 font-semibold text-[var(--ink)]">
                  {formatMoney(summary.roundOffAmount)}
                </p>
              </div>
            </div>
          ) : null}

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="rounded-2xl border border-[var(--line)] bg-white/95 p-5 shadow-[0_12px_28px_-24px_rgba(15,31,28,0.35)]">
              <div className="mb-4 flex items-center gap-2">
                <Banknote size={16} className="text-[var(--teal)]" />
                <h3 className="text-lg font-semibold text-[var(--ink)]">Payment breakup</h3>
              </div>
              {payments.length === 0 ? (
                <p className="py-8 text-center text-sm text-[var(--muted)]">
                  No settled payments on this day.
                </p>
              ) : (
                <ul className="space-y-2">
                  {payments.map((row) => (
                    <li
                      key={row.method || row.label}
                      className="flex items-center justify-between gap-3 rounded-xl border border-[var(--line)]/80 bg-[var(--surface)]/50 px-3 py-2.5 text-sm"
                    >
                      <span className="font-medium text-[var(--ink)]">
                        {row.label || row.method || 'Other'}
                      </span>
                      <span className="font-semibold text-[var(--ink)]">
                        {formatMoney(row.amount)}
                        <span className="ml-2 text-xs font-normal text-[var(--muted)]">
                          ({row.count} bill{row.count === 1 ? '' : 's'})
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-[var(--line)] bg-white/95 p-5 shadow-[0_12px_28px_-24px_rgba(15,31,28,0.35)]">
              <div className="mb-4 flex items-center gap-2">
                <Utensils size={16} className="text-[var(--teal)]" />
                <h3 className="text-lg font-semibold text-[var(--ink)]">Item-wise sales</h3>
              </div>
              {items.length === 0 ? (
                <p className="py-8 text-center text-sm text-[var(--muted)]">No items sold.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[20rem] text-left text-sm">
                    <thead>
                      <tr className="border-b border-[var(--line)] text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
                        <th className="pb-2 font-semibold">Item</th>
                        <th className="pb-2 font-semibold">Qty</th>
                        <th className="pb-2 font-semibold">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.slice(0, 40).map((item) => (
                        <tr
                          key={item.dishId || item.name}
                          className="border-b border-[var(--line)]/70 last:border-0"
                        >
                          <td className="py-2.5 pr-3 font-medium text-[var(--ink)]">{item.name}</td>
                          <td className="py-2.5 pr-3 text-[var(--ink-soft)]">{item.quantity}</td>
                          <td className="py-2.5 font-semibold text-[var(--ink)]">
                            {formatMoney(item.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          <section className="rounded-2xl border border-[var(--line)] bg-white/95 p-5 shadow-[0_12px_28px_-24px_rgba(15,31,28,0.35)]">
            <div className="mb-4 flex items-center gap-2">
              <Receipt size={16} className="text-[var(--teal)]" />
              <h3 className="text-lg font-semibold text-[var(--ink)]">
                Bills ({bills.length})
              </h3>
            </div>
            {bills.length === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--muted)]">No settled bills.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[32rem] text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--line)] text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
                      <th className="pb-2 font-semibold">Bill</th>
                      <th className="pb-2 font-semibold">Table</th>
                      <th className="pb-2 font-semibold">Time</th>
                      <th className="pb-2 font-semibold">Pay</th>
                      <th className="pb-2 font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bills.map((bill) => (
                      <tr key={bill.id} className="border-b border-[var(--line)]/70 last:border-0">
                        <td className="py-2.5 pr-3">
                          <Link
                            to={`/admin/orders/${bill.id}`}
                            className="font-semibold text-[var(--teal)] hover:underline"
                          >
                            #{formatOrderNo(bill.orderNumber)}
                          </Link>
                          <span className="mt-0.5 block text-[11px] text-[var(--muted)]">
                            {bill.itemCount} item{bill.itemCount === 1 ? '' : 's'}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 text-[var(--ink-soft)]">
                          {bill.tableLabel || '—'}
                        </td>
                        <td className="py-2.5 pr-3 text-[var(--ink-soft)]">
                          {formatTime(bill.paidAt || bill.createdAt)}
                        </td>
                        <td className="py-2.5 pr-3 text-[var(--ink-soft)]">
                          {bill.paymentLabel || '—'}
                        </td>
                        <td className="py-2.5 font-semibold text-[var(--ink)]">
                          {formatMoney(bill.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {cancelled.length > 0 ? (
            <section className="rounded-2xl border border-red-200/70 bg-red-50/40 p-5">
              <h3 className="text-lg font-semibold text-[var(--ink)]">
                Cancelled / rejected ({cancelled.length})
              </h3>
              <ul className="mt-3 space-y-2">
                {cancelled.map((order) => (
                  <li
                    key={order.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-200/60 bg-white/80 px-3 py-2 text-sm"
                  >
                    <span className="font-semibold text-[var(--ink)]">
                      #{formatOrderNo(order.orderNumber)} · {order.status}
                    </span>
                    <span className="text-[var(--muted)]">
                      {order.table?.tableNumber != null
                        ? `Table ${String(order.table.tableNumber).padStart(2, '0')}`
                        : '—'}{' '}
                      · {formatMoney(order.total)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : null}

      {!isClosed && typeof document !== 'undefined'
        ? createPortal(
            <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 lg:pl-[270px]">
              <div className="pointer-events-auto border-t border-[var(--line)] bg-[var(--surface-elevated)]/95 px-4 py-3 shadow-[0_-12px_40px_-28px_rgba(15,31,28,0.45)] backdrop-blur-md">
                <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 text-sm text-[var(--muted)]">
                    <p className="font-semibold text-[var(--ink)]">End day operations</p>
                    <p className="mt-0.5">
                      {hasOpenTickets
                        ? 'Clear open tickets first, then lock this day’s closeout.'
                        : `Lock ${formatDayHeading(day).toLowerCase()}’s sales snapshot after wrap-up.`}
                    </p>
                  </div>
                  <Button
                    size="md"
                    disabled={
                      !canClose ||
                      hasOpenTickets ||
                      closeMutation.isPending ||
                      statusQuery.isLoading
                    }
                    onClick={requestClose}
                  >
                    {closeMutation.isPending ? (
                      <>
                        <LoaderCircle size={16} className="animate-spin" />
                        Closing…
                      </>
                    ) : (
                      <>
                        <MoonStar size={16} />
                        End Day Operations
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      <ConfirmDialog
        open={confirmClose}
        title="End day operations?"
        message={`This will close ${formatDayHeading(day)} and save a sales snapshot (gross ${formatMoney(summary?.grossSales)}, ${summary?.orderCount || 0} bills). You won’t be able to close this date again.`}
        confirmLabel="End Day Operations"
        loading={closeMutation.isPending}
        onClose={() => {
          if (!closeMutation.isPending) setConfirmClose(false);
        }}
        onConfirm={() => closeMutation.mutate()}
      />
    </div>
  );
}
