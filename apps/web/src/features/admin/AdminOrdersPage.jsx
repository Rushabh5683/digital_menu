import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  Clock3,
  Eye,
  LoaderCircle,
  Plus,
  Printer,
  Search,
  UtensilsCrossed,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { api } from '../../shared/api/client.js';
import { resolveMediaUrl } from '../../shared/lib/mediaUrl.js';
import { Alert } from '../../shared/ui/Alert.jsx';
import { Button } from '../../shared/ui/Button.jsx';
import { useAuth, UserRoles } from '../auth/AuthContext.jsx';
import { PaymentMethodModal } from './PaymentMethodModal.jsx';
import { useBillPrint } from './print/useBillPrint.jsx';
import {
  formatClock,
  formatMoney,
  formatOrderDisplayNumber,
} from './orderBillPrint.js';

const OPEN_STATUSES = new Set(['PLACED', 'ACCEPTED', 'PREPARING', 'READY']);

function formatRelative(value) {
  if (!value) return '';
  const mins = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (mins < 1) return 'Just now';
  if (mins === 1) return '1 min ago';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  return hours === 1 ? '1 hr ago' : `${hours} hr ago`;
}

function playNewOrderChime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.05, now + 0.02 + index * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28 + index * 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + index * 0.05);
      osc.stop(now + 0.4 + index * 0.08);
    });
    window.setTimeout(() => ctx.close().catch(() => {}), 800);
  } catch {
    // ignore
  }
}

function orderHasItems(order) {
  if (!order) return false;
  if (Array.isArray(order.items) && order.items.length > 0) return true;
  const count = Number(order.itemCount);
  return Number.isFinite(count) && count > 0;
}

/** free | occupied | billed — empty open tickets stay Free */
function tableFloorState(order) {
  if (!orderHasItems(order)) return 'free';
  if (order.billPrintedAt) return 'billed';
  return 'occupied';
}

export function AdminOrdersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [soundOn, setSoundOn] = useState(true);
  const [flashTableKeys, setFlashTableKeys] = useState(() => new Set());
  const [actionError, setActionError] = useState(null);
  const [completeTarget, setCompleteTarget] = useState(null);
  const knownPlacedIdsRef = useRef(null);
  const [nowTick, setNowTick] = useState(Date.now());
  const { printBill, printing: qzPrinting, printError, clearPrintError, printerModal } =
    useBillPrint();
  const canSettle = user?.role === UserRoles.RESTAURANT_ADMIN;

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const t = window.setInterval(() => setNowTick(Date.now()), 30000);
    return () => window.clearInterval(t);
  }, []);

  const restaurantQuery = useQuery({
    queryKey: ['admin', 'restaurant'],
    queryFn: async () => {
      const payload = await api.getAdminRestaurant();
      return payload.restaurant;
    },
  });

  const tablesQuery = useQuery({
    queryKey: ['admin', 'tables'],
    queryFn: async () => {
      const payload = await api.listAdminTables();
      return payload.tables || [];
    },
  });

  const ordersQuery = useQuery({
    queryKey: ['admin', 'orders', 'floor', debouncedSearch],
    queryFn: async () => {
      // Floor must include every open ticket — including prior-day unpaid bills.
      // Filtering by date:today hid guest adds that landed on yesterday's open order.
      const payload = await api.listAdminOrders({
        q: debouncedSearch || undefined,
        status: 'PLACED,ACCEPTED,PREPARING,READY',
        limit: 200,
      });
      return payload;
    },
    refetchInterval: 4000,
    refetchIntervalInBackground: true,
  });

  const restaurant = ordersQuery.data?.restaurant || restaurantQuery.data || user?.restaurant;
  const orders = ordersQuery.data?.orders || [];
  const tables = useMemo(
    () =>
      [...(tablesQuery.data || [])]
        .filter((table) => table.isActive !== false)
        .sort((a, b) => Number(a.tableNumber) - Number(b.tableNumber)),
    [tablesQuery.data],
  );

  const { occupiedByTable, anyOpenByTable } = useMemo(() => {
    const occupied = new Map();
    const anyOpen = new Map();

    const put = (map, order) => {
      if (order.tableNumber == null && !order.tableId) return;
      const key = order.tableId || `n-${order.tableNumber}`;
      const prev = map.get(key);
      if (!prev || new Date(order.createdAt) > new Date(prev.createdAt)) {
        map.set(key, order);
      }
      if (order.tableNumber != null) {
        map.set(`n-${order.tableNumber}`, map.get(key));
      }
    };

    for (const order of orders) {
      if (!OPEN_STATUSES.has(order.status)) continue;
      put(anyOpen, order);
      if (orderHasItems(order)) put(occupied, order);
    }
    return { occupiedByTable: occupied, anyOpenByTable: anyOpen };
  }, [orders]);

  const floorTiles = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    return tables
      .map((table) => {
        const order =
          occupiedByTable.get(table.id) ||
          occupiedByTable.get(`n-${table.tableNumber}`) ||
          null;
        const openTicket =
          anyOpenByTable.get(table.id) ||
          anyOpenByTable.get(`n-${table.tableNumber}`) ||
          null;
        return { table, order, openTicket };
      })
      .filter(({ table, order, openTicket }) => {
        if (!q) return true;
        const label = `table ${String(table.tableNumber).padStart(2, '0')}`;
        if (label.includes(q) || String(table.tableNumber).includes(q)) return true;
        const ticket = order || openTicket;
        if (!ticket) return false;
        const no = formatOrderDisplayNumber(ticket.orderNumber).toLowerCase();
        if (no.includes(q) || String(ticket.orderNumber || '').toLowerCase().includes(q)) {
          return true;
        }
        return (ticket.items || []).some((item) =>
          String(item.dishNameSnapshot || '')
            .toLowerCase()
            .includes(q),
        );
      });
  }, [tables, occupiedByTable, anyOpenByTable, debouncedSearch]);

  useEffect(() => {
    const placed = orders.filter(
      (order) => order.status === 'PLACED' && orderHasItems(order),
    );
    const ids = new Set(placed.map((order) => order.id));

    if (knownPlacedIdsRef.current == null) {
      knownPlacedIdsRef.current = ids;
      return;
    }

    const fresh = [...ids].filter((id) => !knownPlacedIdsRef.current.has(id));
    knownPlacedIdsRef.current = ids;
    if (fresh.length === 0) return;

    const tableKeys = new Set();
    for (const order of placed) {
      if (!fresh.includes(order.id)) continue;
      if (order.tableId) tableKeys.add(order.tableId);
      if (order.tableNumber != null) tableKeys.add(`n-${order.tableNumber}`);
    }

    setFlashTableKeys((prev) => {
      const next = new Set(prev);
      tableKeys.forEach((key) => next.add(key));
      return next;
    });

    if (soundOn) playNewOrderChime();

    const clearTimer = window.setTimeout(() => {
      setFlashTableKeys((prev) => {
        const next = new Set(prev);
        tableKeys.forEach((key) => next.delete(key));
        return next;
      });
    }, 12000);

    return () => window.clearTimeout(clearTimer);
  }, [orders, soundOn]);

  const statusMutation = useMutation({
    mutationFn: ({
      orderId,
      status,
      paymentMethod,
      paymentNote,
      paymentSplits,
      staffAppreciationAmount,
      appreciationCaptainIds,
    }) =>
      api.updateAdminOrderStatus(orderId, status, {
        paymentMethod,
        paymentNote,
        paymentSplits,
        staffAppreciationAmount,
        appreciationCaptainIds,
        businessDate: (() => {
          try {
            return sessionStorage.getItem('dm_day_end_edit_date') || undefined;
          } catch {
            return undefined;
          }
        })(),
      }),
    onMutate: () => setActionError(null),
    onError: (err) => setActionError(err.message || 'Could not update order'),
    onSuccess: () => setCompleteTarget(null),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'staff-appreciation'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'day-end'] });
    },
  });

  const printMutation = useMutation({
    mutationFn: async (order) => api.markAdminOrderBillPrinted(order.id),
    onMutate: () => setActionError(null),
    onError: (err) => setActionError(err.message || 'Could not mark bill printed'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'day-end'] });
    },
  });

  const startOrderMutation = useMutation({
    mutationFn: (table) => {
      let businessDate;
      try {
        businessDate = sessionStorage.getItem('dm_day_end_edit_date') || undefined;
      } catch {
        businessDate = undefined;
      }
      return api.startAdminTableOrder({
        tableId: table.id,
        tableNumber: table.tableNumber,
        businessDate,
      });
    },
    onMutate: () => setActionError(null),
    onError: (err) => setActionError(err.message || 'Could not open table order'),
    onSuccess: (payload) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'day-end'] });
      if (payload?.order?.id) {
        navigate(`/admin/orders/${payload.order.id}`);
      }
    },
  });

  const openTable = (table, order, openTicket) => {
    if (orderHasItems(order)) {
      navigate(`/admin/orders/${order.id}`);
      return;
    }
    if (openTicket?.id) {
      navigate(`/admin/orders/${openTicket.id}`);
      return;
    }
    startOrderMutation.mutate(table);
  };

  const handleFloorPrint = async (order) => {
    if (!order) return;
    setActionError(null);
    clearPrintError();
    await printBill({
      restaurant,
      order,
      cashierName: user?.name || 'Staff',
      onPrinted: async () => {
        await printMutation.mutateAsync(order);
      },
    });
  };

  const occupiedCount = floorTiles.filter((tile) => tile.order).length;
  const billedCount = floorTiles.filter((tile) => tableFloorState(tile.order) === 'billed').length;
  void nowTick;

  let dayEndEditDate = null;
  try {
    dayEndEditDate = sessionStorage.getItem('dm_day_end_edit_date');
  } catch {
    dayEndEditDate = null;
  }

  return (
    <div className="ops-board -mx-1 space-y-5 menu-fade-up sm:-mx-0">
      {dayEndEditDate ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p>
            <span className="font-semibold">Adding / correcting bills for {dayEndEditDate}.</span>{' '}
            Settled tickets will be saved on that date (not today).
          </p>
          <button
            type="button"
            className="text-xs font-semibold underline underline-offset-2"
            onClick={() => {
              try {
                sessionStorage.removeItem('dm_day_end_edit_date');
              } catch {
                // ignore
              }
              window.location.reload();
            }}
          >
            Exit date edit
          </button>
        </div>
      ) : null}
      <header className="relative overflow-hidden rounded-[1.5rem] border border-[var(--line)] bg-[var(--ink)] px-5 py-5 text-white shadow-[0_24px_50px_-32px_rgba(15,31,28,0.65)] sm:px-7 sm:py-6">
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            backgroundImage:
              'radial-gradient(circle at 12% 20%, rgba(201,162,39,0.28), transparent 42%), radial-gradient(circle at 88% 0%, rgba(45,122,110,0.35), transparent 46%), linear-gradient(135deg, rgba(255,255,255,0.04), transparent 55%)',
          }}
        />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
              Live floor · Tables
            </p>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-white p-1">
                {restaurant?.logoUrl ? (
                  <img
                    src={resolveMediaUrl(restaurant.logoUrl)}
                    alt=""
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <UtensilsCrossed size={20} className="text-white/80" />
                )}
              </div>
              <div className="min-w-0">
                <h2
                  className="truncate text-3xl tracking-tight sm:text-4xl"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {restaurant?.name || 'Your restaurant'}
                </h2>
                <p className="mt-1 text-sm text-white/60">
                  {canSettle
                    ? 'Tap any table to open it. Free tables start a walk-in order — no guest scan needed. Use Print for the bill; complete after payment.'
                    : 'Tap any table to open it and add or edit items. Print and settle are done by the restaurant admin.'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-white/80">
              {occupiedCount}/{tables.length} occupied
              {billedCount > 0 ? ` · ${billedCount} billed` : ''}
            </span>
            {occupiedCount > 0 ? (
              <span className="ops-new-pill inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-[var(--ink)]">
                <span className="ops-pulse-dot h-2 w-2 rounded-full bg-[var(--ink)]" />
                Live
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-white/70">
                All free
              </span>
            )}
            <button
              type="button"
              onClick={() => setSoundOn((v) => !v)}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/10"
              aria-pressed={soundOn}
            >
              {soundOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
              {soundOn ? 'Sound on' : 'Sound off'}
            </button>
            <button
              type="button"
              onClick={() => ordersQuery.refetch()}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/10"
            >
              {ordersQuery.isFetching ? (
                <LoaderCircle size={14} className="animate-spin" />
              ) : (
                <Clock3 size={14} />
              )}
              Refresh
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-white/90 p-3 shadow-[0_16px_40px_-30px_rgba(15,31,28,0.4)] sm:flex-row sm:items-center sm:p-4">
        <label className="relative min-w-0 w-full flex-1 sm:min-w-[12rem]">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search table #, order #, or dish…"
            className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] py-2.5 pl-9 pr-3 text-sm outline-none ring-[var(--teal)] focus:ring-2"
          />
        </label>
        <FloorColourLegend />
      </div>

      {actionError || printError ? (
        <Alert tone="error">
          {actionError || printError}
          <button
            type="button"
            className="ml-2 text-sm font-semibold underline"
            onClick={() => {
              setActionError(null);
              clearPrintError();
            }}
          >
            Dismiss
          </button>
        </Alert>
      ) : null}

      {ordersQuery.error || tablesQuery.error ? (
        <Alert tone="error">
          {ordersQuery.error?.message || tablesQuery.error?.message}
          <div className="mt-3">
            <Button
              size="sm"
              onClick={() => {
                ordersQuery.refetch();
                tablesQuery.refetch();
              }}
            >
              Retry
            </Button>
          </div>
        </Alert>
      ) : null}

      {tablesQuery.isLoading || ordersQuery.isLoading ? (
        <FloorSkeleton />
      ) : tables.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--line)] bg-white/70 px-6 py-16 text-center">
          <p className="text-lg font-semibold text-[var(--ink)]">No tables yet</p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Add tables under Tables, then guest QR orders will light them up here.
          </p>
        </div>
      ) : (
        <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
          {floorTiles.map(({ table, order, openTicket }) => {
            const flashing =
              flashTableKeys.has(table.id) || flashTableKeys.has(`n-${table.tableNumber}`);
            return (
              <TableFloorTile
                key={table.id}
                table={table}
                order={order}
                flashing={flashing}
                opening={
                  startOrderMutation.isPending &&
                  startOrderMutation.variables?.id === table.id
                }
                onOpen={() => openTable(table, order, openTicket)}
                onPrint={canSettle ? () => handleFloorPrint(order) : null}
                onComplete={canSettle ? () => order && setCompleteTarget(order) : null}
                canSettle={canSettle}
                completing={
                  statusMutation.isPending &&
                  statusMutation.variables?.orderId === order?.id
                }
                printing={
                  (qzPrinting || printMutation.isPending) &&
                  printMutation.variables?.id === order?.id
                }
              />
            );
          })}
        </div>
      )}

      <PaymentMethodModal
        open={Boolean(completeTarget)}
        orderLabel={
          completeTarget
            ? `${
                completeTarget.tableLabel ||
                (completeTarget.tableNumber != null
                  ? `Table ${String(completeTarget.tableNumber).padStart(2, '0')}`
                  : 'Table')
              } · #${formatOrderDisplayNumber(completeTarget.orderNumber)}`
            : ''
        }
        totalLabel={completeTarget ? formatMoney(completeTarget.total) : ''}
        orderTotal={completeTarget ? Number(completeTarget.total || 0) : 0}
        busy={statusMutation.isPending}
        onCancel={() => setCompleteTarget(null)}
        onConfirm={(payment) =>
          statusMutation.mutate({
            orderId: completeTarget.id,
            status: 'COMPLETED',
            ...payment,
          })
        }
      />
      {printerModal}
    </div>
  );
}

function FloorColourLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-semibold text-[var(--ink-soft,#5c564c)]">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-full bg-[#c4c0b8] ring-1 ring-black/10" />
        Free
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-full bg-[var(--accent)] ring-1 ring-black/10" />
        Occupied
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-full bg-[var(--teal)] ring-1 ring-black/10" />
        Bill printed
      </span>
    </div>
  );
}

function TableFloorTile({
  table,
  order,
  flashing,
  onOpen,
  onPrint,
  onComplete,
  canSettle = true,
  completing,
  printing,
  opening,
}) {
  const state = tableFloorState(order);
  const label = `T${String(table.tableNumber).padStart(2, '0')}`;
  const displayNo = order ? formatOrderDisplayNumber(order.orderNumber) : null;
  const itemCount = (order?.items || []).reduce(
    (sum, item) => sum + (Number(item.quantity) || 0),
    0,
  );

  const shell =
    state === 'billed'
      ? 'border-[var(--teal)]/55 bg-[linear-gradient(165deg,rgba(45,122,110,0.22),#fff_44%)] ring-1 ring-[var(--teal)]/25'
      : state === 'occupied'
        ? 'border-[var(--accent)]/55 bg-[linear-gradient(165deg,rgba(201,162,39,0.18),#fff_42%)] ring-1 ring-[var(--accent)]/20'
        : 'border-[var(--line)] bg-[#eceae6]/90 hover:border-[var(--ink)]/25 hover:bg-white';

  const topBar =
    state === 'billed'
      ? 'bg-[linear-gradient(90deg,var(--teal),#7ec8bc,var(--teal))]'
      : state === 'occupied'
        ? 'bg-[linear-gradient(90deg,var(--accent),#e8d48a,var(--accent))]'
        : null;

  const statusLabel =
    state === 'billed' ? 'Bill printed' : state === 'occupied' ? 'Occupied' : 'Free';
  const statusTone =
    state === 'billed'
      ? 'text-[var(--teal)]'
      : state === 'occupied'
        ? 'text-[var(--accent-deep)]'
        : 'text-[var(--muted)]';

  return (
    <article
      className={[
        'relative flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border p-2.5 shadow-[0_10px_22px_-20px_rgba(15,31,28,0.45)] transition sm:p-3',
        shell,
        flashing ? 'ops-card-flash' : '',
        opening ? 'opacity-70' : '',
      ].join(' ')}
    >
      {topBar ? <div className={`absolute inset-x-0 top-0 h-0.5 ${topBar}`} /> : null}

      <div className="flex min-w-0 items-start justify-between gap-1.5">
        <div className="min-w-0">
          <p
            className="truncate text-lg leading-tight tracking-tight text-[var(--ink)] sm:text-xl"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {label}
          </p>
          <p className={['mt-0.5 text-[9px] font-bold uppercase tracking-[0.12em]', statusTone].join(' ')}>
            {statusLabel}
          </p>
        </div>
        {order ? (
          <span
            className={[
              'max-w-[42%] shrink-0 truncate rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white',
              state === 'billed' ? 'bg-[var(--teal)]' : 'bg-[var(--ink)]',
            ].join(' ')}
          >
            #{displayNo}
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-black/[0.06] px-1.5 py-0.5 text-[9px] font-semibold text-[var(--muted)]">
            Idle
          </span>
        )}
      </div>

      {order ? (
        <>
          <button
            type="button"
            onClick={onOpen}
            className="mt-2 min-w-0 flex-1 space-y-0.5 text-left"
          >
            <p className="truncate text-xs font-semibold text-[var(--ink)] sm:text-sm">
              {itemCount} item{itemCount === 1 ? '' : 's'} · {formatMoney(order.total)}
            </p>
            <p className="truncate text-[10px] text-[var(--muted)]">
              {formatClock(order.createdAt)} · {formatRelative(order.createdAt)}
            </p>
            <ul className="mt-0.5 min-w-0 space-y-0">
              {(order.items || []).slice(0, 1).map((item) => (
                <li key={item.id} className="truncate text-[10px] text-[var(--ink-soft,#5c564c)]">
                  {item.dishNameSnapshot} × {item.quantity}
                </li>
              ))}
              {(order.items || []).length > 1 ? (
                <li className="text-[9px] text-[var(--muted)]">
                  +{(order.items || []).length - 1} more
                </li>
              ) : null}
              {(order.items || []).length === 0 ? (
                <li className="text-[10px] text-[var(--muted)]">No items yet — tap Open</li>
              ) : null}
            </ul>
          </button>

          <div className="mt-2 flex min-w-0 flex-col gap-1.5">
            <div className="grid min-w-0 grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={onOpen}
                className="inline-flex min-h-9 w-full min-w-0 items-center justify-center gap-1 overflow-hidden rounded-lg border border-[var(--line)] bg-white px-1.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.05em] text-[var(--ink)] hover:bg-[var(--surface)]"
              >
                <Eye size={12} className="shrink-0" />
                <span className="truncate">Open</span>
              </button>
              {canSettle ? (
                <button
                  type="button"
                  disabled={printing || itemCount === 0}
                  onClick={onPrint}
                  className={[
                    'inline-flex min-h-9 w-full min-w-0 items-center justify-center gap-1 overflow-hidden rounded-lg border px-1.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.05em] disabled:opacity-60',
                    state === 'billed'
                      ? 'border-[var(--teal)]/40 bg-[var(--teal)]/15 text-[var(--teal)] hover:bg-[var(--teal)]/25'
                      : 'border-[var(--accent)]/40 bg-[var(--accent)]/15 text-[var(--accent-deep)] hover:bg-[var(--accent)]/25',
                  ].join(' ')}
                >
                  {printing ? (
                    <LoaderCircle size={12} className="shrink-0 animate-spin" />
                  ) : (
                    <Printer size={12} className="shrink-0" />
                  )}
                  <span className="truncate">Print</span>
                </button>
              ) : null}
            </div>
            {canSettle ? (
              <button
                type="button"
                disabled={completing || itemCount === 0}
                onClick={onComplete}
                className="inline-flex min-h-9 w-full min-w-0 items-center justify-center gap-1 overflow-hidden rounded-lg bg-[var(--ink)] px-1.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-white hover:bg-black disabled:opacity-60"
              >
                {completing ? (
                  <LoaderCircle size={12} className="shrink-0 animate-spin" />
                ) : (
                  <Check size={12} className="shrink-0" />
                )}
                <span className="truncate">Complete</span>
              </button>
            ) : null}
          </div>
        </>
      ) : (
        <button
          type="button"
          disabled={opening}
          onClick={onOpen}
          className="mt-2 flex min-w-0 flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-[var(--line)] bg-white/70 px-1.5 py-2.5 text-center transition hover:border-[var(--ink)]/30 hover:bg-white disabled:opacity-60 sm:py-3"
        >
          {opening ? (
            <LoaderCircle size={16} className="animate-spin text-[var(--muted)]" />
          ) : (
            <Plus size={16} className="text-[var(--ink)]" />
          )}
          <p className="mt-1 text-xs font-semibold text-[var(--ink)]">
            {opening ? 'Opening…' : 'Start order'}
          </p>
          <p className="mt-0.5 text-[10px] text-[var(--muted)]">Tap to add</p>
        </button>
      )}
    </article>
  );
}

function FloorSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="min-h-[8.5rem] animate-pulse rounded-xl border border-[var(--line)] bg-white/70"
        />
      ))}
    </div>
  );
}
