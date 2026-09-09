import { useCallback, useRef, useState } from 'react';
import { buildThermalBillHtml } from '../orderBillPrint.js';
import { PrinterSelectModal } from './PrinterSelectModal.jsx';
import {
  getSavedPrinter,
  isQzUnavailableError,
  listQzPrinters,
  printHtmlWithQz,
} from './qzPrinter.js';

/**
 * Shared Print flow: thermal bill → QZ silent print using saved default printer,
 * or open picker when no default / printer missing.
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

  const runPrint = useCallback(async (printerName, { restaurant, order }) => {
    const html = buildThermalBillHtml({ restaurant, order });
    if (!html) throw new Error('Order has nothing to print');
    await printHtmlWithQz(printerName, html);
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
        await runPrint(saved, { restaurant, order });
        await finishOk();
        return { ok: true };
      } catch (err) {
        if (isQzUnavailableError(err)) {
          setPickerOpen(true);
          setError(err.message || 'QZ Tray is not available');
          return { ok: false, needsPicker: true, error: err };
        }
        setPickerOpen(true);
        setError(err.message || 'Print failed');
        return { ok: false, needsPicker: true, error: err };
      } finally {
        setPrinting(false);
      }
    },
    [finishOk, runPrint],
  );

  const confirmPrinter = useCallback(
    async (printerName) => {
      if (!pending) return;
      setPrinting(true);
      setError(null);
      try {
        await runPrint(printerName, pending);
        await finishOk();
      } catch (err) {
        setError(err.message || 'Print failed');
      } finally {
        setPrinting(false);
      }
    },
    [finishOk, pending, runPrint],
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
