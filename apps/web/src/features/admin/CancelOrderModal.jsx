import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from '../../shared/ui/Button.jsx';

/**
 * Two-step cancel: reason first, then restaurant admin password.
 */
export function CancelOrderModal({
  open,
  orderLabel = 'this order',
  busy = false,
  error = null,
  onCancel,
  onConfirm,
}) {
  const [step, setStep] = useState('reason'); // reason | password
  const [reason, setReason] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setStep('reason');
    setReason('');
    setPassword('');
    setLocalError(null);
  }, [open]);

  if (!open) return null;

  const displayError = localError || error;

  const goNext = () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      setLocalError('Please enter a cancel reason');
      return;
    }
    setLocalError(null);
    setStep('password');
  };

  const submit = () => {
    if (!password) {
      setLocalError('Admin password is required');
      return;
    }
    setLocalError(null);
    onConfirm?.({ cancelReason: reason.trim(), adminPassword: password });
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-[var(--ink)]/20 backdrop-blur-[2px]"
        aria-label="Close"
        disabled={busy}
        onClick={() => !busy && onCancel?.()}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-md rounded-3xl border border-[var(--line)] bg-[var(--surface-elevated)] p-5 shadow-[0_30px_80px_-40px_rgba(15,31,28,0.45)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-red-700/80">
              Cancel order
            </p>
            <h3
              className="mt-1 text-xl text-[var(--ink)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {orderLabel}
            </h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {step === 'reason'
                ? 'First, tell us why this order is being cancelled. This is saved for records.'
                : 'Confirm with your restaurant admin password to cancel this order.'}
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => !busy && onCancel?.()}
            className="rounded-full p-1.5 text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {step === 'reason' ? (
          <label className="mt-4 block">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
              Cancel reason
            </span>
            <textarea
              autoFocus
              rows={3}
              value={reason}
              disabled={busy}
              maxLength={500}
              placeholder="e.g. Guest left, wrong table, duplicate order"
              onChange={(e) => {
                setReason(e.target.value);
                if (localError) setLocalError(null);
              }}
              className="mt-1.5 w-full resize-none rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none ring-[var(--teal)] focus:ring-2"
            />
          </label>
        ) : (
          <label className="mt-4 block">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
              Admin password
            </span>
            <input
              type="password"
              autoFocus
              value={password}
              disabled={busy}
              onChange={(e) => {
                setPassword(e.target.value);
                if (localError) setLocalError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && password && !busy) submit();
              }}
              className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none ring-[var(--teal)] focus:ring-2"
            />
            <p className="mt-2 text-xs text-[var(--muted)]">
              Reason: <span className="text-[var(--ink)]">{reason.trim()}</span>
            </p>
          </label>
        )}

        {displayError ? <p className="mt-2 text-sm text-red-600">{displayError}</p> : null}

        <div className="mt-4 flex gap-2">
          {step === 'password' ? (
            <Button
              variant="secondary"
              className="flex-1"
              disabled={busy}
              onClick={() => {
                setStep('reason');
                setPassword('');
                setLocalError(null);
              }}
            >
              Back
            </Button>
          ) : (
            <Button
              variant="secondary"
              className="flex-1"
              disabled={busy}
              onClick={() => onCancel?.()}
            >
              Keep order
            </Button>
          )}
          {step === 'reason' ? (
            <Button className="flex-1" disabled={busy || !reason.trim()} onClick={goNext}>
              Continue
            </Button>
          ) : (
            <Button
              className="flex-1 !bg-red-700 hover:!bg-red-800"
              disabled={busy || !password}
              onClick={submit}
            >
              {busy ? 'Cancelling…' : 'Cancel order'}
            </Button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
