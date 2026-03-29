/**
 * Convert display price (e.g., "300") to USDC units (e.g., "300000000")
 * USDC has 6 decimal places
 */
export function toUSDCUnits(price: string | number): string {
  const priceRaw = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(priceRaw) || priceRaw <= 0) {
    return '0';
  }
  return Math.round(priceRaw * 1_000_000).toString();
}