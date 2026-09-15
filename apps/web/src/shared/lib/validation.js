const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Digits-only length for phone checks. */
export function phoneDigitCount(value) {
  return String(value || '').replace(/\D/g, '').length;
}

/** Live input: keep digits only, max 10. */
export function sanitizePhoneInput(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 10);
}

export function isValidEmail(value) {
  const email = String(value || '').trim();
  if (!email) return false;
  if (email.length > 254) return false;
  return EMAIL_PATTERN.test(email);
}

/** Exactly 10 digits (formatting characters stripped). */
export function isValidPhone(value) {
  return sanitizePhoneInput(value).length === 10;
}

export function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

export function normalizePhone(value) {
  return sanitizePhoneInput(value);
}

export function validateEmailField(value, { required = false, label = 'Email' } = {}) {
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    return required ? `${label} is required` : null;
  }
  if (!isValidEmail(trimmed)) {
    return `Enter a valid ${label.toLowerCase()}`;
  }
  return null;
}

export function validatePhoneField(value, { required = false, label = 'Phone number' } = {}) {
  const digits = sanitizePhoneInput(value);
  if (!digits) {
    return required ? `${label} is required` : null;
  }
  if (digits.length !== 10) {
    return 'Phone number must be exactly 10 digits';
  }
  return null;
}

/** Indian GSTIN: 15 chars — e.g. 27AABCU9603R1ZM */
export const GSTIN_PATTERN =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export const GSTIN_PLACEHOLDER = '27AABCU9603R1ZM';

/** Live input: uppercase A–Z / 0–9 only, max 15. */
export function sanitizeGstinInput(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
    .slice(0, 15);
}

export function isValidGstin(value) {
  return GSTIN_PATTERN.test(sanitizeGstinInput(value));
}

export function validateGstinField(value, { required = false } = {}) {
  const gstin = sanitizeGstinInput(value);
  if (!gstin) {
    return required ? 'GSTIN is required when GST is enabled' : null;
  }
  if (!isValidGstin(gstin)) {
    return `Enter a valid 15-character GSTIN (e.g. ${GSTIN_PLACEHOLDER})`;
  }
  return null;
}

/** FSSAI licence is typically 14 digits. */
export function sanitizeFssaiInput(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 14);
}

export function validateFssaiField(value, { required = false } = {}) {
  const license = String(value || '').trim();
  if (!license) {
    return required ? 'FSSAI licence no. is required when GST is enabled' : null;
  }
  const digits = sanitizeFssaiInput(license);
  if (digits.length !== 14) {
    return 'FSSAI licence must be exactly 14 digits';
  }
  return null;
}
