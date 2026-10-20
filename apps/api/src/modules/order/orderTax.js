/**
 * Tax-exclusive GST: total = subtotal + CGST + SGST (restaurant-wide rates).
 * GST may be limited to the taxable portion of a mixed order.
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
 * @param {number} subtotal Total of every order line before tax.
 * @param {{ gstEnabled?: boolean, cgstRate?: number|string, sgstRate?: number|string }} settings
 * @param {number} taxableSubtotal Total of only tax-applicable order lines.
 */
export function computeExclusiveGst(subtotal, settings = {}, taxableSubtotal = subtotal) {
  const food = money(subtotal);
  const taxableFood = Math.min(food, Math.max(0, money(taxableSubtotal)));
  const enabled = Boolean(settings.gstEnabled);
  const cgstRate = enabled ? normalizeGstRate(settings.cgstRate) : 0;
  const sgstRate = enabled ? normalizeGstRate(settings.sgstRate) : 0;
  const cgstAmount = enabled ? money((taxableFood * cgstRate) / 100) : 0;
  const sgstAmount = enabled ? money((taxableFood * sgstRate) / 100) : 0;
  const taxAmount = money(cgstAmount + sgstAmount);
  const rawTotal = money(food + taxAmount);
  // PetPooja-style: round grand total to nearest rupee
  const total = Math.round(rawTotal);
  const roundOffAmount = money(total - rawTotal);
  return {
    gstEnabled: enabled && taxableFood > 0 && (cgstRate > 0 || sgstRate > 0),
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
