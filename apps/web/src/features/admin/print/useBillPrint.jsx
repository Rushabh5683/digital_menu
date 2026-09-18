import { useCallback, useRef, useState } from 'react';
import {
  buildThermalBillEscPos,
  buildThermalBillHtml,
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
 * Shared Print flow:
 * 1) ESC/POS raw via QZ (compact thermal) when QZ + printer available
 * 2) Browser print dialog fallback (HTML) if QZ is offline
 * Also: on-screen Preview (no paper) to check layout.
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

  const runEscPosPrint = useCallback(async (printerName, { restaurant, order, cashierName }) => {
    const paperWidthMm = 80;
    getSavedPaperWidthMm();
    const payload = buildThermalBillEscPos({
      restaurant,
      order,
      paperWidthMm,
      cashierName,
    });
    if (!payload?.base64) throw new Error('Order has nothing to print');
    await printRawEscPosWithQz(printerName, payload.base64);
  }, []);

  const runBrowserFallback = useCallback(({ restaurant, order, cashierName }) => {
    const html = buildThermalBillHtml({ restaurant, order, cashierName });
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
    setPending({ restaurant, order, cashierName });
    onPrintedRef.current = onPrinted || null;
    setPreviewHtml(html);
    setPreviewOpen(true);
    return { ok: true };
  }, []);

  const printBill = useCallback(
    async ({ restaurant, order, cashierName, forcePicker = false, onPrinted } = {}) => {
      setError(null);
      setPending({ restaurant, order, cashierName });
      onPrintedRef.current = onPrinted || null;

      if (forcePicker) {
        setPickerOpen(true);
        return { ok: false, needsPicker: true };
      }

      const saved = getSavedPrinter();
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
        await runEscPosPrint(saved, { restaurant, order, cashierName });
        await finishOk();
        return { ok: true, mode: 'escpos' };
      } catch (err) {
        if (isQzUnavailableError(err)) {
          try {
            runBrowserFallback({ restaurant, order, cashierName });
            await finishOk();
            setError('QZ Tray offline — opened browser print instead');
            return { ok: true, mode: 'browser-fallback' };
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

  const confirmPrinter = useCallback(
    async (printerName) => {
      if (!pending) return;
      setPrinting(true);
      setError(null);
      try {
        saveDefaultPrinter(printerName);
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
    await printBill({
      restaurant: pending.restaurant,
      order: pending.order,
      cashierName: pending.cashierName,
      onPrinted: onPrintedRef.current,
    });
  }, [pending, printBill]);

  const printerModal = (
    <>
      <PrinterSelectModal
        open={pickerOpen}
        busy={printing}
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
    previewBill,
    printing,
    printError: error,
    clearPrintError: () => setError(null),
    openPrinterPicker: () => setPickerOpen(true),
    printerModal,
  };
}
