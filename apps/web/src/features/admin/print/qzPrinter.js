import qzTray from 'qz-tray';

const qz = qzTray?.websocket ? qzTray : qzTray?.default || qzTray;

const STORAGE_KEY = 'dm:default-printer';
const PAPER_KEY = 'dm:thermal-paper-mm';
const QZ_DOWNLOAD = 'https://qz.io/download/';

export function getSavedPrinter() {
  try {
    const name = window.localStorage.getItem(STORAGE_KEY);
    return name && name.trim() ? name.trim() : null;
  } catch {
    return null;
  }
}

export function saveDefaultPrinter(name) {
  try {
    if (name) window.localStorage.setItem(STORAGE_KEY, String(name).trim());
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function clearDefaultPrinter() {
  saveDefaultPrinter('');
}

/** Preferred thermal paper width in mm (58 default). */
export function getSavedPaperWidthMm() {
  try {
    const raw = window.localStorage.getItem(PAPER_KEY);
    const n = Number(raw);
    return n === 80 ? 80 : 58;
  } catch {
    return 58;
  }
}

export function savePaperWidthMm(mm) {
  try {
    window.localStorage.setItem(PAPER_KEY, String(mm === 80 ? 80 : 58));
  } catch {
    // ignore
  }
}

export function getQzDownloadUrl() {
  return QZ_DOWNLOAD;
}

let connectPromise = null;

/**
 * Connect to local QZ Tray (must be installed & running).
 * First connect may prompt the user to allow this site.
 */
export async function ensureQzConnected() {
  if (qz.websocket.isActive()) return true;
  if (!connectPromise) {
    connectPromise = qz.websocket
      .connect()
      .then(() => true)
      .catch((err) => {
        connectPromise = null;
        throw err;
      });
  }
  return connectPromise;
}

export async function listQzPrinters() {
  await ensureQzConnected();
  const found = await qz.printers.find();
  if (Array.isArray(found)) return found.map(String);
  if (found) return [String(found)];
  return [];
}

/**
 * Silent ESC/POS raw print via QZ Tray (compact thermal bills).
 * @param {string} printerName
 * @param {string} base64Payload - ESC/POS bytes as base64
 */
export async function printRawEscPosWithQz(printerName, base64Payload) {
  if (!printerName) throw new Error('Select a printer');
  if (!base64Payload) throw new Error('Nothing to print');

  await ensureQzConnected();
  const config = qz.configs.create(printerName, {
    encoding: 'ISO-8859-1',
  });

  await qz.print(config, [
    {
      type: 'raw',
      format: 'command',
      flavor: 'base64',
      data: base64Payload,
    },
  ]);
}

/**
 * @deprecated Prefer printRawEscPosWithQz for thermal printers.
 * Silent print HTML to a named printer via QZ Tray (no browser preview).
 */
export async function printHtmlWithQz(printerName, html) {
  if (!printerName) throw new Error('Select a printer');
  if (!html) throw new Error('Nothing to print');

  await ensureQzConnected();
  const config = qz.configs.create(printerName, {
    margins: 0,
    scaleContent: true,
    rasterize: true,
  });

  await qz.print(config, [
    {
      type: 'pixel',
      format: 'html',
      flavor: 'plain',
      data: html,
      options: {
        // 58mm ≈ 2.28in — safer default for small Indian POS printers
        pageWidth: 2.28,
      },
    },
  ]);
}

export function isQzUnavailableError(err) {
  const msg = String(err?.message || err || '').toLowerCase();
  return (
    msg.includes('unable to establish') ||
    msg.includes('websocket') ||
    msg.includes('connection') ||
    msg.includes('refused') ||
    msg.includes('qz tray') ||
    msg.includes('security') ||
    msg.includes('blocked')
  );
}
