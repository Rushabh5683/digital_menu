import { Check, Clock3, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../../shared/api/client.js';
import { useLockBodyScroll } from '../../../shared/lib/useLockBodyScroll.js';
import { Alert } from '../../../shared/ui/Alert.jsx';
import { formatPrice } from '../lib/menuUtils.js';
import {
  buildOrderTimeline,
  formatOrderDisplayNumber,
  getStatusCopy,
  isTerminalOrderStatus,
} from './orderStatus.js';

const POLL_MS = 4000;
const FOOTER_SAFE_PAD = 'pb-[max(1.25rem,env(safe-area-inset-bottom,0px))]';

export function OrderStatusPanel({
  order: initialOrder,
  restaurantName,
  tableLabel,
  restaurantSlug,
  anonymousSessionId,
  tableNumber,
  added = false,
  onClose,
  onAddMore,
  closeLabel = 'Back to menu',
  showClose = true,
}) {
  const [order, setOrder] = useState(initialOrder);
  const [error, setError] = useState(null);

  useEffect(() => {
    setOrder(initialOrder);
  }, [initialOrder?.id, initialOrder?.status, initialOrder?.updatedAt]);

  useEffect(() => {
    if (!order?.id || !restaurantSlug || !anonymousSessionId) return undefined;
    if (isTerminalOrderStatus(order.status)) return undefined;

    let cancelled = false;
    let timer = null;

    async function poll() {
      try {
        const result = await api.trackOrder(order.id, {
          restaurantSlug,
          anonymousSessionId,
          tableNumber: tableNumber || undefined,
        });
        if (cancelled || !result?.order) return;
        setOrder(result.order);
        setError(null);
        if (isTerminalOrderStatus(result.order.status)) return;
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Could not refresh order status');
        }
      }
      if (!cancelled) {
        timer = window.setTimeout(poll, POLL_MS);
      }
    }

    timer = window.setTimeout(poll, POLL_MS);
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [order?.id, order?.status, restaurantSlug, anonymousSessionId, tableNumber]);

  if (!order) return null;

  const copy = getStatusCopy(order.status);
  const timeline = buildOrderTimeline(order.status);
  const displayNumber = formatOrderDisplayNumber(order.orderNumber);
  const items = order.items || [];
  const terminal = isTerminalOrderStatus(order.status);
  const isHappy = order.status === 'COMPLETED';
  const isSad = order.status === 'REJECTED' || order.status === 'CANCELLED';

  return (
    <div className="order-confirm space-y-5">
      {error ? <Alert tone="error">{error}</Alert> : null}

      <div className="text-center">
        <div
          className={[
            'order-confirm-check mx-auto flex h-16 w-16 items-center justify-center rounded-full border',
            isSad
              ? 'border-red-400/40 bg-red-50 text-red-600'
              : 'border-[var(--g-accent-deep)]/35 bg-[var(--g-accent-soft)] text-[var(--g-accent-deep)]',
          ].join(' ')}
        >
          {isSad ? <X size={28} strokeWidth={2.5} /> : <Check size={28} strokeWidth={2.5} />}
        </div>
        <p className="guest-menu-label mt-4 text-2xl font-semibold tracking-tight text-[var(--g-ink)]">
          {terminal && isHappy
            ? 'Order complete'
            : terminal
              ? copy.estimate
              : added
                ? 'Added to your order'
                : 'Order received'}
        </p>
        <p className="mt-2 text-sm text-[var(--g-muted)]">
          {restaurantName}
          {order.tableLabel || tableLabel
            ? ` · ${order.tableLabel || tableLabel}`
            : ''}
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--g-line-strong)] bg-[var(--g-bg-elevated)] px-4 py-4 text-center shadow-[var(--g-shadow)]">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--g-muted)]">
          Order number
        </p>
        <p className="guest-menu-label mt-1 text-3xl font-semibold text-[var(--g-accent-deep)]">
          #{displayNumber}
        </p>
        {(order.tableLabel || tableLabel) && (
          <p className="mt-2 text-sm font-medium text-[var(--g-ink)]">
            {order.tableLabel || tableLabel}
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-[var(--g-line)] bg-[var(--g-bg-surface)] px-4 py-4 shadow-[var(--g-shadow)]">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--g-accent-deep)]/30 bg-[var(--g-accent-soft)] text-[var(--g-accent-deep)]">
            <Clock3 size={16} />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--g-muted)]">
              Estimated status
            </p>
            <p className="mt-1 text-lg font-semibold text-[var(--g-ink)]">{copy.estimate}</p>
            <p className="mt-0.5 text-sm text-[var(--g-ink-soft)]">{copy.detail}</p>
          </div>
        </div>
      </div>

      <OrderTimeline timeline={timeline} />

      <div className="rounded-2xl border border-[var(--g-line)] bg-[var(--g-bg-elevated)] px-4 py-4 shadow-[var(--g-shadow)]">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--g-muted)]">
          Items
        </p>
        <ul className="mt-3 space-y-2.5">
          {items.map((item) => (
            <li
              key={item.id || `${item.dishId}-${item.dishNameSnapshot}`}
              className="flex items-baseline justify-between gap-3 text-sm"
            >
              <span className="text-[var(--g-ink)]">
                {item.dishNameSnapshot || item.dishName}{' '}
                <span className="text-[var(--g-muted)]">× {item.quantity}</span>
              </span>
              <span className="shrink-0 font-semibold text-[var(--g-accent-deep)]">
                {formatPrice(item.subtotal ?? item.lineTotal)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-1.5 border-t border-[var(--g-line)] pt-3 text-sm">
          <div className="flex items-center justify-between text-[var(--g-muted)]">
            <span>Subtotal</span>
            <span className="font-medium text-[var(--g-ink)]">
              {formatPrice(order.subtotal ?? order.total)}
            </span>
          </div>
          {Number(order.taxAmount) > 0 ? (
            <>
              <div className="flex items-center justify-between text-[var(--g-muted)]">
                <span>CGST ({Number(order.cgstRate) || 0}%)</span>
                <span>{formatPrice(order.cgstAmount)}</span>
              </div>
              <div className="flex items-center justify-between text-[var(--g-muted)]">
                <span>SGST ({Number(order.sgstRate) || 0}%)</span>
                <span>{formatPrice(order.sgstAmount)}</span>
              </div>
            </>
          ) : null}
          <div className="flex items-center justify-between pt-1">
            <span className="font-semibold text-[var(--g-ink)]">Total</span>
            <span className="text-xl font-semibold text-[var(--g-accent-deep)]">
              {formatPrice(order.total)}
            </span>
          </div>
        </div>
      </div>

      {showClose ? (
        <div className="space-y-2">
          {!terminal && typeof onAddMore === 'function' ? (
            <button
              type="button"
              onClick={onAddMore}
              className="flex h-12 w-full items-center justify-center rounded-full border border-[var(--g-accent-deep)]/35 bg-white text-sm font-semibold text-[var(--g-accent-deep)] shadow-sm transition-all hover:bg-[var(--g-accent-soft)] active:scale-[0.99]"
            >
              Add more items
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="flex h-12 w-full items-center justify-center rounded-full bg-gradient-to-r from-[var(--g-accent)] to-[var(--g-accent-bright)] text-sm font-semibold text-[var(--g-ink)] shadow-[0_10px_24px_rgba(184,140,48,0.28)] transition-all hover:opacity-95 active:scale-[0.99]"
          >
            {closeLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function OrderTimeline({ timeline }) {
  return (
    <div className="rounded-2xl border border-[var(--g-line)] bg-[var(--g-bg-surface)] px-4 py-4 shadow-[var(--g-shadow)]">
      <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-[var(--g-muted)]">
        Order status
      </p>
      <ol className="order-timeline guest-order-timeline">
        {timeline.steps.map((step, index) => (
          <li key={step.key} className={`order-timeline-step is-${step.state}`}>
            <span className="order-timeline-dot" aria-hidden="true">
              {step.state === 'done' || step.state === 'current' ? (
                <Check size={12} strokeWidth={3} />
              ) : null}
            </span>
            <span className="order-timeline-label">{step.label}</span>
            {index < timeline.steps.length - 1 ? (
              <span className="order-timeline-connector" aria-hidden="true" />
            ) : null}
          </li>
        ))}
      </ol>
      {timeline.aborted ? (
        <p className="mt-3 text-sm font-semibold text-red-600">
          Ended: {timeline.abortLabel}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Full-screen drawer hosting OrderStatusPanel (My Order / post-checkout).
 */
export function MyOrderDrawer({
  open,
  onClose,
  onAddMore,
  order,
  restaurantName,
  tableLabel,
  restaurantSlug,
  anonymousSessionId,
  tableNumber,
}) {
  useLockBodyScroll(open);

  if (!open) return null;

  const terminal = order ? isTerminalOrderStatus(order.status) : true;

  const sheet = (
    <div
      className="guest-portal fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="my-order-title"
    >
      <button
        type="button"
        className="drawer-backdrop absolute inset-0 bg-stone-900/40"
        aria-label="Close order"
        onClick={onClose}
      />
      <div className="drawer-panel relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-stone-200 bg-[#FAF8F5] shadow-[0_28px_60px_rgba(60,40,15,0.28)] sm:rounded-3xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-stone-200 bg-[#FDFBF7] px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--g-accent-deep)]">
              My Order
            </p>
            <h2
              id="my-order-title"
              className="guest-menu-label mt-1 text-xl font-semibold tracking-tight text-[var(--g-ink)]"
            >
              Order status
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-stone-200 bg-white p-2 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
          {order ? (
            <OrderStatusPanel
              order={order}
              restaurantName={restaurantName}
              tableLabel={tableLabel}
              restaurantSlug={restaurantSlug}
              anonymousSessionId={anonymousSessionId}
              tableNumber={tableNumber}
              onClose={onClose}
              onAddMore={onAddMore}
              closeLabel="Back to menu"
              showClose={false}
            />
          ) : (
            <div className="py-12 text-center">
              <p className="guest-menu-label mb-2 mt-6 text-lg font-semibold text-[var(--g-ink)]">
                No active order
              </p>
              <p className="mx-auto max-w-xs text-sm leading-relaxed text-[var(--g-muted)]">
                Place an order from your cart and you can track it here.
              </p>
            </div>
          )}
        </div>
        <div
          className={`shrink-0 space-y-2 border-t border-stone-200 bg-[#FAF8F5] px-5 pt-4 ${FOOTER_SAFE_PAD}`}
        >
          {order && !terminal && typeof onAddMore === 'function' ? (
            <button
              type="button"
              onClick={onAddMore}
              className="flex h-12 w-full items-center justify-center rounded-full border border-[var(--g-accent-deep)]/35 bg-white text-sm font-semibold text-[var(--g-accent-deep)] shadow-sm transition-all hover:bg-[var(--g-accent-soft)] active:scale-[0.99]"
            >
              Add more items
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="flex h-12 w-full items-center justify-center rounded-full bg-gradient-to-r from-[var(--g-accent)] to-[var(--g-accent-bright)] text-sm font-semibold text-[var(--g-ink)] shadow-[0_10px_24px_rgba(184,140,48,0.28)] transition-all hover:opacity-95 active:scale-[0.99]"
          >
            {order ? 'Back to menu' : 'Browse menu'}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return sheet;
  return createPortal(sheet, document.body);
}
