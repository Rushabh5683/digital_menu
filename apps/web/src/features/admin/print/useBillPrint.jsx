import { useCallback, useRef, useState } from 'react';
import {
  buildThermalBillEscPos,
  buildThermalBillHtml,
  buildThermalKotEscPos,
  buildThermalKotHtml,
  printHtmlViaIframe,
} from '../orderBillPrint.js';
import { BillPreviewModal } from './BillPreviewModal.jsx';
import { PrinterSelectModal } from './PrinterSelectModal.jsx';
import {
  getSavedPaperWidthMm,
  getSavedPrinter,
  isQzUnavailableError,
  listQzPrinters,
  printRawEscPosWithQz,
  saveDefaultPrinter,
} from './qzPrinter.js';

/**
 * Shared Print flow for guest bills and KOT tickets.
 */
export function useBillPrint() {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [pending, setPending] = useState(null);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState(null);
  const onPrintedRef = useRef(null);

  const closePicker = useCallback(() => {
    if (printing) return;
    setPickerOpen(false);
    if (!previewOpen) setPending(null);
    onPrintedRef.current = null;
  }, [printing, previewOpen]);

  const closePreview = useCallback(() => {
    if (printing) return;
    setPreviewOpen(false);
    setPreviewHtml('');
    if (!pickerOpen) {
      setPending(null);
      onPrintedRef.current = null;
    }
  }, [printing, pickerOpen]);

  const runEscPosPrint = useCallback(
    async (printerName, { restaurant, order, cashierName, kind = 'bill' }) => {
      const paperWidthMm = 80;
      getSavedPaperWidthMm();
      const payload =
        kind === 'kot'
          ? buildThermalKotEscPos({ restaurant, order, paperWidthMm, cashierName })
          : buildThermalBillEscPos({ restaurant, order, paperWidthMm, cashierName });
      if (!payload?.base64) throw new Error('Order has nothing to print');
      await printRawEscPosWithQz(printerName, payload.base64);
    },
    [],
  );

  const runBrowserFallback = useCallback(({ restaurant, order, cashierName, kind = 'bill' }) => {
    const html =
      kind === 'kot'
        ? buildThermalKotHtml({ restaurant, order, cashierName })
        : buildThermalBillHtml({ restaurant, order, cashierName });
    if (!html) throw new Error('Order has nothing to print');
    printHtmlViaIframe(html);
  }, []);

  const finishOk = useCallback(async () => {
    const cb = onPrintedRef.current;
    onPrintedRef.current = null;
    setPickerOpen(false);
    setPreviewOpen(false);
    setPreviewHtml('');
    setPending(null);
    if (typeof cb === 'function') await cb();
  }, []);

  const previewBill = useCallback(({ restaurant, order, cashierName, onPrinted } = {}) => {
    setError(null);
    const html = buildThermalBillHtml({ restaurant, order, cashierName });
    if (!html) {
      setError('Order has nothing to preview');
      return { ok: false };
    }
    setPending({ restaurant, order, cashierName, kind: 'bill' });
    onPrintedRef.current = onPrinted || null;
    setPreviewHtml(html);
    setPreviewOpen(true);
    return { ok: true };
  }, []);

  const printDocument = useCallback(
    async ({
      restaurant,
      order,
      cashierName,
      kind = 'bill',
      forcePicker = false,
      onPrinted,
    } = {}) => {
      setError(null);
      setPending({ restaurant, order, cashierName, kind });
      onPrintedRef.current = onPrinted || null;

      if (forcePicker) {
        setPickerOpen(true);
        return { ok: false, needsPicker: true };
      }

      const saved = getSavedPrinter(kind);
      if (!saved) {
        setPickerOpen(true);
        return { ok: false, needsPicker: true };
      }

      setPrinting(true);
      try {
        const printers = await listQzPrinters();
        if (!printers.includes(saved)) {
          setPickerOpen(true);
          return { ok: false, needsPicker: true };
        }
        await runEscPosPrint(saved, { restaurant, order, cashierName, kind });
        await finishOk();
        return { ok: true, mode: 'escpos', kind };
      } catch (err) {
        if (isQzUnavailableError(err)) {
          try {
            runBrowserFallback({ restaurant, order, cashierName, kind });
            await finishOk();
            setError('QZ Tray offline — opened browser print instead');
            return { ok: true, mode: 'browser-fallback', kind };
          } catch (fallbackErr) {
            setPickerOpen(true);
            setError(fallbackErr.message || err.message || 'Print failed');
            return { ok: false, needsPicker: true, error: fallbackErr };
          }
        }
        setPickerOpen(true);
        setError(err.message || 'Print failed');
        return { ok: false, needsPicker: true, error: err };
      } finally {
        setPrinting(false);
      }
    },
    [finishOk, runBrowserFallback, runEscPosPrint],
  );

  const printBill = useCallback(
    (args) => printDocument({ ...args, kind: 'bill' }),
    [printDocument],
  );

  const printKot = useCallback(
    (args) => printDocument({ ...args, kind: 'kot' }),
    [printDocument],
  );

  const confirmPrinter = useCallback(
    async (printerName) => {
      if (!pending) return;
      setPrinting(true);
      setError(null);
      try {
        saveDefaultPrinter(printerName, pending.kind || 'bill');
        await runEscPosPrint(printerName, pending);
        await finishOk();
      } catch (err) {
        if (isQzUnavailableError(err)) {
          try {
            runBrowserFallback(pending);
            await finishOk();
            setError('QZ Tray offline — opened browser print instead');
            return;
          } catch (fallbackErr) {
            setError(fallbackErr.message || 'Print failed');
            return;
          }
        }
        setError(err.message || 'Print failed');
      } finally {
        setPrinting(false);
      }
    },
    [finishOk, pending, runBrowserFallback, runEscPosPrint],
  );

  const printFromPreview = useCallback(async () => {
    if (!pending) return;
    setPreviewOpen(false);
    await printDocument({
      restaurant: pending.restaurant,
      order: pending.order,
      cashierName: pending.cashierName,
      kind: pending.kind || 'bill',
      onPrinted: onPrintedRef.current,
    });
  }, [pending, printDocument]);

  const printerModal = (
    <>
      <PrinterSelectModal
        open={pickerOpen}
        busy={printing}
        kind={pending?.kind || 'bill'}
        onCancel={closePicker}
        onConfirm={confirmPrinter}
      />
      <BillPreviewModal
        open={previewOpen}
        html={previewHtml}
        busy={printing}
        onClose={closePreview}
        onPrint={printFromPreview}
      />
    </>
  );

  return {
    printBill,
    printKot,
    previewBill,
    printing,
    printError: error,
    clearPrintError: () => setError(null),
    openPrinterPicker: () => setPickerOpen(true),
    printerModal,
  };
}
