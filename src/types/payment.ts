import type { DealMetadata } from '@/lib/filebase';

export enum SupportedChain {
  CronosTestnet = 338,
  Cronos = 25,
  BaseSepolia = 84532,
  Base = 8453,
}

export interface PaymentResult {
  success: boolean;
  txHash?: string;
  secret?: string;
  metadata?: DealMetadata;
  error?: string;
  payment?: {
    txHash: string;
    from: string;
    to: string;
    value: string;
    blockNumber: number;
    timestamp: number;
  };
}

export interface PaymentStrategy {
  canHandle(chainId: number): boolean;
  execute(
    dealId: number,
    metadata: DealMetadata,
    metadataUrl: string,
    userAddress: string
  ): Promise<PaymentResult>;
  getDisplayName(): string;
  getTokenSymbol(): string;
}

export interface ChainConfig {
  chainId: SupportedChain;
  name: string;
  rpcUrl: string;
  explorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  usdcContract?: string;
  registryContract?: string;
}

export const CHAIN_CONFIGS: Record<SupportedChain, ChainConfig> = {
  [SupportedChain.CronosTestnet]: {
    chainId: SupportedChain.CronosTestnet,
    name: 'Cronos Testnet',
    rpcUrl: 'https://evm-t3.cronos.org',
    explorerUrl: 'https://explorer.cronos.org/testnet',
    nativeCurrency: {
      name: 'Test Cronos',
      symbol: 'TCRO',
      decimals: 18,
    },
    usdcContract: '0xc01efAaF7C5C61bEbFAeb358E1161b537b8bC0e0',
    registryContract: '0x5216905cc7b7fF4738982837030921A22176c8C7',
  },
  [SupportedChain.Cronos]: {
    chainId: SupportedChain.Cronos,
    name: 'Cronos',
    rpcUrl: 'https://evm.cronos.org',
    explorerUrl: 'https://explorer.cronos.org',
    nativeCurrency: {
      name: 'Cronos',
      symbol: 'CRO',
      decimals: 18,
    },
    usdcContract: '0xc21223249CA28397B4B6541dfFaEcC539BfF0c59',
    registryContract: undefined, // Deploy when ready for mainnet
  },
  [SupportedChain.BaseSepolia]: {
    chainId: SupportedChain.BaseSepolia,
    name: 'Base Sepolia',
    rpcUrl: 'https://sepolia.base.org',
    explorerUrl: 'https://sepolia.basescan.org',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    usdcContract: undefined, // Add when implementing Base
    registryContract: undefined, // Deploy when implementing Base
  },
  [SupportedChain.Base]: {
    chainId: SupportedChain.Base,
    name: 'Base',
    rpcUrl: 'https://mainnet.base.org',
    explorerUrl: 'https://basescan.org',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    usdcContract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    registryContract: undefined, // Deploy when implementing Base
  },
};

export function getChainConfig(chainId: number): ChainConfig | undefined {
  return CHAIN_CONFIGS[chainId as SupportedChain];
}

export function isSupportedChain(chainId: number): chainId is SupportedChain {
  return chainId in CHAIN_CONFIGS;
}
