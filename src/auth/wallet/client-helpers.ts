import { createHash } from 'crypto';

/**
 * Hashes a nonce using SHA-256 for client-side verification.
 * This ensures the signed nonce matches what the server expects.
 */
export const hashNonce = ({ nonce }: { nonce: string }): string => {
  return createHash('sha256').update(nonce).digest('hex');
};
