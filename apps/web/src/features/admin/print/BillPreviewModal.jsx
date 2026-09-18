import { Eye, Printer, X } from 'lucide-react';
import { Button } from '../../../shared/ui/Button.jsx';

/**
 * On-screen 80mm bill preview — check layout without wasting paper.
 */
export function BillPreviewModal({
  open,
  html,
  busy = false,
  onClose,
  onPrint,
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[92] flex items-end justify-center sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bill-preview-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-[var(--ink)]/25 backdrop-blur-[2px]"
        aria-label="Close preview"
        onClick={busy ? undefined : onClose}
      />
      <div className="relative z-10 flex max-h-[min(94dvh,820px)] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-[#e8e6e1] shadow-2xl sm:rounded-3xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--line)] bg-white px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--teal)]">
              Bill preview
            </p>
            <h2
              id="bill-preview-title"
              className="mt-1 text-xl text-[var(--ink)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Check before print
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Screen preview of the 80mm bill. Thermal paper may look slightly different.
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-full border border-[var(--line)] p-2.5 text-[var(--muted)] hover:bg-black/[0.03] disabled:opacity-50"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          <div className="mx-auto w-full max-w-[320px] overflow-hidden rounded-sm bg-white shadow-[0_12px_40px_-20px_rgba(15,31,28,0.55)] ring-1 ring-black/10">
            {html ? (
              <iframe
                title="Bill preview"
                srcDoc={html}
                className="block w-full border-0 bg-white"
                style={{ height: '70vh', minHeight: 420 }}
              />
            ) : (
              <p className="p-6 text-center text-sm text-[var(--muted)]">Nothing to preview</p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 gap-2 border-t border-[var(--line)] bg-white px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button variant="secondary" className="flex-1" disabled={busy} onClick={onClose}>
            Close
          </Button>
          {typeof onPrint === 'function' ? (
            <Button className="flex-1 gap-1.5" disabled={busy || !html} onClick={onPrint}>
              <Printer size={16} />
              Print now
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function PreviewBillButton({ disabled, onClick, className = '' }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={className}
    >
      <Eye size={12} className="shrink-0" />
      <span className="truncate">Preview</span>
    </button>
  );
}
