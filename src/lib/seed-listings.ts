import type { DealMetadata } from '@/lib/filebase';

// Demo seller address — configurable via NEXT_PUBLIC_DEMO_SELLER_ADDRESS env var.
// Note: NEXT_PUBLIC_ vars are inlined at build time by Next.js, so changing
// this requires a rebuild. Falls back to the known demo address.
export const XMTP_AGENT_ADDRESS =
  process.env.NEXT_PUBLIC_DEMO_SELLER_ADDRESS ||
  '0x8677e5831257e52a35d1463cfb414eda34344f4f';

export interface Listing {
  cid: string;
  seller: string;
  price: string;
  metadataUrl: string;
  isOrbVerified: boolean;
  /** Verification level — 'none' for unverified sellers, 'device' or 'orb' for World ID verified */
  verificationLevel?: 'none' | 'device' | 'orb';
  metadata?: DealMetadata;
}

/**
 * Derive verificationLevel from isOrbVerified when verificationLevel is missing.
 * This handles listings loaded from IPFS or old localStorage that don't have
 * verificationLevel set yet.
 */
export function getVerificationLevel(listing: Listing): 'none' | 'device' | 'orb' {
  if (listing.verificationLevel) return listing.verificationLevel;
  // Fallback: derive from isOrbVerified
  // Old data: isOrbVerified=true → orb, isOrbVerified=false → device (was the only other option)
  // New data should always have verificationLevel set
  return listing.isOrbVerified ? 'orb' : 'device';
}

export const SEED_LISTINGS: Listing[] = [
  {
    cid: 'QmVaTcgW2rqEjNRGsUSGi75D1YRhgtbya7SJhdQqjF9mbQ',
    seller: XMTP_AGENT_ADDRESS,
    price: '1',
    metadataUrl: 'https://parallel-pink-stork.myfilebase.com/ipfs/QmXCc58tWay4zcf6kMRo2vingZYwRWMm6r9XMZrzx45AqW',
    isOrbVerified: true,
    verificationLevel: 'orb',
  },
  {
    cid: 'Qmcu7vPqyimqLrzjdeZbxKXj39D8LdyieLSkfU269LdtPp',
    seller: XMTP_AGENT_ADDRESS,
    price: '1',
    metadataUrl: 'https://parallel-pink-stork.myfilebase.com/ipfs/QmRZKCR9WsxiwiktWxJph72xHAzjuU45KVM2TDr25XB7ip',
    isOrbVerified: true,
    verificationLevel: 'orb',
  },
  {
    cid: 'QmdfjExyMR2WqosXr9Vr8YU8ZVTLP31Be8nhnnrZLQNrDR',
    seller: XMTP_AGENT_ADDRESS,
    price: '1',
    metadataUrl: 'https://parallel-pink-stork.myfilebase.com/ipfs/QmYG7GWttxyJbCD6PN5t11p4EQiDQHwcjd21rVsfU5eAyw',
    isOrbVerified: true,
    verificationLevel: 'orb',
  },
  {
    cid: 'QmNrwrBbkjFSui4EdUmTqdXNpdGuDeeV4p5HsRHWixfESN',
    seller: XMTP_AGENT_ADDRESS,
    price: '1',
    metadataUrl: 'https://parallel-pink-stork.myfilebase.com/ipfs/QmcRmSitcNmNpcvjSKDdCAYPcMgvVMVrHk9zKMaAAtatjo',
    isOrbVerified: false,
    verificationLevel: 'device',
  },
  {
    cid: 'QmSnWxkB82MdtbHcJxpmqWYHSefhy47Kxf9hQY7d1UGZaZ',
    seller: XMTP_AGENT_ADDRESS,
    price: '1',
    metadataUrl: 'https://parallel-pink-stork.myfilebase.com/ipfs/QmYMieEdbq1MJ3AWMM1GLRmHjqjHrjfVe3mJNim1VoG4mp',
    isOrbVerified: false,
    verificationLevel: 'device',
  },
];
