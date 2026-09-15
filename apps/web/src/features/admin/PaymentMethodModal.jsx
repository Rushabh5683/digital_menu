import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CreditCard,
  Banknote,
  Smartphone,
  Wallet,
  Split,
  X,
  HeartHandshake,
  Check,
} from 'lucide-react';
import { api } from '../../shared/api/client.js';
import { Button } from '../../shared/ui/Button.jsx';

export const PAYMENT_METHODS = [
  { id: 'CASH', label: 'Cash', hint: 'Cash at counter', Icon: Banknote },
  { id: 'CARD', label: 'Card', hint: 'Debit / credit', Icon: CreditCard },
  { id: 'UPI_GPAY', label: 'GPay', hint: 'Google Pay UPI', Icon: Smartphone },
  { id: 'UPI_PHONEPE', label: 'PhonePe', hint: 'PhonePe UPI', Icon: Smartphone },
  { id: 'UPI_OTHER', label: 'Other UPI', hint: 'Paytm, BHIM, etc.', Icon: Smartphone },
  { id: 'OTHER', label: 'Others', hint: 'Any other method', Icon: Wallet },
  { id: 'PART', label: 'Part payment', hint: 'Split across methods', Icon: Split },
];

const SINGLE_METHODS = PAYMENT_METHODS.filter((m) => m.id !== 'PART');

function money2(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function formatMoney(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function emptySplitRow() {
  return { method: 'CASH', amount: '', note: '' };
}

/**
 * Settle flow: payment method (incl. part payment) → optional staff appreciation.
 */
export function PaymentMethodModal({
  open,
  orderLabel = 'this order',
  totalLabel = '',
  orderTotal = 0,
  busy = false,
  onCancel,
  onConfirm,
}) {
  const [step, setStep] = useState('payment'); // payment | appreciation
  const [method, setMethod] = useState('CASH');
  const [note, setNote] = useState('');
  const [splits, setSplits] = useState([emptySplitRow(), emptySplitRow()]);
  const [appreciation, setAppreciation] = useState('');
  const [selectedCaptainIds, setSelectedCaptainIds] = useState([]);
  const [formError, setFormError] = useState('');

  const captainsQuery = useQuery({
    queryKey: ['admin', 'captains', 'active'],
    queryFn: async () => {
      const payload = await api.listAdminCaptains();
      return (payload.captains || []).filter((c) => c.isActive !== false);
    },
    enabled: open && step === 'appreciation',
  });

  useEffect(() => {
    if (!open) return;
    setStep('payment');
    setMethod('CASH');
    setNote('');
    setSplits([emptySplitRow(), emptySplitRow()]);
    setAppreciation('');
    setSelectedCaptainIds([]);
    setFormError('');
  }, [open]);

  const billTotal = money2(orderTotal);
  const splitSum = useMemo(
    () => money2(splits.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)),
    [splits],
  );
  const splitRemaining = money2(billTotal - splitSum);
  const appreciationAmount = money2(appreciation);
  const captains = captainsQuery.data || [];

  if (!open) return null;

  const needsNote = method === 'OTHER' || method === 'UPI_OTHER';
  const isPart = method === 'PART';

  const goToAppreciation = () => {
    setFormError('');
    if (isPart) {
      const parsed = splits.map((row) => ({
        method: row.method,
        amount: money2(row.amount),
        note: row.note?.trim() || undefined,
      }));
      if (parsed.some((row) => !(row.amount > 0))) {
        setFormError('Enter an amount greater than 0 on each part-payment line.');
        return;
      }
      if (Math.abs(splitSum - billTotal) > 0.05) {
        setFormError(`Part payment must add up to ${formatMoney(billTotal)}.`);
        return;
      }
    }
    setStep('appreciation');
  };

  const toggleCaptain = (id) => {
    setSelectedCaptainIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const submit = () => {
    setFormError('');
    if (appreciationAmount > 0 && selectedCaptainIds.length < 1) {
      setFormError('Select at least one captain for staff appreciation.');
      return;
    }

    const payload = {
      paymentMethod: method,
      staffAppreciationAmount: appreciationAmount,
      appreciationCaptainIds: appreciationAmount > 0 ? selectedCaptainIds : [],
    };

    if (isPart) {
      payload.paymentSplits = splits.map((row) => {
        const line = {
          method: row.method,
          amount: money2(row.amount),
        };
        if (
          (row.method === 'OTHER' || row.method === 'UPI_OTHER') &&
          row.note?.trim()
        ) {
          line.note = row.note.trim();
        }
        return line;
      });
    } else if (needsNote && note.trim()) {
      payload.paymentNote = note.trim();
    }

    onConfirm?.(payload);
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-method-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-[var(--ink)]/20 backdrop-blur-[2px]"
        aria-label="Cancel"
        onClick={busy ? undefined : onCancel}
      />
      <div className="relative z-10 flex max-h-[min(92dvh,calc(100dvh-0.5rem))] w-full min-w-0 max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--line)] bg-white px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--teal)]">
              Complete order · Step {step === 'payment' ? '1' : '2'} of 2
            </p>
            <h2
              id="payment-method-title"
              className="mt-1 break-words text-xl text-[var(--ink)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {step === 'payment' ? 'How was payment made?' : 'Staff appreciation'}
            </h2>
            <p className="mt-1 break-words text-sm text-[var(--muted)]">
              {orderLabel}
              {totalLabel ? ` · ${totalLabel}` : ''}
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="shrink-0 rounded-full border border-[var(--line)] p-2 text-[var(--muted)] hover:bg-black/[0.03] disabled:opacity-50"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {step === 'payment' ? (
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
            <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
              {PAYMENT_METHODS.map(({ id, label, hint, Icon }) => {
                const selected = method === id;
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={busy}
                    onClick={() => setMethod(id)}
                    className={[
                      'flex min-h-14 min-w-0 items-start gap-2.5 rounded-2xl border px-3 py-3 text-left transition',
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

            {isPart ? (
              <div className="space-y-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)]/50 p-3">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-[var(--ink)]">Split lines</span>
                  <span
                    className={
                      Math.abs(splitRemaining) <= 0.05
                        ? 'font-semibold text-emerald-700'
                        : 'font-semibold text-[var(--accent)]'
                    }
                  >
                    {Math.abs(splitRemaining) <= 0.05
                      ? 'Balanced'
                      : `Left ${formatMoney(splitRemaining)}`}
                  </span>
                </div>
                {splits.map((row, index) => (
                  <div key={index} className="grid min-w-0 grid-cols-1 gap-2 min-[360px]:grid-cols-[1fr_6.5rem]">
                    <select
                      value={row.method}
                      disabled={busy}
                      onChange={(e) => {
                        const next = [...splits];
                        next[index] = { ...next[index], method: e.target.value };
                        setSplits(next);
                      }}
                      className="min-w-0 rounded-xl border border-[var(--line)] bg-white px-2.5 py-2 text-sm outline-none ring-[var(--teal)] focus:ring-2"
                    >
                      {SINGLE_METHODS.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      placeholder="₹"
                      value={row.amount}
                      disabled={busy}
                      onChange={(e) => {
                        const next = [...splits];
                        next[index] = { ...next[index], amount: e.target.value };
                        setSplits(next);
                      }}
                      className="rounded-xl border border-[var(--line)] bg-white px-2.5 py-2 text-sm outline-none ring-[var(--teal)] focus:ring-2"
                    />
                  </div>
                ))}
                <div className="flex gap-2">
                  {splits.length < 6 ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={busy}
                      onClick={() => setSplits((prev) => [...prev, emptySplitRow()])}
                    >
                      Add line
                    </Button>
                  ) : null}
                  {splits.length > 2 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() => setSplits((prev) => prev.slice(0, -1))}
                    >
                      Remove line
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}

            {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
          </div>
        ) : (
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--teal)]/5 px-3.5 py-3">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
                <HeartHandshake size={16} className="text-[var(--teal)]" />
                Optional · not part of the bill
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                If the guest left staff appreciation, enter the amount and choose which captains
                receive it (split equally when more than one).
              </p>
            </div>

            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
                Staff appreciation amount
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="0"
                value={appreciation}
                disabled={busy}
                onChange={(e) => setAppreciation(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none ring-[var(--teal)] focus:ring-2"
              />
            </label>

            {appreciationAmount > 0 ? (
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
                  Assign to captains
                </p>
                {captainsQuery.isLoading ? (
                  <p className="text-sm text-[var(--muted)]">Loading captains…</p>
                ) : captains.length === 0 ? (
                  <p className="text-sm text-[var(--muted)]">
                    No active captains yet. Add captains under Captains, or clear the amount.
                  </p>
                ) : (
                  <ul className="max-h-48 space-y-2 overflow-y-auto">
                    {captains.map((captain) => {
                      const selected = selectedCaptainIds.includes(captain.id);
                      return (
                        <li key={captain.id}>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => toggleCaptain(captain.id)}
                            className={[
                              'flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition',
                              selected
                                ? 'border-[var(--teal)] bg-[var(--teal)]/10'
                                : 'border-[var(--line)] bg-white hover:bg-[var(--surface)]',
                            ].join(' ')}
                          >
                            <span className="font-semibold text-[var(--ink)]">{captain.name}</span>
                            <span
                              className={[
                                'flex h-6 w-6 items-center justify-center rounded-full border',
                                selected
                                  ? 'border-[var(--teal)] bg-[var(--teal)] text-white'
                                  : 'border-[var(--line)] text-transparent',
                              ].join(' ')}
                            >
                              <Check size={14} />
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {selectedCaptainIds.length > 1 ? (
                  <p className="text-xs text-[var(--muted)]">
                    {formatMoney(appreciationAmount)} will be split equally across{' '}
                    {selectedCaptainIds.length} captains.
                  </p>
                ) : null}
              </div>
            ) : null}

            {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
          </div>
        )}

        <div className="flex shrink-0 flex-col gap-2 border-t border-[var(--line)] bg-white px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:px-5">
          {step === 'appreciation' ? (
            <Button
              variant="secondary"
              className="w-full min-w-0 flex-1"
              disabled={busy}
              onClick={() => {
                setFormError('');
                setStep('payment');
              }}
            >
              Back
            </Button>
          ) : (
            <Button variant="secondary" className="w-full min-w-0 flex-1" disabled={busy} onClick={onCancel}>
              Cancel
            </Button>
          )}
          {step === 'payment' ? (
            <Button className="w-full min-w-0 flex-1" disabled={busy} onClick={goToAppreciation}>
              Continue
            </Button>
          ) : (
            <Button className="w-full min-w-0 flex-1" disabled={busy} onClick={submit}>
              <span className="truncate">{busy ? 'Saving…' : 'Confirm & complete'}</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
