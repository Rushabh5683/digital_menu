import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Printer,
  QrCode,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../shared/api/client.js';
import { Alert } from '../../shared/ui/Alert.jsx';
import { Button } from '../../shared/ui/Button.jsx';
import { Modal } from '../../shared/ui/Modal.jsx';
import { PrintableQrCard, downloadPrintableCardPng } from './components/PrintableQrCard.jsx';
import { withStaffMenuPreview } from '../menu/lib/staffPreview.js';

function downloadDataUrl(dataUrl, filename) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename || 'table-qr.png';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function formatWhen(value) {
  if (!value) return 'Never';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

const statusStyles = {
  ready: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  pending: 'border-[var(--accent)]/30 bg-[var(--accent)]/12 text-[var(--accent-deep)]',
  inactive: 'border-[var(--line)] bg-black/[0.03] text-[var(--muted)]',
};

export function AdminQrCodesPage() {
  const queryClient = useQueryClient();
  const [preview, setPreview] = useState(null);
  const [printBatch, setPrintBatch] = useState([]);
  const [actionError, setActionError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const printRef = useRef(null);

  const qrQuery = useQuery({
    queryKey: ['admin', 'qr-codes'],
    queryFn: () => api.listAdminQrCodes(),
  });

  const restaurant = qrQuery.data?.restaurant;
  const tables = qrQuery.data?.tables || [];
  const stats = qrQuery.data?.stats;
  const policy = qrQuery.data?.regenerationPolicy;

  const generateOne = useMutation({
    mutationFn: (tableId) => api.generateAdminTableQr(tableId),
    onMutate: (tableId) => setBusyId(tableId),
    onSuccess: async (payload) => {
      setActionError(null);
      setPreview(payload);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'qr-codes'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'tables'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'setup'] });
    },
    onError: (error) => setActionError(error.message),
    onSettled: () => setBusyId(null),
  });

  const generateAll = useMutation({
    mutationFn: () => api.generateAllAdminQrCodes(),
    onSuccess: async (payload) => {
      setActionError(null);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'qr-codes'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'tables'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'setup'] });
      if (payload.items?.[0]) setPreview(payload.items[0]);
    },
    onError: (error) => setActionError(error.message),
  });

  const activeTables = useMemo(
    () => tables.filter((table) => table.isActive),
    [tables],
  );

  async function copyLink(table) {
    if (!table.menuUrl) return;
    try {
      await navigator.clipboard.writeText(table.menuUrl);
      setCopiedId(table.id);
      window.setTimeout(() => setCopiedId(null), 1600);
    } catch {
      setActionError('Could not copy link');
    }
  }

  async function downloadPng(table) {
    setBusyId(table.id);
    try {
      const payload = await api.generateAdminTableQr(table.id);
      downloadDataUrl(payload.dataUrl, payload.filename);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'qr-codes'] });
    } catch (error) {
      setActionError(error.message);
    } finally {
      setBusyId(null);
    }
  }

  async function downloadPrintable(table) {
    setBusyId(table.id);
    try {
      const payload = await api.generateAdminTableQr(table.id);
      await downloadPrintableCardPng(payload);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'qr-codes'] });
    } catch (error) {
      setActionError(error.message);
    } finally {
      setBusyId(null);
    }
  }

  async function downloadAllPngs() {
    setActionError(null);
    try {
      const payload = await api.generateAllAdminQrCodes();
      await queryClient.invalidateQueries({ queryKey: ['admin', 'qr-codes'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'setup'] });
      for (const item of payload.items || []) {
        downloadDataUrl(item.dataUrl, item.filename);
        // Brief pause so browsers don't collapse downloads.
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => window.setTimeout(resolve, 180));
      }
    } catch (error) {
      setActionError(error.message);
    }
  }

  async function downloadAllPrintableCards() {
    setActionError(null);
    try {
      const payload = await api.generateAllAdminQrCodes();
      await queryClient.invalidateQueries({ queryKey: ['admin', 'qr-codes'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'setup'] });
      for (const item of payload.items || []) {
        // eslint-disable-next-line no-await-in-loop
        await downloadPrintableCardPng(item);
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => window.setTimeout(resolve, 220));
      }
    } catch (error) {
      setActionError(error.message);
    }
  }

  async function openPrintAll() {
    setActionError(null);
    setPreview(null);
    setBusyId('print-all');
    try {
      const payload = await api.generateAllAdminQrCodes();
      await queryClient.invalidateQueries({ queryKey: ['admin', 'qr-codes'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'setup'] });
      setPrintBatch(payload.items || []);
      window.setTimeout(() => window.print(), 350);
    } catch (error) {
      setActionError(error.message);
    } finally {
      setBusyId(null);
    }
  }

  function printPreview() {
    setPrintBatch([]);
    window.print();
  }

  return (
    <div className="min-w-0 space-y-6 menu-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--teal)]">
            QR codes
          </p>
          <h2
            className="mt-2 text-3xl tracking-tight text-[var(--ink)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Table QR studio
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            Each table gets its own public menu link. Guests scan and land on your menu with the
            table already attached — no manual table pick.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            disabled={generateAll.isPending || activeTables.length === 0 || busyId === 'print-all'}
            onClick={() => downloadAllPngs()}
          >
            <Download size={16} />
            Download all QR
          </Button>
          <Button
            variant="secondary"
            disabled={generateAll.isPending || activeTables.length === 0 || busyId === 'print-all'}
            onClick={() => downloadAllPrintableCards()}
          >
            <Download size={16} />
            Download all cards
          </Button>
          <Button
            variant="secondary"
            disabled={generateAll.isPending || activeTables.length === 0 || busyId === 'print-all'}
            onClick={() => openPrintAll()}
          >
            <Printer size={16} />
            Print all
          </Button>
          <Button
            disabled={generateAll.isPending || activeTables.length === 0}
            onClick={() => generateAll.mutate()}
          >
            <Sparkles size={16} />
            {generateAll.isPending ? 'Generating…' : 'Generate all'}
          </Button>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Tables" value={stats?.total ?? 0} />
        <Stat label="QR ready" value={stats?.ready ?? 0} />
        <Stat label="Pending" value={stats?.pending ?? 0} />
      </div>

     

      {actionError ? <Alert tone="error">{actionError}</Alert> : null}

      <section>
        {qrQuery.isLoading ? (
          <p className="py-16 text-center text-sm text-[var(--muted)]">Loading QR codes…</p>
        ) : null}

        {qrQuery.error ? (
          <Alert tone="error">
            {qrQuery.error.message}
            <div className="mt-3">
              <Button size="sm" onClick={() => qrQuery.refetch()}>
                Retry
              </Button>
            </div>
          </Alert>
        ) : null}

        {!qrQuery.isLoading && tables.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[var(--line)] bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.12),transparent_45%),linear-gradient(180deg,#fff,#f7f4ef)] px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--line)] bg-white text-[var(--teal)]">
              <QrCode size={22} />
            </div>
            <p
              className="mt-5 text-2xl text-[var(--ink)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Add tables first
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">
              Create dining tables, then generate a unique QR for each one.
            </p>
            <Link
              to="/admin/tables"
              className="mt-6 inline-flex text-sm font-semibold text-[var(--teal)] hover:underline"
            >
              Go to tables
            </Link>
          </div>
        ) : null}

        {tables.length > 0 ? (
          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {tables.map((table) => (
              <article
                key={table.id}
                className="relative overflow-hidden rounded-3xl border border-[var(--line)] bg-white/90 p-5 shadow-[0_18px_40px_-30px_rgba(15,31,28,0.45)]"
              >
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-24"
                  style={{
                    background:
                      'radial-gradient(circle at 15% 0%, rgba(15,118,110,0.12), transparent 55%)',
                  }}
                />
                <div className="relative flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                      Dining table
                    </p>
                    <h3
                      className="mt-1 text-3xl text-[var(--ink)]"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      {table.label}
                    </h3>
                    {table.name ? (
                      <p className="mt-1 text-sm text-[var(--muted)]">{table.name}</p>
                    ) : null}
                  </div>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${
                      statusStyles[table.qrStatus] || statusStyles.pending
                    }`}
                  >
                    {table.qrStatus}
                  </span>
                </div>

                <p className="relative mt-4 text-xs text-[var(--muted)]">
                  Last generated: <span className="font-semibold text-[var(--ink)]">{formatWhen(table.qrGeneratedAt)}</span>
                </p>
                <p className="relative mt-1 break-all text-[11px] text-[var(--muted)]">
                  {table.menuUrl}
                </p>

                <div className="relative mt-5 flex flex-wrap gap-2 border-t border-[var(--line)]/80 pt-4">
                  <Button
                    size="sm"
                    variant="accent"
                    disabled={busyId === table.id || !table.isActive}
                    onClick={() => generateOne.mutate(table.id)}
                  >
                    <RefreshCw size={14} />
                    {table.qrGeneratedAt ? 'Regenerate' : 'Generate'}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busyId === table.id || !table.isActive}
                    onClick={() => generateOne.mutate(table.id)}
                  >
                    Preview
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busyId === table.id || !table.isActive}
                    onClick={() => downloadPng(table)}
                  >
                    <Download size={14} />
                    PNG
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busyId === table.id || !table.isActive}
                    onClick={() => downloadPrintable(table)}
                  >
                    Printable
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={!table.menuUrl}
                    onClick={() => copyLink(table)}
                  >
                    {copiedId === table.id ? <Check size={14} /> : <Copy size={14} />}
                    {copiedId === table.id ? 'Copied' : 'Copy link'}
                  </Button>
                  {table.menuUrl ? (
                    <a
                      href={withStaffMenuPreview(table.menuUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-[var(--teal)] hover:underline"
                    >
                      Open
                      <ExternalLink size={12} />
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <Modal
        open={Boolean(preview)}
        title={preview ? `${preview.table.label} QR` : 'QR preview'}
        subtitle="Print or download this card for the table."
        wide
        onClose={() => setPreview(null)}
      >
        {preview ? (
          <div className="space-y-5">
            <div
              className="qr-preview-stage relative overflow-hidden rounded-2xl border border-[var(--line)] print:border-0 print:bg-transparent"
              style={{
                background:
                  'radial-gradient(ellipse at 50% 0%, rgba(184,155,94,0.14), transparent 55%), linear-gradient(165deg, #1a2e28 0%, #243834 42%, #1f3d36 100%)',
              }}
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.07] print:hidden"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(135deg, #fff 0 1px, transparent 1px 14px)',
                }}
              />
              <div
                ref={printRef}
                className="qr-print-sheet relative flex justify-center px-4 py-8 sm:px-8 sm:py-10"
              >
                <PrintableQrCard
                  restaurantName={preview.printable?.restaurantName || restaurant?.name}
                  logoUrl={preview.printable?.logoUrl || restaurant?.logoUrl}
                  tableLabel={preview.printable?.tableLabel || preview.table.label}
                  headline={preview.printable?.headline}
                  tagline={preview.printable?.tagline || restaurant?.brandTagline}
                  accentColor={preview.printable?.accentColor || restaurant?.brandAccent}
                  theme={preview.printable?.theme || restaurant?.qrCardTheme}
                  dataUrl={preview.dataUrl}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 print:hidden sm:flex-row sm:items-center sm:justify-between">
              <p className="text-center text-xs text-[var(--muted)] sm:text-left">
                Portrait card · Ready for table tents and stands
              </p>
              <div className="flex flex-wrap justify-center gap-2 sm:justify-end">
                <Button
                  variant="secondary"
                  onClick={() => downloadDataUrl(preview.dataUrl, preview.filename)}
                >
                  <Download size={16} />
                  Download QR
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => downloadPrintableCardPng(preview)}
                >
                  <Download size={16} />
                  Download card
                </Button>
                <Button onClick={printPreview}>
                  <Printer size={16} />
                  Print
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      {printBatch.length > 0 ? (
        <div className="qr-print-batch pointer-events-none fixed left-[-10000px] top-0">
          {printBatch.map((item) => (
            <div key={item.table.id} className="qr-print-page mb-8 flex justify-center">
              <PrintableQrCard
                restaurantName={item.printable?.restaurantName || restaurant?.name}
                logoUrl={item.printable?.logoUrl || restaurant?.logoUrl}
                tableLabel={item.printable?.tableLabel || item.table.label}
                headline={item.printable?.headline}
                tagline={item.printable?.tagline || restaurant?.brandTagline}
                accentColor={item.printable?.accentColor || restaurant?.brandAccent}
                theme={item.printable?.theme || restaurant?.qrCardTheme}
                dataUrl={item.dataUrl}
              />
            </div>
          ))}
        </div>
      ) : null}

      <style>{`
        @media print {
          @page {
            size: portrait;
            margin: 12mm;
          }
          body * { visibility: hidden !important; }
          .qr-print-sheet, .qr-print-sheet *,
          .qr-print-batch, .qr-print-batch *,
          .qr-print-card, .qr-print-card * {
            visibility: visible !important;
          }
          .qr-preview-stage {
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
          }
          .qr-print-sheet {
            position: fixed !important;
            inset: 0 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            padding: 0 !important;
            background: white !important;
          }
          .qr-print-card {
            max-width: 92mm !important;
            width: 92mm !important;
            border-radius: 18px !important;
            box-shadow: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .qr-print-batch {
            position: static !important;
            left: auto !important;
            top: auto !important;
            width: 100% !important;
            background: white !important;
          }
          .qr-print-page {
            break-after: page;
            page-break-after: always;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            min-height: 100vh;
            margin: 0 !important;
            padding: 0 !important;
          }
          .qr-print-page:last-child {
            break-after: auto;
            page-break-after: auto;
          }
        }
      `}</style>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
        {label}
      </p>
      <p
        className="mt-2 text-3xl tracking-tight text-[var(--ink)]"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {value}
      </p>
    </div>
  );
}
