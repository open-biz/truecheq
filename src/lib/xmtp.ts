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
 * Defaults to 'production' (mainnet) for production deployment.
 * Set NEXT_PUBLIC_XMTP_ENV=dev for local development/testing.
 */
export function getXMTPEnv(): 'dev' | 'production' {
  const env = process.env.NEXT_PUBLIC_XMTP_ENV;
  if (env === 'dev') return 'dev';
  return 'production';
}