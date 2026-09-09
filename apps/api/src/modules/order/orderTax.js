/**
 * Tax-exclusive GST: total = subtotal + CGST + SGST (restaurant-wide rates).
 * Same pattern PetPooja uses for a restaurant’s default dine-in slab.
 */

export function money(value) {
  return Math.round(Number(value) * 100) / 100;
}

export function normalizeGstRate(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(100, money(n));
}

/**
 * @param {number} subtotal
 * @param {{ gstEnabled?: boolean, cgstRate?: number|string, sgstRate?: number|string }} settings
 */
export function computeExclusiveGst(subtotal, settings = {}) {
  const food = money(subtotal);
  const enabled = Boolean(settings.gstEnabled);
  const cgstRate = enabled ? normalizeGstRate(settings.cgstRate) : 0;
  const sgstRate = enabled ? normalizeGstRate(settings.sgstRate) : 0;
  const cgstAmount = enabled ? money((food * cgstRate) / 100) : 0;
  const sgstAmount = enabled ? money((food * sgstRate) / 100) : 0;
  const taxAmount = money(cgstAmount + sgstAmount);
  const rawTotal = money(food + taxAmount);
  // PetPooja-style: round grand total to nearest rupee
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

export function taxFieldsFromCompute(computed) {
  return {
    cgstRate: computed.cgstRate,
    sgstRate: computed.sgstRate,
    cgstAmount: computed.cgstAmount,
    sgstAmount: computed.sgstAmount,
    taxAmount: computed.taxAmount,
    roundOffAmount: computed.roundOffAmount ?? 0,
    total: computed.total,
  };
}
