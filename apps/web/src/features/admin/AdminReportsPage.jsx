import { useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  Banknote,
  CalendarRange,
  ChartColumn,
  CircleDollarSign,
  LoaderCircle,
  Receipt,
  ShoppingBag,
  Utensils,
  X,
} from 'lucide-react';
import { api } from '../../shared/api/client.js';
import { Alert } from '../../shared/ui/Alert.jsx';
import { Button } from '../../shared/ui/Button.jsx';

const PRESETS = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: 'custom', label: 'Custom' },
];

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

function formatDayLabel(ymd) {
  if (!ymd) return '—';
  const [y, m, d] = ymd.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(date);
}

function toInputDate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * PetPooja-style sales reports for restaurant admin.
 */
export function AdminReportsPage() {
  const [preset, setPreset] = useState('today');
  const [fromDate, setFromDate] = useState(() => toInputDate());
  const [toDate, setToDate] = useState(() => toInputDate());
  const [tab, setTab] = useState('summary'); // summary | payments | items | days | bills
  const [selectedBillId, setSelectedBillId] = useState(null);

  const queryParams = useMemo(() => {
    if (preset === 'custom') {
      return { preset: 'custom', from: fromDate, to: toDate };
    }
    return { preset };
  }, [preset, fromDate, toDate]);

  const reportQuery = useQuery({
    queryKey: ['admin', 'reports', 'sales', queryParams],
    queryFn: async () => {
      const payload = await api.getAdminSalesReport(queryParams);
      return payload.report;
    },
    placeholderData: keepPreviousData,
  });

  const report = reportQuery.data;
  const summary = report?.summary;

  return (
    <div className="space-y-6 menu-fade-up">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--teal)]">
            Orders · Reports
          </p>
          <h2
            className="mt-2 text-3xl tracking-tight text-[var(--ink)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Sales reports
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            Settled bills only (completed orders). Filter by date — same idea as PetPooja day / item /
            payment reports.
          </p>
        </div>
        {report?.range ? (
          <p className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white px-3.5 py-1.5 text-xs font-semibold text-[var(--ink-soft,#5c564c)]">
            <CalendarRange size={14} />
            {report.range.label}
          </p>
        ) : null}
      </header>

      <div className="rounded-2xl border border-[var(--line)] bg-white/95 p-3 shadow-[0_12px_28px_-24px_rgba(15,31,28,0.35)] sm:p-4">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((item) => {
            const active = preset === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setPreset(item.id)}
                className={[
                  'rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.1em] transition',
                  active
                    ? 'bg-[var(--ink)] text-white'
                    : 'border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:bg-white',
                ].join(' ')}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {preset === 'custom' ? (
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
                From
              </span>
              <input
                type="date"
                value={fromDate}
                max={toDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm outline-none ring-[var(--teal)] focus:ring-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
                To
              </span>
              <input
                type="date"
                value={toDate}
                min={fromDate}
                onChange={(e) => setToDate(e.target.value)}
                className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm outline-none ring-[var(--teal)] focus:ring-2"
              />
            </label>
          </div>
        ) : null}
      </div>

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
          Loading sales…
        </div>
      ) : null}

      {summary ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              icon={CircleDollarSign}
              label="Gross sales"
              value={formatMoney(summary.grossSales)}
              hint="Grand total collected"
            />
            <KpiCard
              icon={Receipt}
              label="Bills"
              value={String(summary.orderCount)}
              hint={`Avg ticket ${formatMoney(summary.averageTicket)}`}
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
                summary.taxAmount > 0
                  ? `CGST ${formatMoney(summary.cgstAmount)} · SGST ${formatMoney(summary.sgstAmount)}`
                  : 'GST off or no tax in range'
              }
            />
          </div>

          <div className="flex flex-wrap gap-2 border-b border-[var(--line)] pb-1">
            {[
              { id: 'summary', label: 'Summary', icon: ChartColumn },
              { id: 'payments', label: 'Payments', icon: Banknote },
              { id: 'items', label: 'Item-wise', icon: Utensils },
              { id: 'days', label: 'Day-wise', icon: CalendarRange },
              { id: 'bills', label: 'Bills', icon: Receipt },
            ].map(({ id, label, icon: Icon }) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={[
                    'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition',
                    active
                      ? 'bg-[var(--teal)]/12 text-[var(--teal)]'
                      : 'text-[var(--muted)] hover:bg-black/[0.03] hover:text-[var(--ink)]',
                  ].join(' ')}
                >
                  <Icon size={15} />
                  {label}
                </button>
              );
            })}
            {reportQuery.isFetching ? (
              <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-[var(--muted)]">
                <LoaderCircle size={12} className="animate-spin" />
                Updating
              </span>
            ) : null}
          </div>

          {tab === 'summary' ? <SummaryPanel report={report} /> : null}
          {tab === 'payments' ? <PaymentsPanel payments={report.payments || []} /> : null}
          {tab === 'items' ? <ItemsPanel items={report.items || []} /> : null}
          {tab === 'days' ? <DaysPanel days={report.days || []} /> : null}
          {tab === 'bills' ? (
            <BillsPanel
              orders={report.bills || report.recentOrders || []}
              onSelect={(order) => setSelectedBillId(order.id)}
            />
          ) : null}
        </>
      ) : null}

      <ReportBillDrawer
        orderId={selectedBillId}
        onClose={() => setSelectedBillId(null)}
      />
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, hint }) {
  return (
    <article className="rounded-2xl border border-[var(--line)] bg-white p-4 shadow-[0_12px_28px_-24px_rgba(15,31,28,0.35)]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
          {label}
        </p>
        <span className="rounded-xl bg-[var(--surface)] p-2 text-[var(--teal)]">
          <Icon size={16} />
        </span>
      </div>
      <p
        className="mt-3 text-2xl font-semibold tracking-tight text-[var(--ink)]"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p> : null}
    </article>
  );
}

function SummaryPanel({ report }) {
  const s = report.summary;
  const rows = [
    { label: 'Food subtotal', value: formatMoney(s.foodSubtotal) },
    { label: 'CGST', value: formatMoney(s.cgstAmount) },
    { label: 'SGST', value: formatMoney(s.sgstAmount) },
    { label: 'Tax total', value: formatMoney(s.taxAmount) },
    { label: 'Round off', value: formatMoney(s.roundOffAmount) },
    { label: 'Gross sales', value: formatMoney(s.grossSales), strong: true },
    { label: 'Bills settled', value: String(s.orderCount) },
    { label: 'Units sold', value: String(s.unitsSold) },
    { label: 'Average ticket', value: formatMoney(s.averageTicket) },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-2xl border border-[var(--line)] bg-white p-4 sm:p-5">
        <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
          Sales breakup
        </h3>
        <ul className="mt-3 divide-y divide-[var(--line)]">
          {rows.map((row) => (
            <li
              key={row.label}
              className="flex items-center justify-between gap-3 py-2.5 text-sm"
            >
              <span className={row.strong ? 'font-semibold text-[var(--ink)]' : 'text-[var(--muted)]'}>
                {row.label}
              </span>
              <span
                className={
                  row.strong
                    ? 'text-base font-bold text-[var(--teal)]'
                    : 'font-semibold text-[var(--ink)]'
                }
              >
                {row.value}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-[var(--line)] bg-white p-4 sm:p-5">
        <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
          Top payments
        </h3>
        {(report.payments || []).length === 0 ? (
          <EmptyBlock text="No settled bills in this range." />
        ) : (
          <ul className="mt-3 space-y-2">
            {report.payments.slice(0, 6).map((pay) => (
              <li key={pay.method}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-[var(--ink)]">{pay.label}</span>
                  <span className="font-bold text-[var(--teal)]">{formatMoney(pay.amount)}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--surface)]">
                  <div
                    className="h-full rounded-full bg-[var(--teal)]"
                    style={{ width: `${Math.min(100, pay.share)}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-[var(--muted)]">
                  {pay.count} bill{pay.count === 1 ? '' : 's'} · {pay.share}%
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function PaymentsPanel({ payments }) {
  if (!payments.length) return <EmptyBlock text="No payment data in this range." />;
  return (
    <ReportTable
      headers={['Mode', 'Bills', 'Amount', 'Share']}
      rows={payments.map((pay) => [
        pay.label,
        String(pay.count),
        formatMoney(pay.amount),
        `${pay.share}%`,
      ])}
    />
  );
}

function ItemsPanel({ items }) {
  if (!items.length) return <EmptyBlock text="No items sold in this range." />;
  return (
    <ReportTable
      headers={['#', 'Item', 'Qty', 'Amount']}
      rows={items.map((item, index) => [
        String(index + 1),
        item.name,
        String(item.quantity),
        formatMoney(item.amount),
      ])}
    />
  );
}

function DaysPanel({ days }) {
  if (!days.length) return <EmptyBlock text="No day-wise sales in this range." />;
  return (
    <ReportTable
      headers={['Date', 'Bills', 'Units', 'Tax', 'Sales']}
      rows={days.map((day) => [
        formatDayLabel(day.date),
        String(day.orders),
        String(day.units),
        formatMoney(day.tax),
        formatMoney(day.revenue),
      ])}
    />
  );
}

function BillsPanel({ orders, onSelect }) {
  if (!orders.length) return <EmptyBlock text="No settled bills in this range." />;
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-[0_12px_28px_-24px_rgba(15,31,28,0.35)]">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[var(--surface)]/80 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
            <tr>
              {['Bill', 'Table', 'Items', 'Payment', 'Total'].map((h) => (
                <th key={h} className="px-4 py-3 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {orders.map((order) => (
              <tr
                key={order.id}
                className="cursor-pointer hover:bg-[var(--teal)]/8"
                onClick={() => onSelect?.(order)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect?.(order);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`View bill ${formatOrderNo(order.orderNumber)}`}
              >
                <td className="px-4 py-2.5 font-semibold text-[var(--ink)] whitespace-nowrap">
                  #{formatOrderNo(order.orderNumber)}
                </td>
                <td className="px-4 py-2.5 text-[var(--ink)] whitespace-nowrap">
                  {order.tableLabel || '—'}
                </td>
                <td className="px-4 py-2.5 text-[var(--ink)] whitespace-nowrap">
                  {order.itemCount}
                </td>
                <td className="px-4 py-2.5 text-[var(--ink)] whitespace-nowrap">
                  {order.paymentLabel || '—'}
                </td>
                <td className="px-4 py-2.5 font-semibold text-[var(--teal)] whitespace-nowrap">
                  {formatMoney(order.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-[var(--line)] px-4 py-2 text-[11px] text-[var(--muted)]">
        Click a bill to view items
      </p>
    </div>
  );
}

function ReportBillDrawer({ orderId, onClose }) {
  const open = Boolean(orderId);
  const orderQuery = useQuery({
    queryKey: ['admin', 'order', orderId, 'report-detail'],
    queryFn: async () => {
      const payload = await api.getAdminOrder(orderId);
      return payload.order;
    },
    enabled: open,
  });

  if (!open) return null;

  const order = orderQuery.data;
  const items = order?.items || [];
  const displayNo = order ? formatOrderNo(order.orderNumber) : '…';
  const table =
    order?.tableLabel ||
    (order?.tableNumber != null
      ? `Table ${String(order.tableNumber).padStart(2, '0')}`
      : 'Table —');

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-bill-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-[var(--ink)]/45 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--teal)]">
              {orderQuery.isLoading ? 'Loading…' : table}
            </p>
            <h2
              id="report-bill-title"
              className="mt-1 text-2xl text-[var(--ink)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Bill #{displayNo}
            </h2>
            {order ? (
              <p className="mt-1 text-sm text-[var(--muted)]">
                {order.paymentMethod
                  ? `Paid · ${String(order.paymentMethod).replaceAll('_', ' ')}`
                  : order.status}
                {order.createdAt
                  ? ` · ${new Intl.DateTimeFormat('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(new Date(order.createdAt))}`
                  : ''}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--line)] p-2 text-[var(--muted)] hover:bg-black/[0.03]"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {orderQuery.isLoading ? (
            <p className="inline-flex items-center gap-2 text-sm text-[var(--muted)]">
              <LoaderCircle size={16} className="animate-spin" />
              Loading bill…
            </p>
          ) : null}
          {orderQuery.error ? (
            <Alert tone="error">{orderQuery.error.message}</Alert>
          ) : null}

          {order ? (
            <>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)]/80 px-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-[var(--ink)]">
                        {item.dishNameSnapshot || item.dishName}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        {formatMoney(item.priceSnapshot)} × {item.quantity}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-[var(--teal)]">
                      {formatMoney(item.subtotal)}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="space-y-1.5 rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm">
                <div className="flex justify-between text-[var(--muted)]">
                  <span>Subtotal</span>
                  <span className="font-medium text-[var(--ink)]">
                    {formatMoney(order.subtotal)}
                  </span>
                </div>
                {Number(order.taxAmount) > 0 ? (
                  <>
                    <div className="flex justify-between text-[var(--muted)]">
                      <span>CGST ({Number(order.cgstRate) || 0}%)</span>
                      <span>{formatMoney(order.cgstAmount)}</span>
                    </div>
                    <div className="flex justify-between text-[var(--muted)]">
                      <span>SGST ({Number(order.sgstRate) || 0}%)</span>
                      <span>{formatMoney(order.sgstAmount)}</span>
                    </div>
                  </>
                ) : null}
                {Number(order.roundOffAmount) !== 0 ? (
                  <div className="flex justify-between text-[var(--muted)]">
                    <span>Round off</span>
                    <span>
                      {Number(order.roundOffAmount) > 0 ? '+' : ''}
                      {formatMoney(order.roundOffAmount)}
                    </span>
                  </div>
                ) : null}
                <div className="flex justify-between border-t border-[var(--line)] pt-2">
                  <span className="font-semibold text-[var(--ink)]">Grand total</span>
                  <span className="text-lg font-bold text-[var(--teal)]">
                    {formatMoney(order.total)}
                  </span>
                </div>
              </div>
            </>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-[var(--line)] px-5 py-4">
          <Button className="w-full" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

function ReportTable({ headers, rows }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-[0_12px_28px_-24px_rgba(15,31,28,0.35)]">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[var(--surface)]/80 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
            <tr>
              {headers.map((h) => (
                <th key={h} className="px-4 py-3 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {rows.map((cells, index) => (
              <tr key={index} className="hover:bg-[var(--surface)]/40">
                {cells.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className={[
                      'px-4 py-2.5 whitespace-nowrap',
                      cellIndex === cells.length - 1
                        ? 'font-semibold text-[var(--teal)]'
                        : 'text-[var(--ink)]',
                    ].join(' ')}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmptyBlock({ text }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--line)] bg-white/70 px-6 py-14 text-center text-sm text-[var(--muted)]">
      {text}
    </div>
  );
}
