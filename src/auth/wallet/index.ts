import { MiniKit } from '@worldcoin/minikit-js';
import { getNewNonces } from './server-helpers';
import { hashNonce } from './client-helpers';

/**
 * Authenticates a user via their wallet using a nonce-based challenge-response mechanism.
 *
 * This function generates a unique `nonce` and requests the user to sign it with their wallet,
 * producing a `signedNonce`. The `signedNonce` ensures the response we receive from wallet auth
 * is authentic and matches our session creation.
 *
 * @returns {Promise<{ nonce: string; signedNonce: string; address: string; message: string; signature: string }>}
 * @throws {Error} If wallet authentication fails at any step.
 */
export const walletAuth = async () => {
  const { nonce } = await getNewNonces();
  const signedNonce = hashNonce({ nonce });

  const result = await MiniKit.walletAuth({
    nonce,
    expirationTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    notBefore: new Date(Date.now() - 24 * 60 * 60 * 1000),
    statement: `Authenticate with TruCheq (${crypto.randomUUID().replace(/-/g, '')}).`,
  });

  return {
    nonce,
    signedNonce,
    address: result.data.address,
    message: result.data.message,
    signature: result.data.signature,
  };
};
