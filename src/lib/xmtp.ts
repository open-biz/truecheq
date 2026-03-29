import type { Signer, Identifier } from '@xmtp/browser-sdk';
import { IdentifierKind } from '@xmtp/browser-sdk';

// Re-export Identifier type for use in components
export type { Identifier };

// Client is imported dynamically to avoid WASM issues during SSR
let Client: typeof import('@xmtp/browser-sdk').Client | null = null;

async function getClient() {
  if (!Client) {
    const module = await import('@xmtp/browser-sdk');
    Client = module.Client;
  }
  return Client;
}

/**
 * Convert an Ethereum address to an XMTP Identifier
 */
function addressToIdentifier(address: string): Identifier {
  return {
    identifier: address.toLowerCase(),
    identifierKind: IdentifierKind.Ethereum,
  };
}

/**
 * Get signer info from window.ethereum (World App, MetaMask, etc.)
 * Returns the address and a proper XMTP v7 Signer with signMessage function
 */
export async function getXMTPSigner(): Promise<{ address: string; signer: Signer } | null> {
  if (typeof window === 'undefined') return null;
  
  const ethereum = (window as any).ethereum;
  if (!ethereum) {
    throw new Error('No wallet found. Please install World App, MetaMask, or another Ethereum wallet.');
  }

  // Check if any accounts are available
  const accounts = await ethereum.request({ method: 'eth_accounts' });
  let address = accounts[0];
  
  if (!address) {
    // Request accounts (this will prompt the user to connect)
    const requestedAccounts = await ethereum.request({ method: 'eth_requestAccounts' });
    if (requestedAccounts.length === 0) {
      throw new Error('No accounts found. Please connect your wallet.');
    }
    address = requestedAccounts[0];
  }

  // Create a proper XMTP v7 signer with the signMessage function
  // This wraps the wallet's personal_sign method
  const signer: Signer = {
    type: 'EOA',
    getIdentifier: async () => {
      const identifier = addressToIdentifier(address);
      console.log('[XMTP] getIdentifier returned:', identifier);
      return identifier;
    },
    signMessage: async (message: string) => {
      try {
        // Convert message to hex for personal_sign
        const messageBytes = new TextEncoder().encode(message);
        const messageHex = '0x' + Array.from(messageBytes).map(b => b.toString(16).padStart(2, '0')).join('');
        
        console.log('[XMTP] Requesting signature from wallet for message:', message.substring(0, 50));
        
        // Request signature from wallet
        const signature = await ethereum.request({
          method: 'personal_sign',
          params: [messageHex, address],
        });
        
        console.log('[XMTP] Signature received:', signature ? 'yes' : 'no');
        
        if (!signature) {
          throw new Error('Wallet returned empty signature');
        }
        
        // Convert hex signature to Uint8Array
        const signatureHex = signature as string;
        const signatureBytes = new Uint8Array(signatureHex.length / 2);
        for (let i = 0; i < signatureBytes.length; i++) {
          signatureBytes[i] = parseInt(signatureHex.substr(2 + i * 2, 2), 16);
        }
        return signatureBytes;
      } catch (signError) {
        console.error('[XMTP] Sign error:', signError);
        throw signError;
      }
    },
  };
  
  return { address, signer };
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use getXMTPSigner instead
 */
export async function getSignerFromWindow(): Promise<Signer | null> {
  const xmtpSigner = await getXMTPSigner();
  return xmtpSigner?.signer ?? null;
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
 * Create an XMTP client using the v7 browser-sdk API
 * @param signer - An XMTP Signer from getXMTPSigner()
 * @param env - XMTP environment (defaults to production for V3)
 */
export async function createXMTPClient(
  signer: Signer,
  _env: 'dev' | 'production' = 'production'
): Promise<import('@xmtp/browser-sdk').Client> {
  // Get Client dynamically to avoid WASM issues during SSR
  const ClientClass = await getClient();
  
  // Create client - v7 SDK uses 'production' env by default for V3 network
  const client = await ClientClass.create(signer);
  
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