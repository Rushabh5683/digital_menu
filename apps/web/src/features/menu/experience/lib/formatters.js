import { resolveMediaUrl } from '../../../../shared/lib/mediaUrl.js';

/**
 * Format dish price using restaurant currency when provided.
 * Decimal/string prices from the API are coerced to Number.
 */
export function formatPrice(amount, currency = 'INR', currencySymbol) {
  const value = Number(amount);
  if (Number.isNaN(value)) return '—';

  if (currencySymbol && !currency) {
    return `${currencySymbol}${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  }

  const code = (currency || 'INR').toUpperCase();
  try {
    return new Intl.NumberFormat(code === 'INR' ? 'en-IN' : 'en-GB', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: code === 'INR' ? 0 : 2,
      minimumFractionDigits: 0,
    }).format(value);
  } catch {
    const symbol = currencySymbol || (code === 'INR' ? '₹' : code === 'GBP' ? '£' : '$');
    return `${symbol}${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  }
}

export function dishImage(dish) {
  return resolveMediaUrl(dish?.image || dish?.imageUrl || '');
}

export function parsePrice(price) {
  const value = Number(price);
  return Number.isNaN(value) ? 0 : value;
}
