import { Client } from '@xmtp/xmtp-js';
import { BrowserProvider, JsonRpcSigner } from 'ethers';
import type { WalletClient } from 'viem';

// Re-export for use in components
export type { WalletClient };
export { BrowserProvider, JsonRpcSigner };

/**
 * Convert a viem WalletClient to an ethers v6 Signer
 * This solves the wagmi v2 + ethers v6 + XMTP signer incompatibility
 */
export async function walletClientToSigner(walletClient: WalletClient): Promise<JsonRpcSigner> {
  if (!walletClient.account || !walletClient.chain) {
    throw new Error('WalletClient is missing account or chain');
  }

  const { account, chain, transport } = walletClient;

  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  };

  // Create an ethers BrowserProvider from the viem transport
  const provider = new BrowserProvider(transport, network);
  
  // Return a JsonRpcSigner for the wallet's account
  return new JsonRpcSigner(provider, account.address);
}

/**
 * Create an XMTP client from a wagmi WalletClient
 * @param walletClient - The wagmi/viem wallet client
 * @param env - XMTP environment ( 'dev' | 'production' )
 */
export async function createXMTPClient(
  walletClient: WalletClient,
  env: 'dev' | 'production' = 'dev'
): Promise<Client> {
  const signer = await walletClientToSigner(walletClient);
  const client = await Client.create(signer, { env });
  return client;
}

/**
 * Get the XMTP environment from environment variables
 * Defaults to 'dev' for development
 */
export function getXMTPEnv(): 'dev' | 'production' {
  if (typeof window !== 'undefined') {
    return (process.env.NEXT_PUBLIC_XMTP_ENV as 'dev' | 'production') || 'dev';
  }
  return 'dev';
}

// XMTP key storage - use localStorage to persist the XMTP identity
const XMTP_KEY_PREFIX = 'xmtp_identity_key_';

export function getStoredXMTPKey(address: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(`${XMTP_KEY_PREFIX}${address.toLowerCase()}`);
}

export function setStoredXMTPKey(address: string, key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`${XMTP_KEY_PREFIX}${address.toLowerCase()}`, key);
}

export function removeStoredXMTPKey(address: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`${XMTP_KEY_PREFIX}${address.toLowerCase()}`);
}