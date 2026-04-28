/**
 * TruCheq Payment Helpers
 *
 * Dual-mode payment system:
 * - Mini App: MiniKit.pay() for native World App payments
 * - Standalone: XMTP walletSendCalls transaction messages
 */

import { MiniKit } from '@worldcoin/minikit-js';
import { parseUnits, type Hex } from 'viem';

// USDC on World Chain Mainnet
export const USDC_WORLD = '0x79A02482A880bCE3F13e09Da970dC34db4CD24d1' as `0x${string}`;

// USDC on Base Mainnet
export const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`;

export interface PayParams {
  amount: string;      // Human-readable, e.g. "50"
  recipient: string;   // Seller address
  token?: string;      // Token address (defaults to USDC on World Chain)
}

/**
 * Check if we can use native MiniKit.pay (inside World App)
 */
export function canUseMiniKitPay(): boolean {
  return typeof window !== 'undefined' && MiniKit.isInstalled();
}

/**
 * Pay via MiniKit.pay() — native World App payment
 * Supports WLD and all local stablecoins.
 */
export async function payWithMiniKit(params: PayParams): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const result = await MiniKit.pay({
      tokens: [{ symbol: 'USDC' }],
      amount: parseFloat(params.amount),
      recipient: params.recipient,
    } as any);

    // Result shape: { executedWith: 'minikit', data: { status: 'success', transaction_id: '...' } }
    const data = (result as any).data;
    if (data?.status === 'success') {
      return { success: true, txHash: data.transaction_id };
    }

    return { success: false, error: data?.status || 'Payment failed' };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Payment failed' };
  }
}

/**
 * Build an XMTP walletSendCalls transaction request for standalone browser payments
 */
export function buildXMTPTransactionRequest(
  from: string,
  to: string,
  amount: string,
  tokenAddress: string = USDC_WORLD,
  chainId: string = '480',
): object {
  const amountUnits = parseUnits(amount, 6).toString(); // USDC has 6 decimals

  return {
    version: '1.0',
    chainId,
    from,
    calls: [
      {
        to: tokenAddress,
        data: encodeTransfer(to, amountUnits),
        metadata: {
          description: `Send ${amount} USDC to ${to.slice(0, 6)}...${to.slice(-4)}`,
          transactionType: 'transfer',
          currency: 'USDC',
          amount: amountUnits,
          decimals: 6,
          toAddress: to,
        },
      },
    ],
  };
}

/**
 * Encode ERC20 transfer call data
 */
function encodeTransfer(to: string, amount: string): string {
  // ERC20 transfer(address,uint256) selector: 0xa9059cbb
  const selector = 'a9059cbb';
  // Pad address to 32 bytes
  const paddedTo = to.toLowerCase().replace('0x', '').padStart(64, '0');
  // Pad amount to 32 bytes
  const paddedAmount = BigInt(amount).toString(16).padStart(64, '0');

  return `0x${selector}${paddedTo}${paddedAmount}` as Hex;
}
