import { useMemo } from 'react';
import type { PaymentStrategy, PaymentResult } from '@/types/payment';
import type { DealMetadata } from '@/lib/filebase';
import { CronosStrategy } from '@/strategies/CronosStrategy';
import { BaseStrategy } from '@/strategies/BaseStrategy';
import { useChainId } from 'wagmi';

const strategies: PaymentStrategy[] = [
  new CronosStrategy(),
  new BaseStrategy(),
];

export function usePaymentExecutor() {
  const chainId = useChainId();

  const currentStrategy = useMemo(() => {
    return strategies.find(strategy => strategy.canHandle(chainId));
  }, [chainId]);

  const executePayment = async (
    dealId: number,
    metadata: DealMetadata,
    metadataUrl: string,
    userAddress: string
  ): Promise<PaymentResult> => {
    if (!currentStrategy) {
      return {
        success: false,
        error: `Unsupported network (Chain ID: ${chainId}). Please switch to Cronos Testnet or Base Sepolia.`,
      };
    }

    return currentStrategy.execute(dealId, metadata, metadataUrl, userAddress);
  };

  const getAvailableStrategies = (): PaymentStrategy[] => {
    return strategies;
  };

  const getStrategyForChain = (targetChainId: number): PaymentStrategy | undefined => {
    return strategies.find(strategy => strategy.canHandle(targetChainId));
  };

  return {
    executePayment,
    currentStrategy,
    getAvailableStrategies,
    getStrategyForChain,
    isSupported: !!currentStrategy,
    chainId,
  };
}
