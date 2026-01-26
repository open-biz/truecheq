import type { PaymentStrategy, PaymentResult, SupportedChain } from '@/types/payment';
import type { DealMetadata } from '@/lib/filebase';
import { Facilitator, CronosNetwork, Contract } from '@crypto.com/facilitator-client';
import { BrowserProvider } from 'ethers';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export class CronosStrategy implements PaymentStrategy {
  private facilitatorUrl = 'https://facilitator.cronoslabs.org/v2/x402';
  private supportedChains = [338, 25]; // Cronos Testnet, Cronos Mainnet

  canHandle(chainId: number): boolean {
    return this.supportedChains.includes(chainId);
  }

  getDisplayName(): string {
    return 'Cronos x402 (Gasless USDC.e)';
  }

  getTokenSymbol(): string {
    return 'USDC.e';
  }

  async execute(
    dealId: number,
    metadata: DealMetadata,
    metadataUrl: string,
    userAddress: string
  ): Promise<PaymentResult> {
    try {
      const isTestnet = metadata.chainId === 338;
      const client = new Facilitator({
        network: isTestnet ? CronosNetwork.CronosTestnet : CronosNetwork.CronosMainnet,
      });

      const priceInUSDC = Math.floor(parseFloat(metadata.price) * 1000000);

      if (!window.ethereum) {
        return {
          success: false,
          error: 'No wallet detected',
        };
      }

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const paymentHeader = await client.generatePaymentHeader({
        to: metadata.seller,
        value: priceInUSDC.toString(),
        asset: Contract.USDCe,
        signer,
        validAfter: 0,
        validBefore: Math.floor(Date.now() / 1000) + 300,
      });

      const apiUrl = `/api/settle/cronos?dealId=${dealId}&meta=${encodeURIComponent(metadataUrl)}`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentHeader,
          chainId: metadata.chainId,
        }),
      });

      if (response.status === 402) {
        const data = await response.json();
        return {
          success: false,
          error: data.error || 'Payment required',
        };
      }

      if (!response.ok) {
        throw new Error('Payment failed');
      }

      const result = await response.json();

      if (result.success) {
        return {
          success: true,
          txHash: result.payment.txHash,
          secret: result.secret,
          metadata: result.metadata,
          payment: result.payment,
        };
      }

      return {
        success: false,
        error: 'Payment settlement failed',
      };
    } catch (error: any) {
      console.error('Cronos payment error:', error);
      return {
        success: false,
        error: error.message || 'Payment failed',
      };
    }
  }
}
