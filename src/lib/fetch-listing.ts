import { cache } from 'react';
import { type DealMetadata } from '@/lib/filebase';

/**
 * Plain fetch for listing metadata — used as the base for both cached (RSC)
 * and uncached (edge runtime) variants.
 */
async function fetchListingMetaBase(
  metadataUrl: string,
  init?: RequestInit,
): Promise<DealMetadata | null> {
  try {
    const res = await fetch(metadataUrl, init);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Cached fetch for React Server Component contexts (deal page, generateMetadata).
 * Wrapped with React.cache() so the same URL is only fetched once per request.
 */
export const fetchListingMeta = cache((url: string) =>
  fetchListingMetaBase(url, { next: { revalidate: 300 } }),
);

/**
 * Uncached fetch for edge runtime contexts (OG image route handler)
 * where React.cache() is not available.
 */
export const fetchListingMetaEdge = (url: string) =>
  fetchListingMetaBase(url);
