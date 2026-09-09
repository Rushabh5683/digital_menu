/**
 * Formats a numeric price into Indian Rupees (INR) using the Intl.NumberFormat API with en-IN locale.
 * Example: formatPrice(1250) -> '₹1,250'
 */
export const formatPrice = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(amount);
};
