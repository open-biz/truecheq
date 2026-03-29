import { Client, type Signer as XmtpSigner } from '@xmtp/xmtp-js';
import type { ethers } from 'ethers';

/**
 * Get signer from window.ethereum (World App, MetaMask, etc.)
 */
export async function getXMTPSigner(): Promise<{ address: string; signer: XmtpSigner } | null> {
  if (typeof window === 'undefined') return null;
  
  const ethereum = (window as any).ethereum;
  if (!ethereum) {
    throw new Error('No wallet found. Please install a wallet like World App or MetaMask.');
  }

  // Request accounts
  const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
  if (accounts.length === 0) {
    throw new Error('No accounts found. Please connect your wallet.');
  }
  
  const address = accounts[0];

  // Create a simple signer using ethers.js BrowserProvider
  const { BrowserProvider, JsonRpcSigner } = await import('ethers');
  const provider = new BrowserProvider(ethereum);
  const signer = await provider.getSigner();

  return { address, signer: signer as unknown as XmtpSigner };
}

/**
 * Legacy function for backward compatibility
 */
export async function getSignerFromWindow(): Promise<XmtpSigner | null> {
  const xmtpSignerInfo = await getXMTPSigner();
  return xmtpSignerInfo?.signer ?? null;
}

/**
 * Get XMTP environment from env
 */
export function getXMTPEnv(): 'dev' | 'production' {
  return (process.env.NEXT_PUBLIC_XMTP_ENV as 'dev' | 'production') || 'production';
}

/**
 * Create an XMTP client from an ethers signer
 * @param signer - An ethers.js Signer
 * @param env - XMTP environment
 */
export async function createXMTPClient(
  signer: XmtpSigner,
  env: 'dev' | 'production' = 'production'
): Promise<Client> {
  // Clear any old keys that might cause issues
  const address = await (signer as any).getAddress?.();
  if (address && typeof window !== 'undefined') {
    const oldKey = localStorage.getItem(`xmtp_identity_key_${address.toLowerCase()}`);
    if (oldKey) {
      localStorage.removeItem(`xmtp_identity_key_${address.toLowerCase()}`);
    }
  }
  
  // Create client - using production for V3 network
  const client = await Client.create(signer, { 
    env: env === 'production' ? 'production' : 'dev',
    persistConversations: false, // Don't persist to avoid storage issues
  });
  
  return client;
}