# Cronos x402 Facilitator Integration for TruCheq

This document explains the integration of the Cronos x402 Facilitator for gasless stablecoin payments using the HTTP 402 Payment Required protocol.

## What is x402?

The x402 protocol is a standard for HTTP-based micropayments that uses the HTTP 402 status code (Payment Required). The Cronos x402 Facilitator provides:

- **Gasless Payments**: Users pay with USDC.e without needing CRO for gas fees
- **EIP-3009**: Uses `transferWithAuthorization` for signature-based token transfers
- **Stateless API**: No database required, fully managed infrastructure
- **Production-Ready**: Battle-tested with rate limiting and error handling

## Architecture

```
┌─────────────────┐
│   DealGateX402  │  ← User requests content
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  GET /api/deal/ │  ← Returns 402 if no payment
│     [id]/x402   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Facilitator    │  ← User signs payment authorization
│  Client SDK     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  GET /api/deal/ │  ← Retry with X-PAYMENT header
│  [id]/x402      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Facilitator    │  ← Verify payment signature
│  /verify        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Facilitator    │  ← Settle payment on-chain
│  /settle        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Return Secret  │  ← 200 OK with content
│  Content        │
└─────────────────┘
```

## Setup Instructions

### 1. Environment Variables

Add to your `.env.local`:

```bash
# x402 Configuration
NEXT_PUBLIC_SELLER_WALLET=0xYourWalletAddress
NEXT_PUBLIC_CRONOS_NETWORK=cronos-testnet  # or 'cronos' for mainnet
NEXT_PUBLIC_FILEBASE_GATEWAY=parallel-pink-stork.myfilebase.com

# Filebase (already configured)
FILEBASE_ACCESS_KEY=your_key
FILEBASE_SECRET_KEY=your_secret
NEXT_PUBLIC_FILEBASE_BUCKET=trucheq
```

### 2. Get Test USDC.e Tokens

For testing on Cronos Testnet:

1. Get TCRO from faucet: https://cronos.org/faucet
2. Get devUSDC.e from faucet: https://faucet.cronos.org
3. USDC.e Contract (Testnet): `0xc01efAaF7C5C61bEbFAeb358E1161b537b8bC0e0`

### 3. Install Dependencies

Already installed:
- `@crypto.com/facilitator-client` - Official SDK for x402 payments
- `@aws-sdk/client-s3` - For Filebase/IPFS storage

## Payment Flow

### Step 1: User Requests Content

```typescript
// User opens deal page
GET /deal/0?meta=https://trucheq.s3.filebase.com/metadata/...
```

### Step 2: API Returns 402 Payment Required

```typescript
// No X-PAYMENT header present
GET /api/deal/0/x402?meta=...

Response: 402
{
  "error": "Payment Required",
  "x402Version": 1,
  "paymentRequirements": {
    "scheme": "exact",
    "network": "cronos-testnet",
    "payTo": "0xSeller...",
    "asset": "0xUSDCE...",
    "description": "TruCheq Deal #0 - Rolex Watch",
    "maxAmountRequired": "500000000",  // 500 USDC.e
    "maxTimeoutSeconds": 300
  }
}
```

### Step 3: User Signs Payment Authorization

```typescript
const client = new FacilitatorClient({
  facilitatorUrl: 'https://facilitator.cronoslabs.org/v2/x402',
  network: 'cronos-testnet',
});

const paymentHeader = await client.createPaymentHeader({
  from: userAddress,
  to: sellerAddress,
  value: '500000000',  // 500 USDC.e (6 decimals)
  asset: USDCE_CONTRACT,
  validAfter: 0,
  validBefore: Math.floor(Date.now() / 1000) + 300,
});
```

### Step 4: Retry with Payment Header

```typescript
GET /api/deal/0/x402?meta=...
Headers: {
  'X-PAYMENT': 'eyJ4NDAyVmVyc2lvbiI6MS4uLn0='
}
```

### Step 5: API Verifies Payment

```typescript
// Server-side verification
POST https://facilitator.cronoslabs.org/v2/x402/verify
{
  "x402Version": 1,
  "paymentHeader": "eyJ4NDAyVmVyc2lvbiI6MS4uLn0=",
  "paymentRequirements": { ... }
}

Response:
{
  "isValid": true,
  "invalidReason": null
}
```

### Step 6: API Settles Payment

```typescript
// Server-side settlement
POST https://facilitator.cronoslabs.org/v2/x402/settle
{
  "x402Version": 1,
  "paymentHeader": "eyJ4NDAyVmVyc2lvbiI6MS4uLn0=",
  "paymentRequirements": { ... }
}

Response:
{
  "event": "payment.settled",
  "txHash": "0x123...",
  "from": "0xBuyer...",
  "to": "0xSeller...",
  "value": "500000000",
  "blockNumber": 12345,
  "timestamp": 1737745200
}
```

### Step 7: Return Secret Content

```typescript
Response: 200 OK
{
  "success": true,
  "secret": "https://meet.google.com/secret-link",
  "metadata": { ... },
  "payment": {
    "txHash": "0x123...",
    "from": "0xBuyer...",
    "to": "0xSeller...",
    "value": "500000000",
    "blockNumber": 12345,
    "timestamp": 1737745200
  }
}
```

## Key Components

### 1. DealGateX402 Component

**Location**: `src/components/DealGateX402.tsx`

New x402-enabled deal gate that:
- Uses Facilitator Client SDK for payment authorization
- Displays USDC.e pricing instead of CRO
- Shows payment status and transaction hash
- Unlocks secret content after payment settlement

### 2. x402 API Route

**Location**: `src/app/api/deal/[id]/x402/route.ts`

Handles the HTTP 402 payment flow:
- Returns 402 with payment requirements if no X-PAYMENT header
- Verifies payment with Facilitator
- Settles payment on-chain
- Returns secret content on successful payment

### 3. x402 Utilities

**Location**: `src/lib/x402.ts`

Helper functions and constants:
- USDC.e contract addresses (testnet/mainnet)
- Payment requirement types
- Amount formatting utilities

## Differences from Original Flow

### Before (Native CRO):
```
User → Connect Wallet → Pledge CRO → Wait for TX → Release Funds
```

### After (x402 USDC.e):
```
User → Connect Wallet → Sign Authorization → Instant Settlement → Content Unlocked
```

## Benefits

✅ **Gasless**: No CRO needed for gas fees  
✅ **Instant**: Payment settled in one transaction  
✅ **Stablecoin**: USDC.e pricing (no volatility)  
✅ **Standard**: HTTP 402 protocol compatible  
✅ **Secure**: EIP-3009 signature verification  
✅ **Simple**: No smart contract interaction needed  

## Testing

### 1. Create a Deal

```bash
# Use DealCreator to create a deal
# Upload images and metadata to IPFS
# Get the share link with metadata URL
```

### 2. Open Deal Page

```bash
# Open the deal link in browser
https://trucheq.xyz/deal/0?meta=https://trucheq.s3.filebase.com/metadata/...
```

### 3. Make Payment

```bash
# Click "Pay X USDC.e" button
# Sign the payment authorization in your wallet
# Wait for settlement (usually < 5 seconds)
# Secret content is revealed
```

## Network Constants

### Cronos Testnet
- Network ID: `cronos-testnet`
- USDC.e Contract: `0xc01efAaF7C5C61bEbFAeb358E1161b537b8bC0e0`
- Explorer: https://explorer.cronos.org/testnet
- Faucet: https://faucet.cronos.org

### Cronos Mainnet
- Network ID: `cronos`
- USDC.e Contract: `0xc21223249CA28397B4B6541dfFaEcC539BfF0c59`
- Explorer: https://explorer.cronos.org
- Bridge: https://cronos.org/bridge

## Troubleshooting

### "Payment verification failed"
- Check that you have enough USDC.e balance
- Verify the payment amount matches the deal price
- Ensure you're on the correct network (testnet vs mainnet)

### "Invalid signature"
- Make sure you're signing with the correct wallet
- Check that the signature hasn't expired (5 minute window)
- Verify the nonce hasn't been used before

### "Settlement failed"
- Check Facilitator status: https://facilitator.cronoslabs.org/healthcheck
- Verify network connectivity
- Check Cronos network status

## Resources

- **Facilitator API**: https://facilitator.cronoslabs.org/v2/x402
- **Documentation**: https://docs.cronos.org/cronos-x402-facilitator
- **SDK Source**: https://github.com/crypto-com/facilitator-client-ts
- **Examples**: https://github.com/cronos-labs/x402-examples
- **Discord**: https://discord.com/channels/783264383978569728/1442807140103487610

## Migration Path

To switch between native CRO and x402 USDC.e:

1. **Use DealGate** for native CRO escrow (existing)
2. **Use DealGateX402** for x402 USDC.e payments (new)
3. Update deal page to choose component based on payment type
4. Both can coexist in the same application

## Future Enhancements

- [ ] Support for multiple stablecoins (USDT, DAI)
- [ ] Recurring payments / subscriptions
- [ ] Batch payments for multiple deals
- [ ] AI agent integration for automated payments
- [ ] Mainnet deployment
