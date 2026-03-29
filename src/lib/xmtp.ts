import { Client } from '@xmtp/xmtp-js';
import { BrowserProvider, JsonRpcSigner } from 'ethers';

// Re-export for use in components
export { BrowserProvider, JsonRpcSigner };

/**
 * Get signer from window.ethereum (World App, MetaMask, etc.)
 * No wagmi/rainbowkit required - uses injected provider directly
 */
export async function getSignerFromWindow(): Promise<JsonRpcSigner | null> {
  if (typeof window === 'undefined') return null;
  
  const ethereum = (window as any).ethereum;
  if (!ethereum) {
    throw new Error('No wallet found. Please install World App, MetaMask, or another Ethereum wallet.');
  }

  // Check if any accounts are available
  const accounts = await ethereum.request({ method: 'eth_accounts' });
  if (accounts.length === 0) {
    // Request accounts (this will prompt the user to connect)
    const requestedAccounts = await ethereum.request({ method: 'eth_requestAccounts' });
    if (requestedAccounts.length === 0) {
      throw new Error('No accounts found. Please connect your wallet.');
    }
  }

  const provider = new BrowserProvider(ethereum);
  const signer = await provider.getSigner();
  return signer;
}

/**
 * Get the connected wallet address from window.ethereum
 */
export async function getConnectedAddress(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  
  const ethereum = (window as any).ethereum;
  if (!ethereum) return null;

  try {
    const accounts = await ethereum.request({ method: 'eth_accounts' });
    return accounts.length > 0 ? accounts[0] : null;
  } catch {
    return null;
  }
}

/**
 * Create an XMTP client from an ethers signer
 * @param signer - An ethers.js Signer
 * @param env - XMTP environment ( 'dev' | 'production' ) - must be 'production' for V3
 */
export async function createXMTPClient(
  signer: JsonRpcSigner,
  _env: 'dev' | 'production' = 'production'
): Promise<Client> {
  // Clear any old V2 keys that might cause issues
  const address = await signer.getAddress();
  const oldKey = localStorage.getItem(`xmtp_identity_key_${address.toLowerCase()}`);
  if (oldKey) {
    localStorage.removeItem(`xmtp_identity_key_${address.toLowerCase()}`);
  }
  
  // Create client with production env (V3 network)
  const client = await Client.create(signer, { 
    env: 'production',
    persistConversations: false,
  });
  
  return client;
}

/**
 * Get the XMTP environment from environment variables
 * Defaults to 'production' for V3 network (V2 is deprecated)
 */
export function getXMTPEnv(): 'dev' | 'production' {
  if (typeof window !== 'undefined') {
    // V2 network is deprecated, use production (V3) by default
    return (process.env.NEXT_PUBLIC_XMTP_ENV as 'dev' | 'production') || 'production';
  }
  return 'production';
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