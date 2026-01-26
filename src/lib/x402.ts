export const CRONOS_TESTNET_USDCE = '0xc01efAaF7C5C61bEbFAeb358E1161b537b8bC0e0';
export const CRONOS_MAINNET_USDCE = '0xc21223249CA28397B4B6541dfFaEcC539BfF0c59';

export const FACILITATOR_URL = 'https://facilitator.cronoslabs.org/v2/x402';

export interface PaymentRequirements {
  scheme: 'exact';
  network: 'cronos-testnet' | 'cronos';
  payTo: string;
  asset: string;
  description: string;
  mimeType: string;
  maxAmountRequired: string;
  maxTimeoutSeconds: number;
}

export interface X402Response {
  error: string;
  x402Version: number;
  paymentRequirements: PaymentRequirements;
}

export interface PaymentSettled {
  success: true;
  secret: string;
  metadata: any;
  payment: {
    txHash: string;
    from: string;
    to: string;
    value: string;
    blockNumber: number;
    timestamp: number;
  };
}

export function getUSDCContract(network: 'cronos-testnet' | 'cronos' = 'cronos-testnet'): string {
  return network === 'cronos-testnet' ? CRONOS_TESTNET_USDCE : CRONOS_MAINNET_USDCE;
}

export function formatUSDCAmount(cro: string): string {
  const amount = parseFloat(cro);
  return Math.floor(amount * 1000000).toString();
}

export function parseUSDCAmount(usdc: string): string {
  const amount = parseInt(usdc);
  return (amount / 1000000).toFixed(2);
}
