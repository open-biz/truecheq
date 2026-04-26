/**
 * Unified TruCheq User Identity
 * 
 * Replaces the separate WorldIDUser (seller) and WorldIDBuyer (buyer) types.
 * A single user can be both buyer and seller — they share the same World ID.
 */

import { STORAGE_KEYS } from './utils';

// ============================================================================
// Types
// ============================================================================

export interface TruCheqUser {
  /** World ID nullifier hash — unique per user per action */
  nullifierHash: string;
  /** Whether verified via Orb (biometric) vs Device */
  isOrbVerified: boolean;
  /** Verification level string */
  verificationLevel: 'orb' | 'device';
  /** Connected wallet address (from wagmi/MiniKit) */
  walletAddress?: string;
  /** Derived TruCheq code for finding seller's listings */
  truCheqCode: string;
  /** Session ID from World ID verification */
  sessionId?: string;
  /** When this identity was created */
  createdAt: number;
}

// ============================================================================
// Storage
// ============================================================================

const STORAGE_KEY = 'trucheq_user';

/** Save unified user to localStorage */
export function saveTruCheqUser(user: TruCheqUser): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

/** Load unified user from localStorage */
export function loadTruCheqUser(): TruCheqUser | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as TruCheqUser;
  } catch {
    return null;
  }
}

/** Clear unified user and all legacy keys from localStorage */
export function clearTruCheqUser(): void {
  localStorage.removeItem(STORAGE_KEY);
  // Also wipe old separate seller/buyer keys (left over from migration)
  localStorage.removeItem(STORAGE_KEYS.SELLER);
  localStorage.removeItem(STORAGE_KEYS.BUYER);
  // Clear XMTP lazy activation flag so chat doesn't auto-connect after logout
  localStorage.removeItem(STORAGE_KEYS.XMTP_ACTIVATED);
  // NOTE: USER_LISTINGS is NOT cleared here — listings persist across sessions
  // since they're tied to the seller's wallet address, not the browser session.
  // DealDashboard filters by connected wallet address, so there's no leak.
}

// ============================================================================
// Helpers
// ============================================================================

/** Generate short TruCheq code from nullifier (first 4 chars as digits) */
export function generateTruCheqCode(nullifier: string): string {
  const hex = nullifier.slice(2, 10); // skip '0x' and take 8 chars
  let code = '';
  for (let i = 0; i < 4; i++) {
    const num = parseInt(hex.slice(i * 2, i * 2 + 2), 16) % 100;
    code += num.toString().padStart(2, '0');
  }
  return code;
}

/** Create a TruCheqUser from World ID verification result */
export function createTruCheqUser(params: {
  nullifierHash: string;
  isOrbVerified: boolean;
  sessionId?: string;
  walletAddress?: string;
}): TruCheqUser {
  return {
    nullifierHash: params.nullifierHash,
    isOrbVerified: params.isOrbVerified,
    verificationLevel: params.isOrbVerified ? 'orb' : 'device',
    walletAddress: params.walletAddress,
    truCheqCode: generateTruCheqCode(params.nullifierHash),
    sessionId: params.sessionId,
    createdAt: Date.now(),
  };
}

// ============================================================================
// Migration: Convert old separate seller/buyer data to unified user
// ============================================================================

/** Migrate old separate seller/buyer localStorage data to unified user */
export function migrateToUnifiedUser(): TruCheqUser | null {
  // Try seller data first (it has wallet address)
  const sellerStored = localStorage.getItem(STORAGE_KEYS.SELLER);
  if (sellerStored) {
    try {
      const seller = JSON.parse(sellerStored);
      const user = createTruCheqUser({
        nullifierHash: seller.nullifierHash,
        isOrbVerified: seller.isOrbVerified,
        sessionId: seller.sessionId,
        walletAddress: seller.walletAddress,
      });
      saveTruCheqUser(user);
      // Don't delete old keys yet — let them coexist during transition
      return user;
    } catch { /* ignore */ }
  }

  // Try buyer data
  const buyerStored = localStorage.getItem(STORAGE_KEYS.BUYER);
  if (buyerStored) {
    try {
      const buyer = JSON.parse(buyerStored);
      const user = createTruCheqUser({
        nullifierHash: buyer.nullifierHash,
        isOrbVerified: buyer.isOrbVerified,
        walletAddress: buyer.walletAddress,
      });
      saveTruCheqUser(user);
      return user;
    } catch { /* ignore */ }
  }

  return null;
}
