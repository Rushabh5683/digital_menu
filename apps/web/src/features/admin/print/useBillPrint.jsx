import { useCallback, useRef, useState } from 'react';
import {
  buildThermalBillEscPos,
  buildThermalBillHtml,
  printHtmlViaIframe,
} from '../orderBillPrint.js';
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
 */
export function useBillPrint() {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pending, setPending] = useState(null);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState(null);
  const onPrintedRef = useRef(null);

  const closePicker = useCallback(() => {
    if (printing) return;
    setPickerOpen(false);
    setPending(null);
    onPrintedRef.current = null;
  }, [printing]);

  const runEscPosPrint = useCallback(async (printerName, { restaurant, order }) => {
    const paperWidthMm = getSavedPaperWidthMm();
    const payload = buildThermalBillEscPos({ restaurant, order, paperWidthMm });
    if (!payload?.base64) throw new Error('Order has nothing to print');
    await printRawEscPosWithQz(printerName, payload.base64);
  }, []);

  const runBrowserFallback = useCallback(({ restaurant, order }) => {
    const html = buildThermalBillHtml({ restaurant, order });
    if (!html) throw new Error('Order has nothing to print');
    printHtmlViaIframe(html);
  }, []);

  const finishOk = useCallback(async () => {
    const cb = onPrintedRef.current;
    onPrintedRef.current = null;
    setPickerOpen(false);
    setPending(null);
    if (typeof cb === 'function') await cb();
  }, []);

  const printBill = useCallback(
    async ({ restaurant, order, forcePicker = false, onPrinted } = {}) => {
      setError(null);
      setPending({ restaurant, order });
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
        await runEscPosPrint(saved, { restaurant, order });
        await finishOk();
        return { ok: true, mode: 'escpos' };
      } catch (err) {
        if (isQzUnavailableError(err)) {
          // QZ offline → browser print so floor is not blocked
          try {
            runBrowserFallback({ restaurant, order });
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

  const printerModal = (
    <PrinterSelectModal
      open={pickerOpen}
      busy={printing}
      onCancel={closePicker}
      onConfirm={confirmPrinter}
    />
  );

  return {
    printBill,
    printing,
    printError: error,
    clearPrintError: () => setError(null),
    openPrinterPicker: () => setPickerOpen(true),
    printerModal,
  };
}
