import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Check,
  LoaderCircle,
  Minus,
  Plus,
  Printer,
  Save,
  Search,
  Trash2,
} from 'lucide-react';
import { api } from '../../shared/api/client.js';
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

const EDITABLE = new Set(['PLACED', 'ACCEPTED', 'PREPARING', 'READY']);

/**
 * PetPooja-style order editor: categories + dishes on the left, live order on the right.
 */
export function AdminOrderEditorPage() {
  const { user } = useAuth();
  const canSettle = user?.role === UserRoles.RESTAURANT_ADMIN;
  const { orderId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [dishSearch, setDishSearch] = useState('');
  const [addingDishId, setAddingDishId] = useState(null);
  const [saveFlash, setSaveFlash] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const { printBill, printing: qzPrinting, printError, clearPrintError, printerModal } =
    useBillPrint();

  const orderQuery = useQuery({
    queryKey: ['admin', 'order', orderId],
    queryFn: async () => {
      const payload = await api.getAdminOrder(orderId);
      return payload.order;
    },
    enabled: Boolean(orderId),
    refetchInterval: 5000,
  });

  const restaurantQuery = useQuery({
    queryKey: ['admin', 'restaurant'],
    queryFn: async () => {
      const payload = await api.getAdminRestaurant();
      return payload.restaurant;
    },
  });

  const dishesQuery = useQuery({
    queryKey: ['admin', 'dishes', 'order-editor'],
    queryFn: async () => {
      const payload = await api.listAdminDishes({ limit: 500 });
      return payload.dishes || [];
    },
  });

  const order = orderQuery.data;
  const canEdit = Boolean(order && EDITABLE.has(order.status));
  const restaurant = restaurantQuery.data;

  const categories = useMemo(() => {
    const map = new Map();
    for (const dish of dishesQuery.data || []) {
      if (dish.isAvailable === false) continue;
      const id = dish.categoryId || 'uncategorized';
      const name = dish.categoryName || 'Other';
      if (!map.has(id)) map.set(id, { id, name, count: 0 });
      map.get(id).count += 1;
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [dishesQuery.data]);

  const activeCategoryId = selectedCategoryId || categories[0]?.id || null;

  const dishesInCategory = useMemo(() => {
    const rows = (dishesQuery.data || []).filter((dish) => dish.isAvailable !== false);
    const q = dishSearch.trim().toLowerCase();
    return rows.filter((dish) => {
      const catId = dish.categoryId || 'uncategorized';
      if (activeCategoryId && catId !== activeCategoryId) return false;
      if (!q) return true;
      return String(dish.name || '')
        .toLowerCase()
        .includes(q);
    });
  }, [dishesQuery.data, activeCategoryId, dishSearch]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'order', orderId] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
  };

  const qtyMutation = useMutation({
    mutationFn: ({ itemId, quantity }) =>
      api.updateAdminOrderItem(orderId, itemId, quantity),
    onMutate: () => setError(null),
    onError: (err) => setError(err.message || 'Could not update quantity'),
    onSuccess: invalidate,
  });

  const removeMutation = useMutation({
    mutationFn: (itemId) => api.deleteAdminOrderItem(orderId, itemId),
    onMutate: () => setError(null),
    onError: (err) => setError(err.message || 'Could not remove item'),
    onSuccess: (payload) => {
      if (payload?.deleted) {
        invalidate();
        navigate('/admin/orders');
        return;
      }
      invalidate();
    },
  });

  const addMutation = useMutation({
    mutationFn: (dishId) => api.addAdminOrderItems(orderId, [{ dishId, quantity: 1 }]),
    onMutate: (dishId) => {
      setError(null);
      setAddingDishId(dishId);
    },
    onError: (err) => setError(err.message || 'Could not add item'),
    onSettled: () => setAddingDishId(null),
    onSuccess: invalidate,
  });

  const printMutation = useMutation({
    mutationFn: async () => api.markAdminOrderBillPrinted(orderId),
    onError: (err) => setError(err.message || 'Could not mark bill printed'),
    onSuccess: () => invalidate(),
  });

  const handlePrint = async () => {
    const currentOrder = orderQuery.data;
    const currentRestaurant = restaurantQuery.data;
    if (!currentOrder) return;
    setError(null);
    clearPrintError();
    await printBill({
      restaurant: currentRestaurant,
      order: currentOrder,
      onPrinted: async () => {
        await printMutation.mutateAsync();
      },
    });
  };

  const completeMutation = useMutation({
    mutationFn: ({ paymentMethod, paymentNote }) =>
      api.updateAdminOrderStatus(orderId, 'COMPLETED', { paymentMethod, paymentNote }),
    onMutate: () => setError(null),
    onError: (err) => setError(err.message || 'Could not complete order'),
    onSuccess: () => {
      setPaymentOpen(false);
      invalidate();
      navigate('/admin/orders');
    },
  });

  const leaveToFloor = async () => {
    const current = orderQuery.data;
    const empty = !(current?.items || []).length;
    if (empty && current?.id && EDITABLE.has(current.status)) {
      try {
        await api.discardAdminEmptyOrder(current.id);
        invalidate();
      } catch {
        // still navigate home
      }
    }
    navigate('/admin/orders');
  };

  const handleSave = async () => {
    setSaveFlash(true);
    const current = orderQuery.data;
    const empty = !(current?.items || []).length;
    if (empty && current?.id && EDITABLE.has(current.status)) {
      try {
        await api.discardAdminEmptyOrder(current.id);
        invalidate();
      } catch (err) {
        setError(err.message || 'Could not close empty order');
        setSaveFlash(false);
        return;
      }
      setSaveFlash(false);
      navigate('/admin/orders');
      return;
    }
    window.setTimeout(() => {
      setSaveFlash(false);
      navigate('/admin/orders');
    }, 650);
  };

  if (orderQuery.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-2 text-[var(--muted)]">
        <LoaderCircle className="animate-spin" size={18} />
        Loading order…
      </div>
    );
  }

  if (orderQuery.error || !order) {
    return (
      <div className="space-y-4">
        <Alert tone="error">{orderQuery.error?.message || 'Order not found'}</Alert>
        <Button onClick={() => navigate('/admin/orders')}>Back to tables</Button>
      </div>
    );
  }

  const items = order.items || [];
  const displayNo = formatOrderDisplayNumber(order.orderNumber);
  const table =
    order.tableLabel ||
    (order.tableNumber != null
      ? `Table ${String(order.tableNumber).padStart(2, '0')}`
      : 'Table —');
  const lineBusy =
    qtyMutation.isPending || removeMutation.isPending || addMutation.isPending;
  const billed = Boolean(order.billPrintedAt);

  return (
    <div className="ops-board -mx-1 flex min-h-[calc(100vh-7rem)] flex-col gap-3 sm:-mx-0">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-white/95 px-4 py-3 shadow-[0_12px_28px_-24px_rgba(15,31,28,0.4)]">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            to="/admin/orders"
            onClick={(event) => {
              event.preventDefault();
              leaveToFloor();
            }}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--surface)]"
            aria-label="Back to tables"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--teal)]">
              {table}
              {billed ? ' · Bill printed' : ''}
            </p>
            <h1
              className="truncate text-2xl text-[var(--ink)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Order #{displayNo}
            </h1>
            <p className="text-xs text-[var(--muted)]">
              {formatClock(order.createdAt)} · {order.status.replaceAll('_', ' ')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            disabled={!canEdit || saveFlash}
            onClick={handleSave}
            className="gap-1.5"
          >
            {saveFlash ? <Check size={16} /> : <Save size={16} />}
            {saveFlash ? 'Saved' : 'Save'}
          </Button>
          {canSettle ? (
            <Button
              variant="secondary"
              disabled={qzPrinting || printMutation.isPending || items.length === 0}
              onClick={handlePrint}
              className="gap-1.5"
            >
              {qzPrinting || printMutation.isPending ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <Printer size={16} />
              )}
              Print
            </Button>
          ) : null}
          {canEdit && canSettle ? (
            <Button
              className="gap-1.5"
              disabled={items.length === 0}
              onClick={() => setPaymentOpen(true)}
            >
              <Check size={16} />
              Complete
            </Button>
          ) : null}
        </div>
      </header>

      {error || printError ? (
        <Alert tone="error">
          {error || printError}
          <button
            type="button"
            className="ml-2 text-sm font-semibold underline"
            onClick={() => {
              setError(null);
              clearPrintError();
            }}
          >
            Dismiss
          </button>
        </Alert>
      ) : null}

      {!canEdit ? (
        <Alert tone="info">This ticket is closed — view only.</Alert>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
        {/* Left: categories + dishes */}
        <section className="flex min-h-[22rem] overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-[0_12px_28px_-24px_rgba(15,31,28,0.35)]">
          <aside className="w-[8.5rem] shrink-0 border-r border-[var(--line)] bg-[var(--surface)]/80 sm:w-44">
            <p className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
              Menu
            </p>
            <ul className="max-h-[min(70vh,36rem)] space-y-0.5 overflow-y-auto px-1.5 pb-3">
              {dishesQuery.isLoading ? (
                <li className="px-2 py-3 text-xs text-[var(--muted)]">Loading…</li>
              ) : categories.length === 0 ? (
                <li className="px-2 py-3 text-xs text-[var(--muted)]">No categories</li>
              ) : (
                categories.map((cat) => {
                  const active = cat.id === activeCategoryId;
                  return (
                    <li key={cat.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedCategoryId(cat.id)}
                        className={[
                          'flex w-full flex-col rounded-xl px-2.5 py-2.5 text-left transition',
                          active
                            ? 'bg-[var(--ink)] text-white'
                            : 'text-[var(--ink)] hover:bg-white',
                        ].join(' ')}
                      >
                        <span className="truncate text-sm font-semibold">{cat.name}</span>
                        <span
                          className={[
                            'text-[10px]',
                            active ? 'text-white/70' : 'text-[var(--muted)]',
                          ].join(' ')}
                        >
                          {cat.count} dish{cat.count === 1 ? '' : 'es'}
                        </span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="border-b border-[var(--line)] px-3 py-2.5">
              <label className="relative block">
                <Search
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
                />
                <input
                  value={dishSearch}
                  onChange={(e) => setDishSearch(e.target.value)}
                  placeholder="Search dishes in this category…"
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] py-2 pl-9 pr-3 text-sm outline-none ring-[var(--teal)] focus:ring-2"
                />
              </label>
            </div>
            <ul className="max-h-[min(70vh,36rem)] flex-1 space-y-1 overflow-y-auto p-2 sm:p-3">
              {!canEdit ? (
                <li className="px-2 py-8 text-center text-sm text-[var(--muted)]">
                  Editing locked for closed orders
                </li>
              ) : dishesInCategory.length === 0 ? (
                <li className="px-2 py-8 text-center text-sm text-[var(--muted)]">
                  Select a category or adjust search
                </li>
              ) : (
                dishesInCategory.map((dish) => (
                  <li key={dish.id}>
                    <button
                      type="button"
                      disabled={lineBusy}
                      onClick={() => addMutation.mutate(dish.id)}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left hover:border-[var(--line)] hover:bg-[var(--surface)] disabled:opacity-50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-[var(--ink)]">
                          {dish.name}
                          {addingDishId === dish.id ? '…' : ''}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-bold text-[var(--teal)]">
                        {formatMoney(dish.price)}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </section>

        {/* Right: current order */}
        <section className="flex min-h-[22rem] flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-[0_12px_28px_-24px_rgba(15,31,28,0.35)]">
          <div className="border-b border-[var(--line)] px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
              Current order
            </p>
            <p className="mt-0.5 text-sm text-[var(--ink-soft,#5c564c)]">
              {items.length} line{items.length === 1 ? '' : 's'} · tap dishes on the left to add
            </p>
          </div>

          <ul className="max-h-[min(55vh,28rem)] flex-1 space-y-2 overflow-y-auto px-3 py-3">
            {items.length === 0 ? (
              <li className="rounded-xl border border-dashed border-[var(--line)] px-3 py-10 text-center text-sm text-[var(--muted)]">
                No items yet — pick a category and tap dishes on the left
              </li>
            ) : (
              items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)]/70 px-2.5 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--ink)]">
                      {item.dishNameSnapshot || item.dishName}
                    </p>
                    <p className="text-[11px] text-[var(--muted)]">
                      {formatMoney(item.priceSnapshot)} each
                    </p>
                  </div>
                  {canEdit ? (
                    <div className="inline-flex items-center gap-0.5 rounded-full border border-[var(--line)] bg-white p-0.5">
                      <button
                        type="button"
                        disabled={lineBusy || item.quantity <= 1}
                        className="rounded-full p-1.5 disabled:opacity-40"
                        onClick={() =>
                          qtyMutation.mutate({
                            itemId: item.id,
                            quantity: item.quantity - 1,
                          })
                        }
                        aria-label="Decrease quantity"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="min-w-6 text-center text-sm font-bold">{item.quantity}</span>
                      <button
                        type="button"
                        disabled={lineBusy || item.quantity >= 20}
                        className="rounded-full p-1.5 disabled:opacity-40"
                        onClick={() =>
                          qtyMutation.mutate({
                            itemId: item.id,
                            quantity: item.quantity + 1,
                          })
                        }
                        aria-label="Increase quantity"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  ) : (
                    <span className="text-sm font-semibold">× {item.quantity}</span>
                  )}
                  <span className="w-14 shrink-0 text-right text-sm font-bold text-[var(--teal)]">
                    {formatMoney(item.subtotal)}
                  </span>
                  {canEdit ? (
                    <button
                      type="button"
                      disabled={lineBusy}
                      className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-red-50 hover:text-[var(--danger)] disabled:opacity-40"
                      onClick={() => removeMutation.mutate(item.id)}
                      aria-label="Remove item"
                    >
                      <Trash2 size={14} />
                    </button>
                  ) : null}
                </li>
              ))
            )}
          </ul>

          <div className="mt-auto border-t border-[var(--line)] px-4 py-4">
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between text-[var(--muted)]">
                <span>Subtotal</span>
                <span className="font-medium text-[var(--ink)]">{formatMoney(order.subtotal)}</span>
              </div>
              {Number(order.taxAmount) > 0 ? (
                <>
                  <div className="flex items-center justify-between text-[var(--muted)]">
                    <span>CGST ({Number(order.cgstRate) || 0}%)</span>
                    <span className="font-medium text-[var(--ink)]">
                      {formatMoney(order.cgstAmount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[var(--muted)]">
                    <span>SGST ({Number(order.sgstRate) || 0}%)</span>
                    <span className="font-medium text-[var(--ink)]">
                      {formatMoney(order.sgstAmount)}
                    </span>
                  </div>
                  {Number(order.roundOffAmount) !== 0 ? (
                    <div className="flex items-center justify-between text-[var(--muted)]">
                      <span>Round off</span>
                      <span className="font-medium text-[var(--ink)]">
                        {Number(order.roundOffAmount) > 0 ? '+' : ''}
                        {formatMoney(order.roundOffAmount)}
                      </span>
                    </div>
                  ) : null}
                </>
              ) : null}
              <div className="flex items-center justify-between border-t border-[var(--line)] pt-2">
                <span className="font-semibold text-[var(--ink)]">Total</span>
                <span className="text-xl font-bold text-[var(--teal)]">
                  {formatMoney(order.total)}
                </span>
              </div>
            </div>
            {order.customerNote ? (
              <p className="mt-2 text-xs text-[var(--muted)]">Note: {order.customerNote}</p>
            ) : null}
          </div>
        </section>
      </div>

      <PaymentMethodModal
        open={paymentOpen}
        orderLabel={`${table} · #${displayNo}`}
        totalLabel={formatMoney(order.total)}
        busy={completeMutation.isPending}
        onCancel={() => setPaymentOpen(false)}
        onConfirm={(payment) => completeMutation.mutate(payment)}
      />
      {printerModal}
    </div>
  );
}
