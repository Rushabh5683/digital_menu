import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from './Button.jsx';

export function Modal({ open, title, subtitle, onClose, children, wide = false }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close dialog"
        className="drawer-backdrop absolute inset-0 bg-[var(--ink)]/50 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative z-10 flex max-h-[min(92vh,880px)] w-full flex-col overflow-hidden rounded-t-3xl border border-[var(--line)] bg-[var(--surface-elevated)] shadow-[0_30px_80px_-40px_rgba(15,31,28,0.55)] sm:rounded-3xl ${
          wide ? 'sm:max-w-3xl' : 'sm:max-w-xl'
        }`}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--line)] px-5 py-4 sm:px-6">
          <div>
            <h2
              className="text-xl tracking-tight text-[var(--ink)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {title}
            </h2>
            {subtitle ? <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p> : null}
          </div>
          <Button variant="secondary" size="sm" className="!p-2" onClick={onClose} aria-label="Close">
            <X size={16} />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  danger = false,
  loading = false,
  onConfirm,
  onClose,
}) {
  return (
    <Modal open={open} title={title} onClose={loading ? undefined : onClose}>
      <p className="text-sm leading-relaxed text-[var(--muted)]">{message}</p>
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <Button variant="secondary" disabled={loading} onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant={danger ? 'danger' : 'primary'}
          disabled={loading}
          onClick={onConfirm}
        >
          {loading ? 'Working…' : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
