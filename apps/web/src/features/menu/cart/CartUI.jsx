import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../../shared/api/client.js';
import { computeExclusiveGst } from '../../../shared/lib/gst.js';
import { resolveMediaUrl } from '../../../shared/lib/mediaUrl.js';
import { useLockBodyScroll } from '../../../shared/lib/useLockBodyScroll.js';
import { Alert } from '../../../shared/ui/Alert.jsx';
import { Button } from '../../../shared/ui/Button.jsx';
import { formatPrice } from '../lib/menuUtils.js';
import { formatOrderDisplayNumber, isTerminalOrderStatus } from './orderStatus.js';
import { OrderStatusPanel } from './OrderStatusPanel.jsx';

/** Home-indicator clearance for cart footer actions. */
const FOOTER_SAFE_PAD = 'pb-[max(1.25rem,env(safe-area-inset-bottom,0px))]';

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

  useLockBodyScroll(open);

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
          // Same-day open ticket only — never auto-append to prior-day bills
          // (those stay hidden from Live Orders' today filter / must be settled).
          const details = err.body?.details;
          const existing = details?.openOrder;
          if (
            err.status === 409 &&
            details?.code === 'OPEN_ORDER_EXISTS' &&
            existing?.id
          ) {
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

  return createPortal(
    <div
      className="guest-portal fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-title"
    >
      <button
        type="button"
        className="drawer-backdrop absolute inset-0 bg-stone-900/40"
        aria-label="Close cart"
        onClick={handleClose}
      />

      <div className="drawer-panel relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-stone-200 bg-[#FAF8F5] shadow-[0_28px_60px_rgba(60,40,15,0.28)] sm:rounded-3xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-stone-200 bg-[#FDFBF7] px-5 py-4">
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

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
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
              showClose={false}
            />
          ) : null}

          {step !== 'success' && cart.items.length === 0 ? (
            <EmptyCart hasOpenOrder={isAdding} />
          ) : null}

          {step !== 'success' && cart.items.length > 0 ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                  Ordering at
                </p>
                <p className="mt-1 font-semibold text-stone-900">{restaurantName}</p>
                <p className="text-sm text-stone-500">{tableLabel || 'Table —'}</p>
                {isAdding ? (
                  <p className="mt-2 text-sm font-semibold text-[#2f9e7a]">
                    Adding to order #{openDisplayNo}
                  </p>
                ) : null}
              </div>

              <ul className="space-y-3">
                {cart.items.map((item) => (
                  <li
                    key={item.dishId}
                    className="flex gap-3 rounded-2xl border border-stone-200 bg-white p-3"
                  >
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-stone-100">
                      {item.imageUrl ? (
                        <img
                          src={resolveMediaUrl(item.imageUrl)}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                          Dish
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-stone-900">{item.name}</p>
                        <p className="shrink-0 text-sm font-bold text-[#2f9e7a]">
                          {formatPrice(item.price * item.quantity)}
                        </p>
                      </div>
                      <p className="mt-0.5 text-xs text-stone-500">
                        {formatPrice(item.price)} each
                      </p>
                      {step === 'cart' ? (
                        <div className="mt-2 flex items-center justify-between">
                          <div className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white p-0.5">
                            <button
                              type="button"
                              className="rounded-full p-1.5 text-stone-900 hover:bg-stone-100"
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
                              className="rounded-full p-1.5 text-stone-900 hover:bg-stone-100"
                              onClick={() => onIncrement(item.dishId)}
                              aria-label="Increase quantity"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <button
                            type="button"
                            className="rounded-lg p-2 text-stone-400 hover:bg-red-50 hover:text-red-600"
                            onClick={() => onRemove(item.dishId)}
                            aria-label="Remove item"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ) : (
                        <p className="mt-2 text-sm font-semibold text-stone-900">
                          Qty {item.quantity}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>

              <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-stone-500">
                    {isAdding ? 'Adding now' : 'Subtotal'}
                  </span>
                  <span className="font-semibold text-stone-900">
                    {formatPrice(cart.subtotal)}
                  </span>
                </div>
                {!isAdding && taxEstimate.gstEnabled ? (
                  <>
                    <div className="mt-1.5 flex items-center justify-between text-sm text-stone-500">
                      <span>CGST ({taxEstimate.cgstRate}%)</span>
                      <span>{formatPrice(taxEstimate.cgstAmount)}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-sm text-stone-500">
                      <span>SGST ({taxEstimate.sgstRate}%)</span>
                      <span>{formatPrice(taxEstimate.sgstAmount)}</span>
                    </div>
                  </>
                ) : null}
                {!isAdding ? (
                  <div className="mt-2 flex items-center justify-between border-t border-stone-200 pt-2">
                    <span className="font-semibold text-stone-900">Total</span>
                    <span className="text-lg font-bold text-[#2f9e7a]">
                      {formatPrice(displayTotal)}
                    </span>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-stone-500">
                    These items will be added to your existing order total.
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {step === 'success' && placedOrder ? (
          <div
            className={`shrink-0 space-y-2 border-t border-stone-200 bg-[#FAF8F5] px-5 pt-4 ${FOOTER_SAFE_PAD}`}
          >
            {!isTerminalOrderStatus(placedOrder.status) ? (
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => {
                  handleClose();
                }}
              >
                Add more items
              </Button>
            ) : null}
            <Button className="w-full" size="lg" onClick={handleClose}>
              Back to menu
            </Button>
          </div>
        ) : null}

        {step !== 'success' ? (
          <div
            className={`shrink-0 space-y-2 border-t border-stone-200 bg-[#FAF8F5] px-5 pt-4 ${FOOTER_SAFE_PAD}`}
          >
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
    </div>,
    document.body,
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
