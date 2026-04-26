/**
 * TruCheq x402 Payment Utilities
 * 
 * Supports both World Chain and Base Sepolia via x402 protocol
 */

// USDC on Base Sepolia (testnet)
export const USDC_ADDRESS_BASE = '0x036cbd53842c5426634e7929545ec598f828a2b5';
export const BASE_SEPOLIA_CHAIN_ID = 'eip155:84532';
export const BASE_SEPOLIA_ID = 84532;

// USDC on World Chain (testnet) - from AgentKit docs
export const USDC_ADDRESS_WORLD = '0x79A02482A880bCE3F13e09Da970dC34db4CD24d1';
export const WORLD_CHAIN_ID = 'eip155:480';
export const WORLD_CHAIN_NUM = 480;

// x402 Facilitator URLs
export const FACILITATOR_BASE = 'https://x402-sepolia.vercel.app/facilitator';
export const FACILITATOR_WORLD = 'https://x402-worldchain.vercel.app/facilitator';

// Supported chains for x402 payments
export const SUPPORTED_CHAINS = [
  { id: WORLD_CHAIN_ID, name: 'World Chain', usdc: USDC_ADDRESS_WORLD, facilitator: FACILITATOR_WORLD },
  { id: BASE_SEPOLIA_CHAIN_ID, name: 'Base Sepolia', usdc: USDC_ADDRESS_BASE, facilitator: FACILITATOR_BASE },
] as const;

// Default chain (World Chain preferred for agent traffic)
export const DEFAULT_X402_CHAIN = WORLD_CHAIN_ID;

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

/**
 * Get USDC address for a given chain ID
 */
export function getUSDCAddress(chainId: string): string {
  if (chainId === WORLD_CHAIN_ID) return USDC_ADDRESS_WORLD;
  if (chainId === BASE_SEPOLIA_CHAIN_ID) return USDC_ADDRESS_BASE;
  return USDC_ADDRESS_BASE; // default to Base Sepolia
}

/**
 * Get chain name from chain ID
 */
export function getChainName(chainId: string): string {
  if (chainId === WORLD_CHAIN_ID) return 'World Chain';
  if (chainId === BASE_SEPOLIA_CHAIN_ID) return 'Base Sepolia';
  return 'Unknown Chain';
}

/**
 * Get chain number from chain ID (eip155 format)
 */
export function getChainNumber(chainId: string): number {
  if (chainId === WORLD_CHAIN_ID) return WORLD_CHAIN_NUM;
  if (chainId === BASE_SEPOLIA_CHAIN_ID) return BASE_SEPOLIA_ID;
  return BASE_SEPOLIA_ID;
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