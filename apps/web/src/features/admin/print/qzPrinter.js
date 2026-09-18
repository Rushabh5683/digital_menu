import qzTray from 'qz-tray';
import { api } from '../../../shared/api/client.js';

const qz = qzTray?.websocket ? qzTray : qzTray?.default || qzTray;

const STORAGE_KEY_BILL = 'dm:default-printer';
const STORAGE_KEY_KOT = 'dm:kot-printer';
/** @deprecated legacy key — treated as bill printer */
const STORAGE_KEY_LEGACY = 'dm:default-printer';
const PAPER_KEY = 'dm:thermal-paper-mm';
const QZ_DOWNLOAD = 'https://qz.io/download/';

function printerStorageKey(kind = 'bill') {
  return kind === 'kot' ? STORAGE_KEY_KOT : STORAGE_KEY_BILL;
}

/** Saved printer for guest bills (counter) or KOT (kitchen). */
export function getSavedPrinter(kind = 'bill') {
  try {
    const key = printerStorageKey(kind);
    const name = window.localStorage.getItem(key);
    if (name && name.trim()) return name.trim();
    // Older installs only had one printer key — use it for bills only
    if (kind === 'bill') {
      const legacy = window.localStorage.getItem(STORAGE_KEY_LEGACY);
      return legacy && legacy.trim() ? legacy.trim() : null;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveDefaultPrinter(name, kind = 'bill') {
  try {
    const key = printerStorageKey(kind);
    if (name) window.localStorage.setItem(key, String(name).trim());
    else window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function clearDefaultPrinter(kind = 'bill') {
  saveDefaultPrinter('', kind);
}

/**
 * Thermal paper width in mm.
 * Always 80mm for restaurant POS rolls — stale localStorage `58` caused
 * narrow left-aligned bills with empty right margin on real 80mm paper.
 */
export function getSavedPaperWidthMm() {
  try {
    const raw = window.localStorage.getItem(PAPER_KEY);
    if (raw === '58') window.localStorage.setItem(PAPER_KEY, '80');
  } catch {
    // ignore
  }
  return 80;
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

export function getQzOverrideCertUrl() {
  return '/qz/override.crt';
}

let connectPromise = null;
let securityConfigured = false;

/**
 * Register QZ certificate + signature handlers once.
 * Without this, Tray prompts on every print and "Remember" often will not stick.
 */
function ensureQzSecurity() {
  if (securityConfigured) return;
  securityConfigured = true;

  qz.security.setCertificatePromise((resolve, reject) => {
    api
      .getQzCertificate()
      .then((cert) => {
        const text = typeof cert === 'string' ? cert : '';
        if (!text.includes('BEGIN CERTIFICATE')) {
          reject(new Error('Invalid QZ certificate from server'));
          return;
        }
        resolve(text);
      })
      .catch((err) => reject(err));
  });

  if (typeof qz.security.setSignatureAlgorithm === 'function') {
    qz.security.setSignatureAlgorithm('SHA512');
  }

  qz.security.setSignaturePromise((toSign) => {
    return (resolve, reject) => {
      api
        .signQzRequest(toSign)
        .then((signature) => {
          const text = typeof signature === 'string' ? signature.trim() : '';
          if (!text) {
            reject(new Error('Empty QZ signature'));
            return;
          }
          resolve(text);
        })
        .catch((err) => reject(err));
    };
  });
}

/**
 * Connect to local QZ Tray (must be installed & running).
 * First connect may prompt once — choose Allow + Remember this decision.
 */
export async function ensureQzConnected() {
  ensureQzSecurity();
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
        // 80mm ≈ 3.15in printable width
        pageWidth: 3.15,
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
