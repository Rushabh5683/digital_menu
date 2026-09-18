import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AppError } from '../../middleware/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const QZ_DIR = path.resolve(__dirname, '../../../qz');

function loadPrivateKey() {
  const fromEnv = process.env.QZ_PRIVATE_KEY?.trim();
  if (fromEnv) {
    return fromEnv.includes('BEGIN')
      ? fromEnv
      : Buffer.from(fromEnv, 'base64').toString('utf8');
  }

  const keyPath = process.env.QZ_PRIVATE_KEY_PATH?.trim()
    || path.join(QZ_DIR, 'private-key.pem');

  try {
    return fs.readFileSync(keyPath, 'utf8');
  } catch {
    throw new AppError(
      'QZ signing key is not configured. Set QZ_PRIVATE_KEY or place apps/api/qz/private-key.pem.',
      503,
    );
  }
}

function loadCertificate() {
  const fromEnv = process.env.QZ_CERTIFICATE?.trim();
  if (fromEnv) {
    return fromEnv.includes('BEGIN')
      ? fromEnv
      : Buffer.from(fromEnv, 'base64').toString('utf8');
  }

  const certPath = process.env.QZ_CERTIFICATE_PATH?.trim()
    || path.join(QZ_DIR, 'digital-certificate.txt');

  try {
    return fs.readFileSync(certPath, 'utf8');
  } catch {
    throw new AppError('QZ certificate is not configured.', 503);
  }
}

let cachedKey = null;
let cachedCert = null;

export function getQzCertificate() {
  if (!cachedCert) cachedCert = loadCertificate();
  return cachedCert;
}

/**
 * Sign a QZ Tray request payload (SHA512 + RSA) and return base64 signature.
 * @param {string} request
 */
export function signQzRequest(request) {
  const toSign = String(request || '');
  if (!toSign) throw new AppError('Missing QZ sign request', 400);

  if (!cachedKey) cachedKey = loadPrivateKey();

  const signer = crypto.createSign('SHA512');
  signer.update(toSign);
  signer.end();
  return signer.sign(cachedKey, 'base64');
}
