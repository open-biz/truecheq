import { randomBytes } from 'crypto';

/**
 * Generates a new nonce for wallet authentication.
 * The nonce is used to ensure the authentication response is fresh and not replayed.
 */
export const getNewNonces = async () => {
  const nonce = randomBytes(32).toString('hex');
  return { nonce };
};
