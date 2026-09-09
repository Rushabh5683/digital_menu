const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Digits-only length for phone checks. */
export function phoneDigitCount(value) {
  return String(value || '').replace(/\D/g, '').length;
}

export function isValidEmail(value) {
  const email = String(value || '').trim();
  if (!email) return false;
  if (email.length > 254) return false;
  return EMAIL_PATTERN.test(email);
}

/**
 * Accepts common formatting characters, but requires exactly 10 digits.
 * Examples: 9876543210, 98765 43210, 98765-43210
 */
export function isValidPhone(value) {
  const phone = String(value || '').trim();
  if (!phone) return false;
  if (!/^[0-9\s\-().]+$/.test(phone)) return false;
  return phoneDigitCount(phone) === 10;
}

export function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

export function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '');
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
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    return required ? `${label} is required` : null;
  }
  if (!isValidPhone(trimmed)) {
    return 'Phone number must be exactly 10 digits';
  }
  return null;
}
