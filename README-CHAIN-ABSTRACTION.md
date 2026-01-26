# Chain Abstraction Architecture for TruCheq

This document explains the multi-chain payment architecture using the Strategy Pattern to support multiple blockchain networks without creating spaghetti code.

## Architecture Overview

TruCheq uses a **Payment Adapter Layer** that abstracts the underlying blockchain implementation. The user experience remains consistent (Click → Pay → Unlock) regardless of which network is used.

```
┌─────────────────────────────────────────────────────────────┐
│                    User Experience Layer                     │
│              (UnifiedDealGate Component)                     │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Payment Adapter Layer                       │
│              (usePaymentExecutor Hook)                       │
└───────────────────────────┬─────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
                ▼                       ▼
┌───────────────────────┐   ┌───────────────────────┐
│   Cronos Strategy     │   │    Base Strategy      │
│   (EIP-3009)          │   │   (EIP-4337)          │
└───────────┬───────────┘   └───────────┬───────────┘
            │                           │
            ▼                           ▼
┌───────────────────────┐   ┌───────────────────────┐
│  Cronos Facilitator   │   │  Base Paymaster       │
│  (x402 Protocol)      │   │  (Smart Wallets)      │
└───────────────────────┘   └───────────────────────┘
```

## Key Components

### 1. Payment Strategy Interface

**Location**: `src/types/payment.ts`

```typescript
interface PaymentStrategy {
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
```

### 2. Supported Chains

```typescript
enum SupportedChain {
  CronosTestnet = 338,
  Cronos = 25,
  BaseSepolia = 84532,
  Base = 8453,
}
```

### 3. Strategy Implementations

#### Cronos Strategy (`src/strategies/CronosStrategy.ts`)
- Uses **EIP-3009** (transferWithAuthorization)
- Gasless via Cronos x402 Facilitator
- Token-level authorization
- Backend-heavy (Facilitator handles settlement)

#### Base Strategy (`src/strategies/BaseStrategy.ts`)
- Uses **EIP-4337** (Account Abstraction)
- Gasless via Paymaster
- Account-level authorization
- Frontend-light (Smart Wallet handles logic)

### 4. Payment Executor Hook

**Location**: `src/hooks/usePaymentExecutor.ts`

```typescript
const { 
  executePayment,        // Execute payment on current chain
  currentStrategy,       // Active strategy for connected chain
  isSupported,          // Whether current chain is supported
  chainId               // Current chain ID
} = usePaymentExecutor();
```

### 5. Unified Deal Gate

**Location**: `src/components/UnifiedDealGate.tsx`

Single component that:
- Detects deal's required chain from metadata
- Prompts user to switch if on wrong network
- Uses appropriate payment strategy automatically
- Displays chain-specific payment UI

## Payment Flow

### Cronos Flow (Current)

```
1. User Opens Deal
   ↓
2. Metadata shows chainId: 338 (Cronos Testnet)
   ↓
3. usePaymentExecutor selects CronosStrategy
   ↓
4. User clicks "Pay X USDC.e"
   ↓
5. CronosStrategy.execute():
   - Generate EIP-3009 signature
   - Send to /api/settle/cronos
   ↓
6. Backend verifies with Facilitator
   ↓
7. Backend settles payment on-chain
   ↓
8. Secret content unlocked
```

### Base Flow (Future)

```
1. User Opens Deal
   ↓
2. Metadata shows chainId: 84532 (Base Sepolia)
   ↓
3. usePaymentExecutor selects BaseStrategy
   ↓
4. User clicks "Pay X USDC"
   ↓
5. BaseStrategy.execute():
   - Use Smart Wallet
   - Send transaction with Paymaster
   ↓
6. Backend verifies transaction
   ↓
7. Secret content unlocked
```

## Metadata Structure

Deals now include `chainId` to specify which network they're on:

```json
{
  "itemName": "Rolex Watch",
  "description": "Vintage 1970s Rolex",
  "price": "500",
  "images": ["ipfs://..."],
  "secret": "https://secret-link.com",
  "seller": "0x123...",
  "createdAt": 1737745200000,
  "chainId": 338
}
```

## API Route Structure

```
src/app/api/settle/
├── cronos/
│   └── route.ts       # Cronos-specific settlement
└── base/
    └── route.ts       # Base-specific settlement (stub)
```

Each route handles chain-specific verification and settlement logic.

## Adding a New Chain

To add support for a new blockchain:

### 1. Add Chain Configuration

```typescript
// src/types/payment.ts
export enum SupportedChain {
  // ... existing chains
  NewChain = 12345,
}

export const CHAIN_CONFIGS: Record<SupportedChain, ChainConfig> = {
  // ... existing configs
  [SupportedChain.NewChain]: {
    chainId: SupportedChain.NewChain,
    name: 'New Chain',
    rpcUrl: 'https://rpc.newchain.com',
    explorerUrl: 'https://explorer.newchain.com',
    nativeCurrency: {
      name: 'New Token',
      symbol: 'NEW',
      decimals: 18,
    },
    usdcContract: '0x...',
    registryContract: '0x...',
  },
};
```

### 2. Create Strategy

```typescript
// src/strategies/NewChainStrategy.ts
export class NewChainStrategy implements PaymentStrategy {
  canHandle(chainId: number): boolean {
    return chainId === 12345;
  }

  getDisplayName(): string {
    return 'New Chain Payment';
  }

  getTokenSymbol(): string {
    return 'USDC';
  }

  async execute(...): Promise<PaymentResult> {
    // Implement chain-specific payment logic
  }
}
```

### 3. Register Strategy

```typescript
// src/hooks/usePaymentExecutor.ts
import { NewChainStrategy } from '@/strategies/NewChainStrategy';

const strategies: PaymentStrategy[] = [
  new CronosStrategy(),
  new BaseStrategy(),
  new NewChainStrategy(), // Add here
];
```

### 4. Create API Route

```typescript
// src/app/api/settle/newchain/route.ts
export async function POST(request: NextRequest) {
  // Implement settlement verification
}
```

### 5. Deploy Registry Contract

Deploy `TruCheqRegistry.sol` to the new chain and update the config.

## Benefits of This Architecture

✅ **No Spaghetti Code**: Each chain's logic is isolated in its own strategy  
✅ **Easy to Extend**: Adding new chains doesn't require modifying existing code  
✅ **Consistent UX**: Same user experience across all chains  
✅ **Type Safe**: TypeScript ensures correct implementation  
✅ **Testable**: Each strategy can be tested independently  
✅ **Maintainable**: Clear separation of concerns  

## Comparison: Cronos vs Base

| Feature | Cronos x402 | Base (Future) |
|---------|-------------|---------------|
| **Method** | EIP-3009 (Token Level) | EIP-4337 (Account Level) |
| **How** | User signs permission slip | User uses Smart Wallet |
| **Backend** | Heavy (Facilitator) | Light (Paymaster) |
| **Gas** | Facilitator pays | Paymaster sponsors |
| **Token** | USDC.e | USDC |
| **Standard** | x402 Protocol | Account Abstraction |

## Migration Path

Current users on Cronos can continue using the platform without any changes. New users can choose their preferred network when creating deals.

### For Sellers:
1. Connect wallet to desired network
2. Create deal (chainId automatically captured)
3. Share link (network info embedded in metadata)

### For Buyers:
1. Open deal link
2. If on wrong network, prompted to switch
3. Pay using network-specific method
4. Content unlocked

## Testing

### Test on Cronos Testnet:
```bash
# 1. Switch to Cronos Testnet (Chain ID: 338)
# 2. Get test tokens from faucet
# 3. Create a deal
# 4. Verify chainId: 338 in metadata
# 5. Pay with USDC.e
```

### Test on Base Sepolia (When Implemented):
```bash
# 1. Switch to Base Sepolia (Chain ID: 84532)
# 2. Get test tokens
# 3. Create a deal
# 4. Verify chainId: 84532 in metadata
# 5. Pay with Smart Wallet
```

## Future Enhancements

- [ ] Support for more chains (Polygon, Arbitrum, Optimism)
- [ ] Cross-chain deals (pay on any chain, settle on another)
- [ ] Multi-token support (USDT, DAI, etc.)
- [ ] Automatic chain switching prompts
- [ ] Chain-specific fee optimization
- [ ] Batch payments across chains

## Resources

- **Cronos x402**: https://docs.cronos.org/cronos-x402-facilitator
- **Base Docs**: https://docs.base.org/
- **EIP-3009**: https://eips.ethereum.org/EIPS/eip-3009
- **EIP-4337**: https://eips.ethereum.org/EIPS/eip-4337
- **Strategy Pattern**: https://refactoring.guru/design-patterns/strategy
