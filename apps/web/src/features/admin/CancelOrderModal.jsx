import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from '../../shared/ui/Button.jsx';

/** 16px+ inputs avoid iOS Safari auto-zoom on focus. */
const fieldClass =
  'mt-1.5 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-base outline-none ring-[var(--teal)] focus:ring-2';

/**
 * Two-step cancel: reason first, then restaurant admin password.
 * Bottom sheet on mobile; portaled to body so it stays in the viewport.
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

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
      // Release iOS zoom that can stick after focusing a small input.
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

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

  const close = () => {
    if (busy) return;
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    onCancel?.();
  };

  return createPortal(
    <div className="fixed inset-0 z-[280] flex items-end justify-center sm:items-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-[var(--ink)]/20 backdrop-blur-[2px]"
        aria-label="Close"
        disabled={busy}
        onClick={close}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 flex max-h-[min(88dvh,calc(100dvh-0.75rem))] w-full min-w-0 max-w-md flex-col overflow-hidden rounded-t-3xl border border-[var(--line)] bg-[var(--surface-elevated)] shadow-[0_30px_80px_-40px_rgba(15,31,28,0.45)] sm:rounded-3xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--line)] px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-red-700/80">
              Cancel order
            </p>
            <h3
              className="mt-1 break-words text-lg text-[var(--ink)] sm:text-xl"
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
            onClick={close}
            className="shrink-0 rounded-full p-1.5 text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
          {step === 'reason' ? (
            <label className="block">
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
                className={`${fieldClass} resize-none`}
              />
            </label>
          ) : (
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
                Admin password
              </span>
              <input
                type="password"
                autoFocus
                value={password}
                disabled={busy}
                autoComplete="current-password"
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (localError) setLocalError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && password && !busy) submit();
                }}
                className={fieldClass}
              />
              <p className="mt-2 text-xs text-[var(--muted)]">
                Reason: <span className="text-[var(--ink)]">{reason.trim()}</span>
              </p>
            </label>
          )}

          {displayError ? <p className="mt-2 text-sm text-red-600">{displayError}</p> : null}
        </div>

        <div className="flex shrink-0 gap-2 border-t border-[var(--line)] px-4 py-3.5 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5">
          {step === 'password' ? (
            <Button
              variant="secondary"
              className="min-w-0 flex-1"
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
            <Button variant="secondary" className="min-w-0 flex-1" disabled={busy} onClick={close}>
              Keep order
            </Button>
          )}
          {step === 'reason' ? (
            <Button className="min-w-0 flex-1" disabled={busy || !reason.trim()} onClick={goNext}>
              Continue
            </Button>
          ) : (
            <Button
              className="min-w-0 flex-1 !bg-red-700 hover:!bg-red-800"
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
