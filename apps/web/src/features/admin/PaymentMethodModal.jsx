import { useEffect, useState } from 'react';
import { CreditCard, Banknote, Smartphone, Wallet, X } from 'lucide-react';
import { Button } from '../../shared/ui/Button.jsx';

export const PAYMENT_METHODS = [
  { id: 'CASH', label: 'Cash', hint: 'Cash at counter', Icon: Banknote },
  { id: 'CARD', label: 'Card', hint: 'Debit / credit', Icon: CreditCard },
  { id: 'UPI_GPAY', label: 'GPay', hint: 'Google Pay UPI', Icon: Smartphone },
  { id: 'UPI_PHONEPE', label: 'PhonePe', hint: 'PhonePe UPI', Icon: Smartphone },
  { id: 'UPI_OTHER', label: 'Other UPI', hint: 'Paytm, BHIM, etc.', Icon: Smartphone },
  { id: 'OTHER', label: 'Others', hint: 'Any other method', Icon: Wallet },
];

/**
 * Ask how the guest paid before marking an order completed.
 */
export function PaymentMethodModal({
  open,
  orderLabel = 'this order',
  totalLabel = '',
  busy = false,
  onCancel,
  onConfirm,
}) {
  const [method, setMethod] = useState('CASH');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (open) {
      setMethod('CASH');
      setNote('');
    }
  }, [open]);

  if (!open) return null;

  const needsNote = method === 'OTHER' || method === 'UPI_OTHER';

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-method-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-[var(--ink)]/45 backdrop-blur-sm"
        aria-label="Cancel"
        onClick={busy ? undefined : onCancel}
      />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--teal)]">
              Complete order
            </p>
            <h2
              id="payment-method-title"
              className="mt-1 text-xl text-[var(--ink)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              How was payment made?
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {orderLabel}
              {totalLabel ? ` · ${totalLabel}` : ''}
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-full border border-[var(--line)] p-2 text-[var(--muted)] hover:bg-black/[0.03] disabled:opacity-50"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          <div className="grid grid-cols-2 gap-2">
            {PAYMENT_METHODS.map(({ id, label, hint, Icon }) => {
              const selected = method === id;
              return (
                <button
                  key={id}
                  type="button"
                  disabled={busy}
                  onClick={() => setMethod(id)}
                  className={[
                    'flex items-start gap-2.5 rounded-2xl border px-3 py-3 text-left transition',
                    selected
                      ? 'border-[var(--teal)] bg-[var(--teal)]/10 ring-1 ring-[var(--teal)]/30'
                      : 'border-[var(--line)] bg-[var(--surface)]/60 hover:bg-white',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl',
                      selected ? 'bg-[var(--teal)] text-white' : 'bg-white text-[var(--ink)]',
                    ].join(' ')}
                  >
                    <Icon size={16} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-[var(--ink)]">{label}</span>
                    <span className="block text-[11px] text-[var(--muted)]">{hint}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {needsNote ? (
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
                Note (optional)
              </span>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={120}
                placeholder="e.g. Paytm / voucher"
                disabled={busy}
                className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none ring-[var(--teal)] focus:ring-2"
              />
            </label>
          ) : null}
        </div>

        <div className="flex gap-2 border-t border-[var(--line)] px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button variant="secondary" className="flex-1" disabled={busy} onClick={onCancel}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            disabled={busy}
            onClick={() =>
              onConfirm?.({
                paymentMethod: method,
                paymentNote: needsNote && note.trim() ? note.trim() : undefined,
              })
            }
          >
            {busy ? 'Saving…' : 'Confirm & complete'}
          </Button>
        </div>
      </div>
    </div>
  );
}
