import { useEffect, useState } from 'react';
import { LoaderCircle, Printer, X } from 'lucide-react';
import { Button } from '../../../shared/ui/Button.jsx';
import { Alert } from '../../../shared/ui/Alert.jsx';
import {
  getQzDownloadUrl,
  getSavedPrinter,
  isQzUnavailableError,
  listQzPrinters,
  saveDefaultPrinter,
} from './qzPrinter.js';

/**
 * Pick a printer (QZ Tray). Saves selection as default for next Print.
 */
export function PrinterSelectModal({
  open,
  busy = false,
  onCancel,
  onConfirm,
}) {
  const [printers, setPrinters] = useState([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [qzMissing, setQzMissing] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setQzMissing(false);
      try {
        const list = await listQzPrinters();
        if (cancelled) return;
        setPrinters(list);
        const saved = getSavedPrinter();
        if (saved && list.includes(saved)) setSelected(saved);
        else if (list.length) setSelected(list[0]);
        else setSelected('');
      } catch (err) {
        if (cancelled) return;
        if (isQzUnavailableError(err)) {
          setQzMissing(true);
          setError(
            'QZ Tray is not running. Install it once, open QZ Tray, then try Print again.',
          );
        } else {
          setError(err.message || 'Could not list printers');
        }
        setPrinters([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="printer-select-title"
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
              Print bill
            </p>
            <h2
              id="printer-select-title"
              className="mt-1 text-xl text-[var(--ink)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Choose printer
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Saved as default for next time — no browser print preview.
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
          {error ? <Alert tone="error">{error}</Alert> : null}
          {qzMissing ? (
            <a
              href={getQzDownloadUrl()}
              target="_blank"
              rel="noreferrer"
              className="inline-flex text-sm font-semibold text-[var(--teal)] underline"
            >
              Download QZ Tray
            </a>
          ) : null}

          {loading ? (
            <p className="inline-flex items-center gap-2 text-sm text-[var(--muted)]">
              <LoaderCircle size={16} className="animate-spin" />
              Detecting printers…
            </p>
          ) : null}

          {!loading && !qzMissing && printers.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No printers found on this computer.</p>
          ) : null}

          <ul className="max-h-56 space-y-1.5 overflow-y-auto">
            {printers.map((name) => {
              const active = selected === name;
              return (
                <li key={name}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setSelected(name)}
                    className={[
                      'flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition',
                      active
                        ? 'border-[var(--teal)] bg-[var(--teal)]/10 font-semibold text-[var(--ink)]'
                        : 'border-[var(--line)] hover:bg-[var(--surface)]',
                    ].join(' ')}
                  >
                    <Printer size={16} className="shrink-0 text-[var(--muted)]" />
                    <span className="min-w-0 truncate">{name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex gap-2 border-t border-[var(--line)] px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button variant="secondary" className="flex-1" disabled={busy} onClick={onCancel}>
            Cancel
          </Button>
          <Button
            className="flex-1 gap-1.5"
            disabled={busy || loading || !selected}
            onClick={() => {
              saveDefaultPrinter(selected);
              onConfirm?.(selected);
            }}
          >
            {busy ? <LoaderCircle size={16} className="animate-spin" /> : <Printer size={16} />}
            {busy ? 'Printing…' : 'Print'}
          </Button>
        </div>
      </div>
    </div>
  );
}
