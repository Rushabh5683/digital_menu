/**
 * Client-side estimate of tax-exclusive CGST/SGST (matches server orderTax.js).
 */

export function money(value) {
  return Math.round(Number(value) * 100) / 100;
}

export function computeExclusiveGst(subtotal, settings = {}) {
  const food = money(subtotal);
  const enabled = Boolean(settings?.gstEnabled);
  const cgstRate = enabled ? Math.min(100, Math.max(0, Number(settings.cgstRate) || 0)) : 0;
  const sgstRate = enabled ? Math.min(100, Math.max(0, Number(settings.sgstRate) || 0)) : 0;
  const cgstAmount = enabled ? money((food * cgstRate) / 100) : 0;
  const sgstAmount = enabled ? money((food * sgstRate) / 100) : 0;
  const taxAmount = money(cgstAmount + sgstAmount);
  const rawTotal = money(food + taxAmount);
  const total = Math.round(rawTotal);
  const roundOffAmount = money(total - rawTotal);
  return {
    gstEnabled: enabled && (cgstRate > 0 || sgstRate > 0),
    cgstRate,
    sgstRate,
    cgstAmount,
    sgstAmount,
    taxAmount,
    roundOffAmount,
    total,
  };
}
