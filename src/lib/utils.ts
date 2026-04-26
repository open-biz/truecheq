import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getProxiedImageUrl(url?: string): string {
  if (!url) return '';
  // Don't proxy local images
  if (url.startsWith('/') || url.startsWith('blob:')) return url;
  return `/api/image-proxy?url=${encodeURIComponent(url)}`;
}

// Shared localStorage keys for TruCheq user data
export const STORAGE_KEYS = {
  /** Seller data (World ID + wallet info) */
  SELLER: 'trucheq_user_data',
  /** Buyer data (World ID + wallet info) */
  BUYER: 'trucheq_buyer_data',
  /** XMTP lazy activation flag — set when user first visits Chat tab */
  XMTP_ACTIVATED: 'trucheq_xmtp_activated',
  /** User-created listings — array of {cid, metadataUrl, seller, price, createdAt} */
  USER_LISTINGS: 'trucheq_user_listings',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];
