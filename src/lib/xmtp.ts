/**
 * XMTP Configuration
 * 
 * For buyer-seller chat, use the XMTP Agent SDK (src/lib/xmtp-agent.ts)
 * The agent runs as a server-side process and automatically responds to buyers.
 * 
 * Environment variables needed for agent:
 * - XMTP_WALLET_KEY: Seller's private key
 * - XMTP_DB_ENCRYPTION_KEY: 32-byte encryption key
 * - NEXT_PUBLIC_XMTP_ENV: 'dev' or 'production'
 */

/**
 * Get XMTP environment from env
 * Defaults to 'dev' (testnet) for development/testing
 */
export function getXMTPEnv(): 'dev' | 'production' {
  const env = process.env.NEXT_PUBLIC_XMTP_ENV;
  // Default to 'dev' for testing, can be overridden to 'production'
  if (env === 'production') return 'production';
  return 'dev';
}