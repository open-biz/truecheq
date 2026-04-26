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
  metadata?: DealMetadata;
}

export const SEED_LISTINGS: Listing[] = [
  {
    cid: 'QmVaTcgW2rqEjNRGsUSGi75D1YRhgtbya7SJhdQqjF9mbQ',
    seller: XMTP_AGENT_ADDRESS,
    price: '1',
    metadataUrl: 'https://parallel-pink-stork.myfilebase.com/ipfs/QmXCc58tWay4zcf6kMRo2vingZYwRWMm6r9XMZrzx45AqW',
    isOrbVerified: true,
  },
  {
    cid: 'Qmcu7vPqyimqLrzjdeZbxKXj39D8LdyieLSkfU269LdtPp',
    seller: XMTP_AGENT_ADDRESS,
    price: '1',
    metadataUrl: 'https://parallel-pink-stork.myfilebase.com/ipfs/QmRZKCR9WsxiwiktWxJph72xHAzjuU45KVM2TDr25XB7ip',
    isOrbVerified: true,
  },
  {
    cid: 'QmdfjExyMR2WqosXr9Vr8YU8ZVTLP31Be8nhnnrZLQNrDR',
    seller: XMTP_AGENT_ADDRESS,
    price: '1',
    metadataUrl: 'https://parallel-pink-stork.myfilebase.com/ipfs/QmYG7GWttxyJbCD6PN5t11p4EQiDQHwcjd21rVsfU5eAyw',
    isOrbVerified: true,
  },
  {
    cid: 'QmNrwrBbkjFSui4EdUmTqdXNpdGuDeeV4p5HsRHWixfESN',
    seller: XMTP_AGENT_ADDRESS,
    price: '1',
    metadataUrl: 'https://parallel-pink-stork.myfilebase.com/ipfs/QmcRmSitcNmNpcvjSKDdCAYPcMgvVMVrHk9zKMaAAtatjo',
    isOrbVerified: false,
  },
  {
    cid: 'QmSnWxkB82MdtbHcJxpmqWYHSefhy47Kxf9hQY7d1UGZaZ',
    seller: XMTP_AGENT_ADDRESS,
    price: '1',
    metadataUrl: 'https://parallel-pink-stork.myfilebase.com/ipfs/QmYMieEdbq1MJ3AWMM1GLRmHjqjHrjfVe3mJNim1VoG4mp',
    isOrbVerified: false,
  },
];
