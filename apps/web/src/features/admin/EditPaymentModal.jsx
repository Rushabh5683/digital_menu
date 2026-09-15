import { useEffect, useMemo, useState } from 'react';
import { CreditCard, Banknote, Smartphone, Wallet, Split, X } from 'lucide-react';
import { Button } from '../../shared/ui/Button.jsx';

const METHODS = [
  { id: 'CASH', label: 'Cash', Icon: Banknote },
  { id: 'CARD', label: 'Card', Icon: CreditCard },
  { id: 'UPI_GPAY', label: 'GPay', Icon: Smartphone },
  { id: 'UPI_PHONEPE', label: 'PhonePe', Icon: Smartphone },
  { id: 'UPI_OTHER', label: 'Other UPI', Icon: Smartphone },
  { id: 'OTHER', label: 'Others', Icon: Wallet },
  { id: 'PART', label: 'Part payment', Icon: Split },
];

const SINGLE = METHODS.filter((m) => m.id !== 'PART');

function money2(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function withAutoRemaining(rows, billTotal, editedIndex = -1) {
  if (!Array.isArray(rows) || rows.length < 2) return rows;
  const next = rows.map((row) => ({ ...row }));
  const last = next.length - 1;
  if (editedIndex === last) return next;
  const priorSum = money2(
    next.slice(0, last).reduce((sum, row) => sum + (Number(row.amount) || 0), 0),
  );
  const remaining = money2(billTotal - priorSum);
  next[last] = {
    ...next[last],
    amount: String(remaining),
  };
  return next;
}

/**
 * Edit payment method on an already-settled bill.
 */
export function EditPaymentModal({
  open,
  billLabel = 'this bill',
  orderTotal = 0,
  initialMethod = 'CASH',
  initialNote = '',
  initialSplits = null,
  busy = false,
  onCancel,
  onConfirm,
}) {
  const [method, setMethod] = useState(initialMethod || 'CASH');
  const [note, setNote] = useState(initialNote || '');
  const [splits, setSplits] = useState([
    { method: 'CASH', amount: '' },
    { method: 'UPI_GPAY', amount: '' },
  ]);
  const [error, setError] = useState('');

  const billTotal = money2(orderTotal);

  useEffect(() => {
    if (!open) return;
    setMethod(initialMethod || 'CASH');
    setNote(initialNote || '');
    if (Array.isArray(initialSplits) && initialSplits.length >= 2) {
      setSplits(
        withAutoRemaining(
          initialSplits.map((row) => ({
            method: row.method || 'CASH',
            amount: String(row.amount ?? ''),
          })),
          money2(orderTotal),
        ),
      );
    } else {
      setSplits(
        withAutoRemaining(
          [
            { method: 'CASH', amount: '' },
            { method: 'UPI_GPAY', amount: '' },
          ],
          money2(orderTotal),
        ),
      );
    }
    setError('');
  }, [open, initialMethod, initialNote, initialSplits, orderTotal]);

  const splitSum = useMemo(
    () => money2(splits.reduce((s, row) => s + (Number(row.amount) || 0), 0)),
    [splits],
  );

  if (!open) return null;

  const needsNote = method === 'OTHER' || method === 'UPI_OTHER';
  const isPart = method === 'PART';

  const selectMethod = (id) => {
    setMethod(id);
    setError('');
    if (id === 'PART') {
      setSplits(
        withAutoRemaining(
          [
            { method: 'CASH', amount: '' },
            { method: 'UPI_GPAY', amount: '' },
          ],
          billTotal,
        ),
      );
    }
  };

  const submit = () => {
    setError('');
    if (isPart) {
      const balanced = withAutoRemaining(splits, billTotal);
      const parsed = balanced.map((row) => ({
        method: row.method,
        amount: money2(row.amount),
      }));
      if (parsed.some((row) => !(row.amount > 0))) {
        setError('Enter an amount greater than 0 on the first part-payment line.');
        return;
      }
      const sum = money2(parsed.reduce((s, row) => s + row.amount, 0));
      if (Math.abs(sum - billTotal) > 0.05) {
        setError(`Part payment must add up to ₹${billTotal}`);
        return;
      }
      onConfirm?.({
        paymentMethod: 'PART',
        paymentSplits: parsed,
      });
      return;
    }
    onConfirm?.({
      paymentMethod: method,
      paymentNote: needsNote && note.trim() ? note.trim() : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-[85] flex items-end justify-center sm:items-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-[var(--ink)]/20 backdrop-blur-[2px]"
        aria-label="Cancel"
        onClick={busy ? undefined : onCancel}
      />
      <div className="relative z-10 flex max-h-[min(92dvh,calc(100dvh-0.5rem))] w-full min-w-0 max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--line)] px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--teal)]">
              Edit payment
            </p>
            <h2 className="mt-1 break-words text-xl text-[var(--ink)]" style={{ fontFamily: 'var(--font-display)' }}>
              Correct payment method
            </h2>
            <p className="mt-1 break-words text-sm text-[var(--muted)]">{billLabel}</p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="shrink-0 rounded-full border border-[var(--line)] p-2 text-[var(--muted)] hover:bg-black/[0.03]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
          <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
            {METHODS.map(({ id, label, Icon }) => {
              const selected = method === id;
              return (
                <button
                  key={id}
                  type="button"
                  disabled={busy}
                  onClick={() => selectMethod(id)}
                  className={[
                    'flex min-h-11 min-w-0 items-center gap-2 rounded-2xl border px-3 py-2.5 text-left text-sm font-semibold transition',
                    selected
                      ? 'border-[var(--teal)] bg-[var(--teal)]/10 text-[var(--teal)]'
                      : 'border-[var(--line)] bg-[var(--surface)]/60 text-[var(--ink)]',
                  ].join(' ')}
                >
                  <Icon size={15} className="shrink-0" />
                  <span className="truncate">{label}</span>
                </button>
              );
            })}
          </div>

          {needsNote ? (
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={120}
              placeholder="Note (optional)"
              disabled={busy}
              className="w-full min-w-0 rounded-xl border border-[var(--line)] px-3 py-2.5 text-sm outline-none ring-[var(--teal)] focus:ring-2"
            />
          ) : null}

          {isPart ? (
            <div className="space-y-2 rounded-2xl border border-[var(--line)] p-3">
              <p className="text-[11px] text-[var(--muted)]">
                Enter the first amount — remaining fills the last box automatically.
                {Math.abs(splitSum - billTotal) <= 0.05 ? ' · Balanced' : ''}
              </p>
              {splits.map((row, index) => {
                const isLast = index === splits.length - 1;
                return (
                  <div
                    key={index}
                    className="grid min-w-0 grid-cols-1 gap-2 min-[360px]:grid-cols-[1fr_6rem]"
                  >
                    <select
                      value={row.method}
                      disabled={busy}
                      onChange={(e) => {
                        const next = [...splits];
                        next[index] = { ...next[index], method: e.target.value };
                        setSplits(next);
                      }}
                      className="min-w-0 rounded-xl border border-[var(--line)] px-2 py-2 text-sm"
                      aria-label={`Payment method line ${index + 1}`}
                    >
                      {SINGLE.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.amount}
                      readOnly={isLast}
                      disabled={busy}
                      placeholder={isLast ? 'Remaining' : '₹'}
                      onChange={(e) => {
                        const next = splits.map((r, i) =>
                          i === index ? { ...r, amount: e.target.value } : r,
                        );
                        setSplits(withAutoRemaining(next, billTotal, index));
                      }}
                      className={[
                        'min-w-0 rounded-xl border border-[var(--line)] px-2 py-2 text-sm',
                        isLast ? 'bg-[var(--surface)]' : 'bg-white',
                      ].join(' ')}
                      title={isLast ? 'Auto-calculated remaining' : undefined}
                    />
                  </div>
                );
              })}
            </div>
          ) : null}

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-[var(--line)] px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:px-5">
          <Button variant="secondary" className="w-full min-w-0 flex-1" disabled={busy} onClick={onCancel}>
            Cancel
          </Button>
          <Button className="w-full min-w-0 flex-1" disabled={busy} onClick={submit}>
            <span className="truncate">{busy ? 'Saving…' : 'Save payment'}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
