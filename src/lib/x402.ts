/**
 * TruCheq x402 Payment Utilities
 * 
 * Uses x402-next for Next.js integration and @coinbase/x402 for client payments
 */

// USDC on Base Sepolia (testnet)
export const USDC_ADDRESS = '0x036cbd53842c5426634e7929545ec598f828a2b5';
export const BASE_SEPOLIA_CHAIN_ID = 'eip155:84532';

// Convert display price (e.g., "300") to USDC units (e.g., "300000000")
// USDC has 6 decimal places
export function toUSDCUnits(price: string | number): string {
  const priceRaw = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(priceRaw) || priceRaw <= 0) {
    return '0';
  }
  return Math.round(priceRaw * 1_000_000).toString();
}

/**
 * Format price for x402 display (e.g., "$300")
 */
export function formatPriceForX402(price: string | number): string {
  const priceRaw = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(priceRaw)) {
    return '$0';
  }
  return `$${priceRaw.toFixed(2)}`;
}

/**
 * Payment requirement configuration for withX402
 */
export interface PaymentRequirement {
  price: string;       // e.g., "$300"
  network: string;     // e.g., "eip155:84532"
  payTo: string;       // Seller's wallet address
  asset?: string;      // Token address (defaults to USDC)
}

export interface ListingMetadata {
  itemName: string;
  description: string;
  price: string;
  images: string[];
  seller: string;
  createdAt: number;
  isOrbVerified: boolean;
}