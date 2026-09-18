import { useEffect, useState } from 'react';
import { LoaderCircle, Printer, X } from 'lucide-react';
import { Button } from '../../../shared/ui/Button.jsx';
import { Alert } from '../../../shared/ui/Alert.jsx';
import {
  getQzDownloadUrl,
  getQzOverrideCertUrl,
  getSavedPrinter,
  isQzUnavailableError,
  listQzPrinters,
  saveDefaultPrinter,
} from './qzPrinter.js';

/**
 * Pick a printer (QZ Tray). Saves separately for bill (counter) vs KOT (kitchen).
 */
export function PrinterSelectModal({
  open,
  busy = false,
  kind = 'bill',
  onCancel,
  onConfirm,
}) {
  const [printers, setPrinters] = useState([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [qzMissing, setQzMissing] = useState(false);

  const isKot = kind === 'kot';

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
        const saved = getSavedPrinter(kind);
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
  }, [open, kind]);

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
        className="absolute inset-0 bg-[var(--ink)]/20 backdrop-blur-[2px]"
        aria-label="Cancel"
        onClick={busy ? undefined : onCancel}
      />
      <div className="relative z-10 flex max-h-[min(92dvh,640px)] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--teal)]">
              {isKot ? 'KOT print' : 'Bill print'}
            </p>
            <h2
              id="printer-select-title"
              className="mt-1 text-xl text-[var(--ink)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {isKot ? 'Choose kitchen printer' : 'Choose bill printer'}
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {isKot
                ? 'Saved as your kitchen / KOT printer for next time.'
                : 'Saved as your counter / bill printer for next time.'}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">
              First time only — pick the printer once. Later {isKot ? 'KOT' : 'bill'} prints go
              there automatically (separate from{' '}
              {isKot ? 'bill' : 'KOT'} printer).
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-full border border-[var(--line)] p-2.5 text-[var(--muted)] hover:bg-black/[0.03] disabled:opacity-50"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-5 py-4">
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

          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] leading-relaxed text-amber-950">
            <p className="font-semibold">Stop the QZ popup permanently (one-time)</p>
            <p className="mt-1">
              If Allow greys out when Remember is ticked, install{' '}
              <a
                href={getQzOverrideCertUrl()}
                download="override.crt"
                className="font-semibold underline"
              >
                override.crt
              </a>{' '}
              via QZ Site Manager (or Run as admin), then restart QZ.
            </p>
          </div>

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

        <div className="flex shrink-0 gap-2 border-t border-[var(--line)] px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button variant="secondary" className="flex-1" disabled={busy} onClick={onCancel}>
            Cancel
          </Button>
          <Button
            className="flex-1 gap-1.5"
            disabled={busy || loading || !selected}
            onClick={() => {
              saveDefaultPrinter(selected, kind);
              onConfirm?.(selected);
            }}
          >
            {busy ? <LoaderCircle size={16} className="animate-spin" /> : <Printer size={16} />}
            {busy ? 'Printing…' : isKot ? 'Print KOT' : 'Print bill'}
          </Button>
        </div>
      </div>
    </div>
  );
}
