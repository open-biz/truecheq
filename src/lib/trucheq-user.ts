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
  /** Connected wallet address — THIS IS THE LOGIN (SIWE / wagmi) */
  walletAddress: string;
  /** World ID nullifier hash — unique per user per action. Optional until World ID verified. */
  nullifierHash?: string;
  /** Whether verified via Orb (biometric) vs Device. false until World ID verification completed. */
  isOrbVerified: boolean;
  /** Verification level: 'none' = wallet-only, 'device' = Device verified, 'orb' = Orb verified */
  verificationLevel: 'none' | 'device' | 'orb';
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
  // FeedTab/ProfileTab filter by connected wallet address, so there's no leak.
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

/** Create a TruCheqUser from wallet connection (login) */
export function createTruCheqUser(params: {
  walletAddress: string;
  nullifierHash?: string;
  isOrbVerified?: boolean;
  sessionId?: string;
}): TruCheqUser {
  const isVerified = params.isOrbVerified ?? false;
  const verificationLevel: TruCheqUser['verificationLevel'] =
    isVerified && params.nullifierHash
      ? (params.isOrbVerified ? 'orb' : 'device')
      : 'none';
  const codeSource = params.nullifierHash || params.walletAddress;
  return {
    walletAddress: params.walletAddress,
    nullifierHash: params.nullifierHash,
    isOrbVerified: isVerified,
    verificationLevel,
    truCheqCode: generateTruCheqCode(codeSource),
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
      if (!seller.walletAddress) return null; // need wallet for new schema
      const user = createTruCheqUser({
        walletAddress: seller.walletAddress,
        nullifierHash: seller.nullifierHash,
        isOrbVerified: seller.isOrbVerified,
        sessionId: seller.sessionId,
      });
      saveTruCheqUser(user);
      return user;
    } catch { /* ignore */ }
  }

  // Try buyer data
  const buyerStored = localStorage.getItem(STORAGE_KEYS.BUYER);
  if (buyerStored) {
    try {
      const buyer = JSON.parse(buyerStored);
      if (!buyer.walletAddress) return null; // need wallet for new schema
      const user = createTruCheqUser({
        walletAddress: buyer.walletAddress,
        nullifierHash: buyer.nullifierHash,
        isOrbVerified: buyer.isOrbVerified,
      });
      saveTruCheqUser(user);
      return user;
    } catch { /* ignore */ }
  }

  return null;
}
