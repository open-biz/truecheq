/**
 * TruCheq x402 Payment Utilities
 * 
 * Supports World Chain and Base mainnet via x402 protocol.
 * Testnet (Sepolia) chains are kept for development but are not the default.
 */

// ----------------------------------------------------------------------------
// Mainnet (Production)
// ----------------------------------------------------------------------------

// USDC on Base Mainnet — Circle native issuance
export const USDC_ADDRESS_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
export const BASE_CHAIN_ID = 'eip155:8453';
export const BASE_CHAIN_NUM = 8453;

// USDC on World Chain Mainnet — Circle native issuance
export const USDC_ADDRESS_WORLD = '0x75880D58C08A49C8281143878bC250882e75D304';
export const WORLD_CHAIN_ID = 'eip155:480';
export const WORLD_CHAIN_NUM = 480;

// x402 Facilitator URLs (production)
// Production uses the CDP facilitator; testnet used the public demo facilitator.
export const FACILITATOR_BASE = 'https://api.cdp.coinbase.com/platform/v2/x402';
export const FACILITATOR_WORLD = 'https://api.cdp.coinbase.com/platform/v2/x402';

// ----------------------------------------------------------------------------
// Testnet (Sepolia) — kept for development
// ----------------------------------------------------------------------------

export const USDC_ADDRESS_BASE_SEPOLIA = '0x036cbd53842c5426634e7929545ec598f828a2b5';
export const BASE_SEPOLIA_CHAIN_ID = 'eip155:84532';
export const BASE_SEPOLIA_ID = 84532;

export const USDC_ADDRESS_WORLD_SEPOLIA = '0x79A02482A880bCE3F13e09Da970dC34db4CD24d1';

export const FACILITATOR_BASE_SEPOLIA = 'https://x402-sepolia.vercel.app/facilitator';
export const FACILITATOR_WORLD_SEPOLIA = 'https://x402-worldchain.vercel.app/facilitator';

// ----------------------------------------------------------------------------
// Supported chains for x402 payments
// ----------------------------------------------------------------------------

export const SUPPORTED_CHAINS = [
  { id: WORLD_CHAIN_ID, name: 'World Chain', usdc: USDC_ADDRESS_WORLD, facilitator: FACILITATOR_WORLD },
  { id: BASE_CHAIN_ID, name: 'Base', usdc: USDC_ADDRESS_BASE, facilitator: FACILITATOR_BASE },
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
  if (chainId === BASE_CHAIN_ID) return USDC_ADDRESS_BASE;
  if (chainId === BASE_SEPOLIA_CHAIN_ID) return USDC_ADDRESS_BASE_SEPOLIA;
  return USDC_ADDRESS_BASE; // default to Base mainnet
}

/**
 * Get chain name from chain ID
 */
export function getChainName(chainId: string): string {
  if (chainId === WORLD_CHAIN_ID) return 'World Chain';
  if (chainId === BASE_CHAIN_ID) return 'Base';
  if (chainId === BASE_SEPOLIA_CHAIN_ID) return 'Base Sepolia';
  return 'Unknown Chain';
}

/**
 * Get chain number from chain ID (eip155 format)
 */
export function getChainNumber(chainId: string): number {
  if (chainId === WORLD_CHAIN_ID) return WORLD_CHAIN_NUM;
  if (chainId === BASE_CHAIN_ID) return BASE_CHAIN_NUM;
  if (chainId === BASE_SEPOLIA_CHAIN_ID) return BASE_SEPOLIA_ID;
  return BASE_CHAIN_NUM;
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