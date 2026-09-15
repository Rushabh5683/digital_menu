import {
  ArrowLeft,
  ChartColumn,
  Check,
  ClipboardList,
  ExternalLink,
  LayoutDashboard,
  LoaderCircle,
  QrCode,
  Settings,
  Table2,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../../shared/api/client.js';
import { goBack } from '../../shared/lib/navigation.js';
import { Alert } from '../../shared/ui/Alert.jsx';
import { Button } from '../../shared/ui/Button.jsx';
import { Field } from '../../shared/ui/Field.jsx';
import { Input, Textarea } from '../../shared/ui/FormControls.jsx';
import { ConfirmDialog } from '../../shared/ui/Modal.jsx';
import { ScrollTable } from '../../shared/ui/ScrollTable.jsx';
import { StatusBadge } from '../../shared/ui/StatusBadge.jsx';
import { LogoUploadField } from './components/LogoUploadField.jsx';
import { formatDate, formatDateTime } from './lib/format.js';
import {
  normalizeEmail,
  normalizePhone,
  sanitizePhoneInput,
  validateEmailField,
  validatePhoneField,
} from '../../shared/lib/validation.js';
import { staffMenuPreviewPath } from '../menu/lib/staffPreview.js';

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'menu', label: 'Menu', icon: UtensilsCrossed },
  { id: 'tables', label: 'Tables', icon: Table2 },
  { id: 'orders', label: 'Orders', icon: ClipboardList },
  { id: 'analytics', label: 'Analytics', icon: ChartColumn },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const SALES_PRESETS = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
];

function formatMoney(value) {
  const amount = Number(value);
  if (Number.isNaN(amount)) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatOrderNo(orderNumber) {
  const raw = String(orderNumber || '').trim();
  if (!raw) return '—';
  const parts = raw.split('-');
  const seq = parts[parts.length - 1];
  if (/^\d+$/.test(seq)) return seq.replace(/^0+(?=\d)/, '') || seq;
  return raw;
}

export function SuperAdminRestaurantDetailPage() {
  const { restaurantId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = TABS.some((item) => item.id === searchParams.get('tab'))
    ? searchParams.get('tab')
    : 'overview';
  const [confirm, setConfirm] = useState(null);
  const [actionError, setActionError] = useState(null);

  const detailQuery = useQuery({
    queryKey: ['superadmin', 'restaurant', restaurantId],
    queryFn: async () => (await api.getSuperRestaurant(restaurantId)).restaurant,
    enabled: Boolean(restaurantId),
  });

  const ordersQuery = useQuery({
    queryKey: ['superadmin', 'restaurant', restaurantId, 'orders'],
    queryFn: () => api.listRestaurantOrders(restaurantId, { limit: 40 }),
    enabled: Boolean(restaurantId) && tab === 'orders',
  });

  const analyticsQuery = useQuery({
    queryKey: ['superadmin', 'restaurant', restaurantId, 'analytics'],
    queryFn: () => api.getAnalyticsOverview(restaurantId, { range: '30d' }),
    enabled: Boolean(restaurantId) && tab === 'analytics',
  });

  const statusMutation = useMutation({
    mutationFn: (nextStatus) => api.updateSuperRestaurantStatus(restaurantId, nextStatus),
    onSuccess: async () => {
      setConfirm(null);
      setActionError(null);
      await queryClient.invalidateQueries({ queryKey: ['superadmin', 'restaurant', restaurantId] });
      await queryClient.invalidateQueries({ queryKey: ['superadmin', 'restaurants'] });
    },
    onError: (error) => setActionError(error.message),
  });

  const restaurant = detailQuery.data;

  function setTab(next) {
    const params = new URLSearchParams(searchParams);
    params.set('tab', next);
    setSearchParams(params, { replace: true });
  }

  if (detailQuery.isLoading) {
    return (
      <div className="menu-fade-up rounded-2xl border border-[var(--line)] bg-white/80 px-6 py-16 text-center text-sm text-[var(--muted)]">
        Loading restaurant…
      </div>
    );
  }

  if (detailQuery.error || !restaurant) {
    return (
      <div className="space-y-4 menu-fade-up">
        <Alert tone="error">{detailQuery.error?.message || 'Restaurant not found'}</Alert>
        <Button
          variant="secondary"
          onClick={() => goBack(navigate, '/superadmin/restaurants')}
        >
          Back to restaurants
        </Button>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6 menu-fade-up">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => goBack(navigate, '/superadmin/restaurants')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--muted)] hover:text-[var(--ink)]"
          >
            <ArrowLeft size={16} />
            Restaurants
          </button>
          <div className="mt-3 flex items-start gap-3 sm:gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--ink)] sm:h-16 sm:w-16">
              {restaurant.logoUrl ? (
                <img src={restaurant.logoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xl font-semibold text-[var(--accent)]">
                  {(restaurant.name || 'R').slice(0, 1)}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  className="break-words text-2xl tracking-tight text-[var(--ink)] sm:text-3xl"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {restaurant.name}
                </h2>
                <StatusBadge status={restaurant.status} />
                <StatusBadge status={restaurant.menuStatus} />
              </div>
              <p className="mt-1 break-words text-sm text-[var(--muted)]">
                /{restaurant.slug}
                {restaurant.admin ? ` · Admin ${restaurant.admin.name}` : ''}
              </p>
            </div>
          </div>
        </div>

        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <a
            href={staffMenuPreviewPath(restaurant.slug)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-4 text-sm font-semibold text-[var(--ink)]"
          >
            Guest menu
            <ExternalLink size={14} />
          </a>
          {restaurant.status === 'ACTIVE' ? (
            <Button
              variant="secondary"
              onClick={() =>
                setConfirm({
                  title: 'Deactivate restaurant?',
                  body: `${restaurant.name} will stop accepting guest sessions until reactivated.`,
                  action: () => statusMutation.mutate('INACTIVE'),
                })
              }
            >
              Deactivate
            </Button>
          ) : (
            <Button
              onClick={() =>
                setConfirm({
                  title: 'Activate restaurant?',
                  body: `${restaurant.name} will become available on the platform again.`,
                  action: () => statusMutation.mutate('ACTIVE'),
                })
              }
            >
              Activate
            </Button>
          )}
        </div>
      </div>

      {actionError ? <Alert tone="error">{actionError}</Alert> : null}

      <div className="flex flex-wrap gap-x-1 gap-y-0 border-b border-[var(--line)]">
        {TABS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={[
                'inline-flex items-center gap-2 border-b-2 px-2.5 py-3 text-sm font-semibold transition sm:px-3',
                active
                  ? 'border-[var(--ink)] text-[var(--ink)]'
                  : 'border-transparent text-[var(--muted)] hover:text-[var(--ink)]',
              ].join(' ')}
            >
              <Icon size={15} className="shrink-0" />
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === 'overview' ? <OverviewTab restaurant={restaurant} /> : null}
      {tab === 'menu' ? <MenuTab restaurant={restaurant} /> : null}
      {tab === 'tables' ? <TablesTab restaurant={restaurant} /> : null}
      {tab === 'orders' ? (
        <OrdersTab
          restaurant={restaurant}
          ordersQuery={ordersQuery}
        />
      ) : null}
      {tab === 'analytics' ? (
        <AnalyticsTab restaurant={restaurant} analyticsQuery={analyticsQuery} />
      ) : null}
      {tab === 'settings' ? (
        <SettingsTab
          restaurant={restaurant}
          onSaved={async () => {
            await queryClient.invalidateQueries({
              queryKey: ['superadmin', 'restaurant', restaurantId],
            });
            await queryClient.invalidateQueries({ queryKey: ['superadmin', 'restaurants'] });
          }}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title}
        message={confirm?.body}
        confirmLabel="Confirm"
        loading={statusMutation.isPending}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm?.action?.()}
      />
    </div>
  );
}

function Metric({ label, value, hint }) {
  return (
    <div className="min-w-0 rounded-2xl border border-[var(--line)] bg-white/90 px-4 py-4 shadow-[0_12px_30px_-24px_rgba(15,31,28,0.45)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
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
  );
}

function Panel({ title, description, children, action }) {
  return (
    <section className="min-w-0 rounded-2xl border border-[var(--line)] bg-white/90 p-4 shadow-[0_12px_30px_-24px_rgba(15,31,28,0.4)] sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[var(--ink)]">{title}</h3>
          {description ? <p className="mt-1 text-sm text-[var(--muted)]">{description}</p> : null}
        </div>
        {action || null}
      </div>
      <div className="mt-4 min-w-0">{children}</div>
    </section>
  );
}

function OverviewTab({ restaurant }) {
  const [salesPreset, setSalesPreset] = useState('today');
  const [selectedBillId, setSelectedBillId] = useState(null);
  const health = restaurant.health;
  const performance = restaurant.performance || {};
  const tables = restaurant.tables || {};

  const salesQuery = useQuery({
    queryKey: ['superadmin', 'restaurant', restaurant.id, 'sales', salesPreset],
    queryFn: async () => {
      const payload = await api.getSuperRestaurantSalesReport(restaurant.id, {
        preset: salesPreset,
      });
      return payload.report;
    },
    placeholderData: keepPreviousData,
  });

  const summary = salesQuery.data?.summary;
  const payments = salesQuery.data?.payments || [];
  const bills = salesQuery.data?.recentOrders || salesQuery.data?.bills || [];
  const maxPayment = Math.max(1, ...payments.map((p) => Number(p.amount || 0)));

  return (
    <div className="min-w-0 space-y-5">
      <Panel
        title="Setup health"
        description={
          health?.ready
            ? 'Required setup looks complete — guest menu and admin can run.'
            : `Setup ${health?.score ?? 0}/${health?.total ?? 0} required checks complete.`
        }
        action={
          health ? (
            <span
              className={[
                'rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.1em]',
                health.ready
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-amber-50 text-amber-800',
              ].join(' ')}
            >
              {health.ready ? 'Ready' : 'Needs attention'}
            </span>
          ) : null
        }
      >
        {health?.checks?.length ? (
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {health.checks.map((check) => (
              <li
                key={check.key}
                className="flex items-start gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)]/50 px-3 py-2.5"
              >
                <span
                  className={[
                    'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                    check.complete
                      ? 'bg-emerald-100 text-emerald-700'
                      : check.optional
                        ? 'bg-slate-100 text-slate-500'
                        : 'bg-amber-100 text-amber-800',
                  ].join(' ')}
                >
                  {check.complete ? <Check size={14} strokeWidth={2.5} /> : null}
                  {!check.complete ? (
                    <span className="text-[10px] font-bold">{check.optional ? '—' : '!'}</span>
                  ) : null}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--ink)]">
                    {check.label}
                    {check.optional ? (
                      <span className="ml-1 text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">
                        optional
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-[var(--muted)]">{check.hint}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--muted)]">Health checks unavailable.</p>
        )}
      </Panel>

      <Panel
        title="Sales snapshot"
        description="Settled bills only — view-only. Restaurant admin handles POS and printing."
        action={
          salesQuery.data?.range ? (
            <span className="text-xs font-semibold text-[var(--muted)]">
              {salesQuery.data.range.label}
            </span>
          ) : null
        }
      >
        <div className="flex flex-wrap gap-2">
          {SALES_PRESETS.map((item) => {
            const active = salesPreset === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSalesPreset(item.id)}
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
          {salesQuery.isFetching ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)]">
              <LoaderCircle size={12} className="animate-spin" />
              Updating
            </span>
          ) : null}
        </div>

        {salesQuery.error ? (
          <div className="mt-4">
            <Alert tone="error">{salesQuery.error.message}</Alert>
          </div>
        ) : null}

        {salesQuery.isLoading && !summary ? (
          <p className="mt-4 inline-flex items-center gap-2 text-sm text-[var(--muted)]">
            <LoaderCircle size={16} className="animate-spin" />
            Loading sales…
          </p>
        ) : null}

        {summary ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Gross sales" value={formatMoney(summary.grossSales)} />
            <Metric
              label="Bills"
              value={summary.orderCount ?? 0}
              hint={`Avg ticket ${formatMoney(summary.averageTicket)}`}
            />
            <Metric
              label="Tax collected"
              value={formatMoney(summary.taxAmount)}
              hint={
                Number(summary.taxAmount) > 0
                  ? `CGST ${formatMoney(summary.cgstAmount)} · SGST ${formatMoney(summary.sgstAmount)}`
                  : 'No tax in range'
              }
            />
            <Metric
              label="Items sold"
              value={summary.unitsSold ?? 0}
              hint={`Food ${formatMoney(summary.foodSubtotal)}`}
            />
          </div>
        ) : null}

        {payments.length > 0 ? (
          <div className="mt-5 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
              Payments
            </p>
            {payments.map((row) => {
              const total = Number(row.amount || 0);
              const width = `${Math.max(4, Math.round((total / maxPayment) * 100))}%`;
              return (
                <div key={row.method || row.label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-[var(--ink)]">
                      {row.label || String(row.method || 'Other').replaceAll('_', ' ')}
                      <span className="ml-2 font-normal text-[var(--muted)]">
                        {row.count ?? 0} bills
                      </span>
                    </span>
                    <span className="font-semibold text-[var(--teal)]">{formatMoney(total)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-black/[0.06]">
                    <div
                      className="h-full rounded-full bg-[var(--teal)]/80"
                      style={{ width }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        <div className="mt-5">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
            Recent bills
          </p>
          {bills.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No settled bills in this range.</p>
          ) : (
            <ul className="divide-y divide-[var(--line)] rounded-xl border border-[var(--line)]">
              {bills.slice(0, 12).map((order) => (
                <li key={order.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedBillId(order.id)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition hover:bg-[var(--surface)]/70"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--ink)]">
                        #{formatOrderNo(order.orderNumber)}
                        {order.tableNumber != null || order.tableLabel
                          ? ` · ${order.tableLabel || `Table ${order.tableNumber}`}`
                          : ''}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        {formatDateTime(order.createdAt || order.completedAt)}
                        {order.paymentMethod
                          ? ` · ${String(order.paymentMethod).replaceAll('_', ' ')}`
                          : ''}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-[var(--teal)]">
                      {formatMoney(order.total)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-[var(--muted)]">Click a bill to view items (read-only).</p>
        </div>
      </Panel>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Orders today" value={performance.ordersToday ?? 0} />
        <Metric label="Orders this month" value={performance.ordersMonth ?? 0} />
        <Metric
          label="Menu sessions"
          value={restaurant.counts?.sessions ?? 0}
          hint={`${performance.sessionsToday ?? 0} today`}
        />
        <Metric
          label="Tables / QR"
          value={`${tables.qrReady ?? 0}/${tables.active ?? tables.total ?? 0}`}
          hint={`${tables.total ?? 0} tables total`}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Restaurant profile" description="Public-facing details guests and staff see.">
          <dl className="space-y-3 text-sm">
            <Row label="Description" value={restaurant.description || '—'} />
            <Row label="Email" value={restaurant.email || '—'} />
            <Row label="Phone" value={restaurant.phone || '—'} />
            <Row label="Address" value={restaurant.address || '—'} />
            <Row label="GSTIN" value={restaurant.gstin || '—'} />
            <Row label="FSSAI" value={restaurant.fssaiLicense || '—'} />
            <Row label="Created" value={formatDate(restaurant.createdAt)} />
          </dl>
        </Panel>

        <Panel title="Admin information" description="Primary restaurant admin account.">
          {restaurant.admin ? (
            <dl className="space-y-3 text-sm">
              <Row label="Name" value={restaurant.admin.name} />
              <Row label="Email" value={restaurant.admin.email} />
              <Row
                label="Account"
                value={restaurant.admin.isActive ? 'Active' : 'Disabled'}
              />
            </dl>
          ) : (
            <p className="text-sm text-[var(--muted)]">No admin assigned.</p>
          )}
          <p className="mt-4 text-xs text-[var(--muted)]">
            Manage credentials in Settings. Super Admin cannot place or print orders for this
            restaurant.
          </p>
        </Panel>
      </div>

      <Panel title="Top dishes" description="Most ordered in the last 30 days.">
        {(restaurant.topDishes || []).length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No order history yet.</p>
        ) : (
          <ul className="space-y-3">
            {restaurant.topDishes.map((dish, index) => (
              <li key={dish.dishId || dish.name} className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--ink)]/5 text-xs font-bold text-[var(--ink)]">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--ink)]">{dish.name}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {dish.orderedQuantity} ordered
                    {dish.price != null ? ` · ${formatMoney(dish.price)}` : ''}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <SuperBillDrawer
        restaurantId={restaurant.id}
        orderId={selectedBillId}
        onClose={() => setSelectedBillId(null)}
      />
    </div>
  );
}

function SuperBillDrawer({ restaurantId, orderId, onClose }) {
  const open = Boolean(orderId);
  const orderQuery = useQuery({
    queryKey: ['superadmin', 'restaurant', restaurantId, 'order', orderId],
    queryFn: async () => {
      const payload = await api.getSuperRestaurantOrder(restaurantId, orderId);
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
      aria-labelledby="super-bill-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-[var(--ink)]/20 backdrop-blur-[2px]"
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
              id="super-bill-title"
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
          {orderQuery.error ? <Alert tone="error">{orderQuery.error.message}</Alert> : null}

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
              <p className="text-xs text-[var(--muted)]">
                View only — print and complete stay with restaurant admin.
              </p>
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

function Row({ label, value }) {
  return (
    <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-3">
      <dt className="text-[var(--muted)]">{label}</dt>
      <dd className="min-w-0 break-words font-medium text-[var(--ink)]">{value}</dd>
    </div>
  );
}

function MenuTab({ restaurant }) {
  return (
    <div className="space-y-5">
      <Panel
        title="Menu status"
        description="Super Admin can inspect menus. Editing dishes stays with the restaurant admin."
      >
        <div className="flex flex-wrap gap-3">
          <StatusBadge status={restaurant.menuStatus} />
          <span className="rounded-full bg-black/[0.04] px-3 py-1 text-xs font-semibold text-[var(--ink)]">
            {restaurant.counts?.menus ?? 0} menus
          </span>
          <span className="rounded-full bg-black/[0.04] px-3 py-1 text-xs font-semibold text-[var(--ink)]">
            {restaurant.catalog?.categories ?? 0} categories
          </span>
          <span className="rounded-full bg-black/[0.04] px-3 py-1 text-xs font-semibold text-[var(--ink)]">
            {restaurant.catalog?.dishes ?? 0} dishes
          </span>
        </div>
      </Panel>

      <Panel title="Menus">
        {(restaurant.menus || []).length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No menus created yet.</p>
        ) : (
          <ul className="space-y-3">
            {restaurant.menus.map((menu) => (
              <li
                key={menu.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--line)] px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-[var(--ink)]">{menu.name}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {menu.categoryCount} categories · Updated {formatDateTime(menu.updatedAt)}
                  </p>
                </div>
                <StatusBadge status={menu.isPublished ? 'PUBLISHED' : 'DRAFT'} />
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Alert tone="info">
        Role boundary: dish and category edits are performed by the restaurant admin. Use Settings
        to activate the venue or adjust the admin account if access is blocked.
      </Alert>
    </div>
  );
}

function TablesTab({ restaurant }) {
  const tables = restaurant.tables || {};
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Total tables" value={tables.total ?? 0} />
        <Metric label="Active" value={tables.active ?? 0} />
        <Metric
          label="QR status"
          value={`${tables.qrReady ?? 0}/${tables.active ?? 0}`}
          hint={tables.qrPending ? `${tables.qrPending} still need QR` : 'All active tables ready'}
        />
      </div>
      <Panel
        title="QR codes"
        description="Inspect readiness only. Generation and print stay in the restaurant admin QR studio."
      >
        <div className="flex items-center gap-3 rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface)]/60 px-4 py-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[var(--teal)]">
            <QrCode size={22} />
          </div>
          <div>
            <p className="font-semibold text-[var(--ink)]">
              {tables.qrReady ?? 0} QR codes ready
            </p>
            <p className="text-sm text-[var(--muted)]">
              Restaurant admins generate, download, and print table QR cards from their workspace.
            </p>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function OrdersTab({ restaurant, ordersQuery }) {
  const orders = ordersQuery.data?.orders || restaurant.recentOrders || [];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Orders today" value={restaurant.performance?.ordersToday ?? 0} />
        <Metric label="Orders this month" value={restaurant.performance?.ordersMonth ?? 0} />
        <Metric label="All-time orders" value={restaurant.counts?.orders ?? 0} />
      </div>

      <Panel title="Order activity" description="Read-only inspection for Super Admin.">
        {ordersQuery.isLoading ? (
          <p className="text-sm text-[var(--muted)]">Loading orders…</p>
        ) : ordersQuery.error ? (
          <Alert tone="error">{ordersQuery.error.message}</Alert>
        ) : orders.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No orders for this restaurant yet.</p>
        ) : (
          <ScrollTable minWidthClass="min-w-[36rem]">
            <table className="w-full text-left text-sm">
              <thead className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
                <tr>
                  <th className="pb-2 pr-3 font-semibold">Order</th>
                  <th className="pb-2 pr-3 font-semibold">Table</th>
                  <th className="pb-2 pr-3 font-semibold">Status</th>
                  <th className="pb-2 pr-3 font-semibold">Total</th>
                  <th className="pb-2 font-semibold">When</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-t border-[var(--line)]">
                    <td className="py-3 pr-3 font-semibold text-[var(--ink)]">
                      #{order.orderNumber}
                    </td>
                    <td className="py-3 pr-3 text-[var(--muted)]">
                      {order.tableNumber ?? order.table?.tableNumber ?? '—'}
                    </td>
                    <td className="py-3 pr-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="py-3 pr-3 font-semibold">{formatMoney(order.total)}</td>
                    <td className="py-3 text-[var(--muted)]">
                      {formatDateTime(order.createdAt || order.placedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollTable>
        )}
      </Panel>
    </div>
  );
}

function AnalyticsTab({ restaurant, analyticsQuery }) {
  const data = analyticsQuery.data;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Menu sessions"
          value={data?.totalMenuSessions ?? restaurant.counts?.sessions ?? 0}
        />
        <Metric
          label="Avg session"
          value={
            data?.averageSessionDurationSeconds != null
              ? `${Math.round(data.averageSessionDurationSeconds)}s`
              : '—'
          }
        />
        <Metric
          label="Attention today"
          value={restaurant.performance?.attentionEventsToday ?? 0}
        />
        <Metric
          label="Orders (month)"
          value={restaurant.performance?.ordersMonth ?? 0}
        />
      </div>

      <Panel title="Performance" description="High-level restaurant health for platform oversight.">
        {analyticsQuery.isLoading ? (
          <p className="text-sm text-[var(--muted)]">Loading analytics…</p>
        ) : analyticsQuery.error ? (
          <Alert tone="error">{analyticsQuery.error.message}</Alert>
        ) : (
          <div className="space-y-4 text-sm">
            <p className="text-[var(--muted)]">
              Super Admin can inspect attention and ordering performance. Operational kitchen
              controls remain with the restaurant admin.
            </p>
            {(restaurant.topDishes || []).length > 0 ? (
              <div>
                <p className="font-semibold text-[var(--ink)]">Top ordered dishes</p>
                <ul className="mt-2 space-y-2">
                  {restaurant.topDishes.map((dish) => (
                    <li key={dish.dishId || dish.name} className="flex justify-between gap-3">
                      <span>{dish.name}</span>
                      <span className="font-semibold">{dish.orderedQuantity}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-[var(--muted)]">Not enough order data for dish rankings yet.</p>
            )}
          </div>
        )}
      </Panel>
    </div>
  );
}

function SettingsTab({ restaurant, onSaved }) {
  const [profile, setProfile] = useState(() => ({
    name: restaurant.name || '',
    description: restaurant.description || '',
    email: restaurant.email || '',
    phone: sanitizePhoneInput(restaurant.phone || ''),
    address: restaurant.address || '',
    logoUrl: restaurant.logoUrl || '',
    status: restaurant.status || 'ACTIVE',
    gstEnabled: Boolean(restaurant.gstEnabled),
    gstin: restaurant.gstin || '',
    fssaiLicense: restaurant.fssaiLicense || '',
    billThanksMessage: restaurant.billThanksMessage || '',
    cgstRate: restaurant.cgstRate ?? 2.5,
    sgstRate: restaurant.sgstRate ?? 2.5,
  }));
  const [admin, setAdmin] = useState(() => ({
    name: restaurant.admin?.name || '',
    email: restaurant.admin?.email || '',
    isActive: restaurant.admin?.isActive ?? true,
    temporaryPassword: '',
  }));
  const [profileError, setProfileError] = useState(null);
  const [profileFieldErrors, setProfileFieldErrors] = useState({});
  const [adminError, setAdminError] = useState(null);
  const [adminFieldErrors, setAdminFieldErrors] = useState({});
  const [profileSaved, setProfileSaved] = useState(false);
  const [adminSaved, setAdminSaved] = useState(false);

  useEffect(() => {
    setProfile({
      name: restaurant.name || '',
      description: restaurant.description || '',
      email: restaurant.email || '',
      phone: sanitizePhoneInput(restaurant.phone || ''),
      address: restaurant.address || '',
      logoUrl: restaurant.logoUrl || '',
      status: restaurant.status || 'ACTIVE',
      gstEnabled: Boolean(restaurant.gstEnabled),
      gstin: restaurant.gstin || '',
      fssaiLicense: restaurant.fssaiLicense || '',
      billThanksMessage: restaurant.billThanksMessage || '',
      cgstRate: restaurant.cgstRate ?? 2.5,
      sgstRate: restaurant.sgstRate ?? 2.5,
    });
    setAdmin({
      name: restaurant.admin?.name || '',
      email: restaurant.admin?.email || '',
      isActive: restaurant.admin?.isActive ?? true,
      temporaryPassword: '',
    });
    setProfileFieldErrors({});
    setAdminFieldErrors({});
  }, [restaurant]);

  const profileMutation = useMutation({
    mutationFn: (payload) => api.updateSuperRestaurant(restaurant.id, payload),
    onSuccess: async () => {
      setProfileError(null);
      setProfileFieldErrors({});
      setProfileSaved(true);
      window.setTimeout(() => setProfileSaved(false), 2000);
      await onSaved?.();
    },
    onError: (error) => {
      setProfileError(error.message);
      setProfileFieldErrors(error.body?.details?.fields || error.body?.fields || {});
    },
  });

  const adminMutation = useMutation({
    mutationFn: (payload) => api.updateSuperRestaurantAdmin(restaurant.id, payload),
    onSuccess: async () => {
      setAdminError(null);
      setAdminFieldErrors({});
      setAdminSaved(true);
      setAdmin((prev) => ({ ...prev, temporaryPassword: '' }));
      window.setTimeout(() => setAdminSaved(false), 2000);
      await onSaved?.();
    },
    onError: (error) => {
      setAdminError(error.message);
      setAdminFieldErrors(error.body?.details?.fields || error.body?.fields || {});
    },
  });

  function saveProfile() {
    setProfileError(null);
    const nextErrors = {};
    const phoneError = validatePhoneField(profile.phone, { required: false });
    if (phoneError) nextErrors.phone = phoneError;
    const emailError = validateEmailField(profile.email, { required: false });
    if (emailError) nextErrors.email = emailError;
    if (Object.keys(nextErrors).length > 0) {
      setProfileFieldErrors(nextErrors);
      return;
    }
    setProfileFieldErrors({});
    profileMutation.mutate({
      ...profile,
      email: profile.email ? normalizeEmail(profile.email) : '',
      phone: profile.phone ? normalizePhone(profile.phone) : '',
      gstin: profile.gstin.trim() || null,
      fssaiLicense: profile.fssaiLicense.trim() || null,
      billThanksMessage: profile.billThanksMessage.trim(),
      cgstRate: Number(profile.cgstRate),
      sgstRate: Number(profile.sgstRate),
    });
  }

  function saveAdmin() {
    setAdminError(null);
    const emailError = validateEmailField(admin.email, { required: true, label: 'Admin email' });
    if (emailError) {
      setAdminFieldErrors({ email: emailError });
      return;
    }
    setAdminFieldErrors({});
    adminMutation.mutate({
      name: admin.name,
      email: normalizeEmail(admin.email),
      isActive: admin.isActive,
      temporaryPassword: admin.temporaryPassword || undefined,
    });
  }

  return (
    <div className="space-y-5">
      <Panel title="Edit restaurant" description="Update profile and activation status.">
        {profileError ? <Alert tone="error">{profileError}</Alert> : null}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="sa-name">
            <Input
              id="sa-name"
              value={profile.name}
              onChange={(event) => setProfile((prev) => ({ ...prev, name: event.target.value }))}
            />
          </Field>
          <Field label="Status" htmlFor="sa-status">
            <select
              id="sa-status"
              value={profile.status}
              onChange={(event) => setProfile((prev) => ({ ...prev, status: event.target.value }))}
              className="h-11 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm"
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="PENDING">Pending</option>
            </select>
          </Field>
          <Field label="Email" htmlFor="sa-email" error={profileFieldErrors.email}>
            <Input
              id="sa-email"
              type="email"
              autoComplete="email"
              value={profile.email}
              onChange={(event) => {
                setProfile((prev) => ({ ...prev, email: event.target.value }));
                setProfileFieldErrors((prev) => {
                  if (!prev.email) return prev;
                  const next = { ...prev };
                  delete next.email;
                  return next;
                });
              }}
            />
          </Field>
          <Field
            label="Phone"
            htmlFor="sa-phone"
            error={profileFieldErrors.phone}
            hint="10 digits only"
          >
            <Input
              id="sa-phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              maxLength={10}
              value={profile.phone}
              onChange={(event) => {
                setProfile((prev) => ({
                  ...prev,
                  phone: sanitizePhoneInput(event.target.value),
                }));
                setProfileFieldErrors((prev) => {
                  if (!prev.phone) return prev;
                  const next = { ...prev };
                  delete next.phone;
                  return next;
                });
              }}
              placeholder="9876543210"
            />
          </Field>
          <div className="sm:col-span-2">
            <LogoUploadField
              value={profile.logoUrl}
              onChange={(logoUrl) => setProfile((prev) => ({ ...prev, logoUrl }))}
            />
          </div>
          <div className="sm:col-span-2">
            <Field label="Description" htmlFor="sa-desc">
              <Textarea
                id="sa-desc"
                rows={3}
                value={profile.description}
                onChange={(event) =>
                  setProfile((prev) => ({ ...prev, description: event.target.value }))
                }
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Address" htmlFor="sa-address">
              <Textarea
                id="sa-address"
                rows={2}
                value={profile.address}
                onChange={(event) =>
                  setProfile((prev) => ({ ...prev, address: event.target.value }))
                }
              />
            </Field>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button disabled={profileMutation.isPending} onClick={saveProfile}>
            {profileMutation.isPending ? 'Saving…' : 'Save restaurant'}
          </Button>
          {profileSaved ? (
            <span className="text-sm font-semibold text-emerald-700">Saved</span>
          ) : null}
        </div>
      </Panel>

      <Panel
        title="Billing & compliance"
        description="GST and FSSAI appear on printed bills. Tax is exclusive of menu prices."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Enable GST" htmlFor="sa-gst-enabled">
            <select
              id="sa-gst-enabled"
              value={profile.gstEnabled ? 'yes' : 'no'}
              onChange={(event) =>
                setProfile((prev) => ({
                  ...prev,
                  gstEnabled: event.target.value === 'yes',
                }))
              }
              className="h-11 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm"
            >
              <option value="yes">Enabled</option>
              <option value="no">Disabled</option>
            </select>
          </Field>
          <Field label="GSTIN" htmlFor="sa-gstin" hint="15-character GST identification number">
            <Input
              id="sa-gstin"
              value={profile.gstin}
              onChange={(event) =>
                setProfile((prev) => ({
                  ...prev,
                  gstin: event.target.value.toUpperCase(),
                }))
              }
              placeholder="22AAAAA0000A1Z5"
              maxLength={15}
            />
          </Field>
          <Field label="CGST %" htmlFor="sa-cgst">
            <Input
              id="sa-cgst"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={profile.cgstRate}
              onChange={(event) =>
                setProfile((prev) => ({ ...prev, cgstRate: event.target.value }))
              }
            />
          </Field>
          <Field label="SGST %" htmlFor="sa-sgst">
            <Input
              id="sa-sgst"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={profile.sgstRate}
              onChange={(event) =>
                setProfile((prev) => ({ ...prev, sgstRate: event.target.value }))
              }
            />
          </Field>
          <Field label="FSSAI license" htmlFor="sa-fssai">
            <Input
              id="sa-fssai"
              value={profile.fssaiLicense}
              onChange={(event) =>
                setProfile((prev) => ({ ...prev, fssaiLicense: event.target.value }))
              }
              placeholder="Optional"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Bill thanks message" htmlFor="sa-thanks">
              <Textarea
                id="sa-thanks"
                rows={2}
                value={profile.billThanksMessage}
                onChange={(event) =>
                  setProfile((prev) => ({
                    ...prev,
                    billThanksMessage: event.target.value,
                  }))
                }
                placeholder="Thank you! Visit again."
              />
            </Field>
          </div>
        </div>
        <p className="mt-3 text-xs text-[var(--muted)]">
          Use Save restaurant above to persist billing fields with the profile.
        </p>
      </Panel>

      <Panel title="Manage admin account" description="Reset access for the restaurant admin.">
        {adminError ? <Alert tone="error">{adminError}</Alert> : null}
        {!restaurant.admin ? (
          <p className="text-sm text-[var(--muted)]">
            No admin account exists for this restaurant.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Admin name" htmlFor="sa-admin-name">
                <Input
                  id="sa-admin-name"
                  value={admin.name}
                  onChange={(event) => setAdmin((prev) => ({ ...prev, name: event.target.value }))}
                />
              </Field>
              <Field label="Admin email" htmlFor="sa-admin-email" error={adminFieldErrors.email}>
                <Input
                  id="sa-admin-email"
                  type="email"
                  autoComplete="off"
                  value={admin.email}
                  onChange={(event) => {
                    setAdmin((prev) => ({ ...prev, email: event.target.value }));
                    setAdminFieldErrors((prev) => {
                      if (!prev.email) return prev;
                      const next = { ...prev };
                      delete next.email;
                      return next;
                    });
                  }}
                />
              </Field>
              <Field label="New temporary password" htmlFor="sa-admin-pass" hint="Leave blank to keep current password.">
                <Input
                  id="sa-admin-pass"
                  type="password"
                  value={admin.temporaryPassword}
                  onChange={(event) =>
                    setAdmin((prev) => ({ ...prev, temporaryPassword: event.target.value }))
                  }
                  placeholder="Min 8 characters"
                />
              </Field>
              <Field label="Account status" htmlFor="sa-admin-active">
                <select
                  id="sa-admin-active"
                  value={admin.isActive ? 'active' : 'disabled'}
                  onChange={(event) =>
                    setAdmin((prev) => ({
                      ...prev,
                      isActive: event.target.value === 'active',
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm"
                >
                  <option value="active">Active</option>
                  <option value="disabled">Disabled</option>
                </select>
              </Field>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button disabled={adminMutation.isPending} onClick={saveAdmin}>
                {adminMutation.isPending ? 'Saving…' : 'Save admin'}
              </Button>
              {adminSaved ? (
                <span className="text-sm font-semibold text-emerald-700">Saved</span>
              ) : null}
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
