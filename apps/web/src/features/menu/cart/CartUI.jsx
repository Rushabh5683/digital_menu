import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { api } from '../../../shared/api/client.js';
import { computeExclusiveGst } from '../../../shared/lib/gst.js';
import { Alert } from '../../../shared/ui/Alert.jsx';
import { Button } from '../../../shared/ui/Button.jsx';
import { formatPrice } from '../lib/menuUtils.js';
import { formatOrderDisplayNumber } from './orderStatus.js';
import { OrderStatusPanel } from './OrderStatusPanel.jsx';

export function CartBar({ itemCount, total, onOpen, hasOpenOrder }) {
  if (itemCount <= 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(0.85rem,env(safe-area-inset-bottom))]">
      <button
        type="button"
        onClick={onOpen}
        className="pointer-events-auto mx-auto flex w-full max-w-lg items-center justify-between gap-3 rounded-2xl bg-[var(--ink)] px-4 py-3.5 text-left text-white shadow-[0_18px_40px_-18px_rgba(15,31,28,0.75)] transition hover:bg-black"
      >
        <span className="inline-flex items-center gap-3">
          <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
            <ShoppingBag size={18} />
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-bold text-[var(--ink)]">
              {itemCount}
            </span>
          </span>
          <span>
            <span className="block text-sm font-bold">View cart</span>
            <span className="block text-xs text-white/65">
              {hasOpenOrder ? 'Add to your open order' : 'Review & place order'}
            </span>
          </span>
        </span>
        <span className="text-sm font-bold text-[var(--accent)]">{formatPrice(total)}</span>
      </button>
    </div>
  );
}

export function CartDrawer({
  open,
  onClose,
  cart,
  restaurantName,
  tableLabel,
  tableNumber,
  restaurantSlug,
  anonymousSessionId,
  openOrder,
  gstConfig = null,
  onIncrement,
  onDecrement,
  onRemove,
  onClear,
  onPlaced,
}) {
  const [step, setStep] = useState('cart'); // cart | review | success
  const [error, setError] = useState(null);
  const [placing, setPlacing] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null);
  const [wasAdd, setWasAdd] = useState(false);

  const isAdding = Boolean(openOrder?.id);
  const openDisplayNo = openOrder
    ? formatOrderDisplayNumber(openOrder.orderNumber)
    : null;

  const taxEstimate = useMemo(
    () => computeExclusiveGst(cart?.subtotal || 0, gstConfig || {}),
    [cart?.subtotal, gstConfig],
  );
  const displayTotal = taxEstimate.total;

  if (!open) return null;

  async function submitCart() {
    setError(null);
    setPlacing(true);
    const payload = {
      restaurantSlug,
      anonymousSessionId,
      tableNumber,
      items: cart.items.map((item) => ({
        dishId: item.dishId,
        quantity: item.quantity,
      })),
    };

    try {
      let result;
      let added = false;

      if (openOrder?.id) {
        result = await api.addOrderItems(openOrder.id, payload);
        added = true;
      } else {
        try {
          result = await api.placeOrder(payload);
        } catch (err) {
          // Table already has an open ticket — append instead.
          const existing = err.body?.details?.openOrder;
          if (err.status === 409 && existing?.id) {
            result = await api.addOrderItems(existing.id, payload);
            added = true;
          } else {
            throw err;
          }
        }
      }

      setWasAdd(added);
      setPlacedOrder(result.order);
      onClear();
      setStep('success');
      onPlaced?.(result.order);
    } catch (err) {
      setError(err.message || 'Could not place order');
    } finally {
      setPlacing(false);
    }
  }

  function handleClose() {
    setError(null);
    if (step === 'success') {
      setStep('cart');
      setPlacedOrder(null);
      setWasAdd(false);
    }
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-title"
    >
      <button
        type="button"
        className="drawer-backdrop absolute inset-0 bg-[var(--g-ink)]/35 backdrop-blur-[2px]"
        aria-label="Close cart"
        onClick={handleClose}
      />

      <div className="drawer-panel relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-[var(--g-line-strong)] bg-[var(--g-bg-base)] shadow-[0_28px_60px_rgba(60,40,15,0.22)] sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--g-line)] bg-[var(--g-bg-elevated)] px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--g-accent-deep)]">
              {step === 'success'
                ? 'Confirmation'
                : step === 'review'
                  ? 'Checkout'
                  : 'Your cart'}
            </p>
            <h2
              id="cart-title"
              className="guest-menu-label mt-1 text-2xl font-semibold text-[var(--g-ink)]"
            >
              {step === 'success'
                ? wasAdd
                  ? 'Items added'
                  : 'Order received'
                : step === 'review'
                  ? isAdding
                    ? 'Add to order'
                    : 'Review order'
                  : 'Cart'}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full border border-[var(--g-line)] bg-white p-2 text-[var(--g-ink-soft)] hover:bg-[var(--g-bg-deep)] hover:text-[var(--g-ink)]"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {error ? <Alert tone="error">{error}</Alert> : null}

          {step === 'success' && placedOrder ? (
            <OrderStatusPanel
              order={placedOrder}
              restaurantName={restaurantName}
              tableLabel={tableLabel}
              restaurantSlug={restaurantSlug}
              anonymousSessionId={anonymousSessionId}
              tableNumber={tableNumber}
              added={wasAdd}
              onClose={handleClose}
              onAddMore={() => {
                handleClose();
              }}
              closeLabel="Back to menu"
            />
          ) : null}

          {step !== 'success' && cart.items.length === 0 ? (
            <EmptyCart hasOpenOrder={isAdding} />
          ) : null}

          {step !== 'success' && cart.items.length > 0 ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)]/80 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                  Ordering at
                </p>
                <p className="mt-1 font-semibold text-[var(--ink)]">{restaurantName}</p>
                <p className="text-sm text-[var(--muted)]">{tableLabel || 'Table —'}</p>
                {isAdding ? (
                  <p className="mt-2 text-sm font-semibold text-[var(--teal)]">
                    Adding to order #{openDisplayNo}
                  </p>
                ) : null}
              </div>

              <ul className="space-y-3">
                {cart.items.map((item) => (
                  <li
                    key={item.dishId}
                    className="flex gap-3 rounded-2xl border border-[var(--line)] bg-white/80 p-3"
                  >
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-black/[0.04]">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                          Dish
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-[var(--ink)]">{item.name}</p>
                        <p className="shrink-0 text-sm font-bold text-[var(--teal)]">
                          {formatPrice(item.price * item.quantity)}
                        </p>
                      </div>
                      <p className="mt-0.5 text-xs text-[var(--muted)]">
                        {formatPrice(item.price)} each
                      </p>
                      {step === 'cart' ? (
                        <div className="mt-2 flex items-center justify-between">
                          <div className="inline-flex items-center gap-1 rounded-full border border-[var(--line)] bg-white p-0.5">
                            <button
                              type="button"
                              className="rounded-full p-1.5 text-[var(--ink)] hover:bg-black/[0.04]"
                              onClick={() => onDecrement(item.dishId)}
                              aria-label="Decrease quantity"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="min-w-7 text-center text-sm font-bold">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              className="rounded-full p-1.5 text-[var(--ink)] hover:bg-black/[0.04]"
                              onClick={() => onIncrement(item.dishId)}
                              aria-label="Increase quantity"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <button
                            type="button"
                            className="rounded-lg p-2 text-[var(--muted)] hover:bg-red-50 hover:text-[var(--danger)]"
                            onClick={() => onRemove(item.dishId)}
                            aria-label="Remove item"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ) : (
                        <p className="mt-2 text-sm font-semibold text-[var(--ink)]">
                          Qty {item.quantity}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>

              <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--muted)]">
                    {isAdding ? 'Adding now' : 'Subtotal'}
                  </span>
                  <span className="font-semibold text-[var(--ink)]">
                    {formatPrice(cart.subtotal)}
                  </span>
                </div>
                {!isAdding && taxEstimate.gstEnabled ? (
                  <>
                    <div className="mt-1.5 flex items-center justify-between text-sm text-[var(--muted)]">
                      <span>CGST ({taxEstimate.cgstRate}%)</span>
                      <span>{formatPrice(taxEstimate.cgstAmount)}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-sm text-[var(--muted)]">
                      <span>SGST ({taxEstimate.sgstRate}%)</span>
                      <span>{formatPrice(taxEstimate.sgstAmount)}</span>
                    </div>
                  </>
                ) : null}
                {!isAdding ? (
                  <div className="mt-2 flex items-center justify-between border-t border-[var(--line)] pt-2">
                    <span className="font-semibold text-[var(--ink)]">Total</span>
                    <span className="text-lg font-bold text-[var(--teal)]">
                      {formatPrice(displayTotal)}
                    </span>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    These items will be added to your existing order total.
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {step !== 'success' ? (
          <div className="shrink-0 space-y-2 border-t border-[var(--line)] px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {step === 'cart' && cart.items.length > 0 ? (
              <>
                <Button className="w-full" size="lg" onClick={() => setStep('review')}>
                  {isAdding
                    ? `Review add · ${formatPrice(cart.subtotal)}`
                    : `Review order · ${formatPrice(displayTotal)}`}
                </Button>
                <Button variant="ghost" className="w-full" onClick={onClear}>
                  Clear cart
                </Button>
              </>
            ) : null}

            {step === 'review' && cart.items.length > 0 ? (
              <>
                <Button
                  className="w-full"
                  size="lg"
                  disabled={placing || !anonymousSessionId}
                  onClick={submitCart}
                >
                  {placing
                    ? isAdding
                      ? 'Adding…'
                      : 'Placing order…'
                    : isAdding
                      ? `Add to order #${openDisplayNo}`
                      : 'Place Order'}
                </Button>
                <Button
                  variant="secondary"
                  className="w-full"
                  disabled={placing}
                  onClick={() => setStep('cart')}
                >
                  Back to cart
                </Button>
              </>
            ) : null}

            {step === 'cart' && cart.items.length === 0 ? (
              <Button className="w-full" variant="secondary" onClick={handleClose}>
                Browse menu
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function EmptyCart({ hasOpenOrder }) {
  return (
    <div className="px-2 py-12 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--surface)] text-[var(--teal)]">
        <ShoppingBag size={22} />
      </div>
      <p
        className="mt-4 text-2xl text-[var(--ink)]"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        Your cart is empty
      </p>
      <p className="mx-auto mt-2 max-w-xs text-sm text-[var(--muted)]">
        {hasOpenOrder
          ? 'Add more dishes and they will join your open order for this table.'
          : 'Add dishes from the menu to build your order for this table.'}
      </p>
    </div>
  );
}
