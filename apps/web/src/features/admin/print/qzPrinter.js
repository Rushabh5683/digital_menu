import qzTray from 'qz-tray';

const qz = qzTray?.websocket ? qzTray : qzTray?.default || qzTray;

const STORAGE_KEY = 'dm:default-printer';
const QZ_DOWNLOAD = 'https://qz.io/download/';

/** 80mm thermal width in inches for QZ pixel HTML. */
const THERMAL_WIDTH_IN = 3.15;

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
 * Silent print HTML to a named printer via QZ Tray (no browser preview).
 */
export async function printHtmlWithQz(printerName, html) {
  if (!printerName) throw new Error('Select a printer');
  if (!html) throw new Error('Nothing to print');

  await ensureQzConnected();
  const config = qz.configs.create(printerName, {
    margins: 0,
    scaleContent: false,
    rasterize: true,
  });

  await qz.print(config, [
    {
      type: 'pixel',
      format: 'html',
      flavor: 'plain',
      data: html,
      options: {
        pageWidth: THERMAL_WIDTH_IN,
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
