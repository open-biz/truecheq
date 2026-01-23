import { http } from 'wagmi';
import { defineChain } from 'viem';

export const cronosTestnet = defineChain({
  id: 338,
  name: 'Cronos Testnet',
  nativeCurrency: { name: 'TCRO', symbol: 'TCRO', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://evm-t3.cronos.org'] },
  },
  blockExplorers: {
    default: { name: 'Cronos Explorer', url: 'https://explorer.cronos.org/testnet' },
  },
  testnet: true,
});
