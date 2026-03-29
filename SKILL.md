name: TruCheq
description: Headless Web3 P2P commerce protocol - World ID verification, XMTP chat, Coinbase x402 payments on Base

# TruCheq - Web3 P2P Commerce Protocol

A headless Web3 P2P commerce protocol for social platforms (Reddit, Discord, Twitter). Sellers verify identity via World ID, create IPFS-hosted listings, share links, and buyers chat via XMTP and pay via Coinbase x402 on Base. No database — all state lives on IPFS.

## Tech Stack

- **Framework:** Next.js 16, React 19, TypeScript
- **Package Manager:** bun
- **Styling:** Tailwind CSS v4, shadcn/ui, Framer Motion
- **Wallet:** RainbowKit + wagmi + viem
- **Identity:** World ID (IDKit) — `@worldcoin/idkit`
- **Messaging:** XMTP V3 — encrypted buyer↔seller chat via `@xmtp/browser-sdk`
- **Payments:** Coinbase x402 (`x402-next`, `@coinbase/x402`) on Base Sepolia
- **Storage:** Filebase (IPFS) for metadata & images
- **Agent:** `@xmtp/agent-sdk` for AI seller agent

## Commands

```bash
bun install          # Install dependencies
bun dev              # Dev server (Next.js)
bun build            # Production build
bun run agent        # Start XMTP AI agent
bun lint             # ESLint
```

## Key Directories

- `src/app/` — Next.js App Router pages & API routes
- `src/app/api/deal/[id]/` — Listing API (read from IPFS)
- `src/app/api/deal/[id]/x402/` — x402 payment-gated API endpoint (for agents)
- `src/app/api/verify/` — World ID proof verification
- `src/app/api/rp-signature/` — World ID RP signature generation
- `src/app/api/upload/` — IPFS upload via Filebase
- `src/app/pay/[id]/` — x402 paywall-protected payment confirmation page
- `src/components/` — React components
- `src/components/ui/` — shadcn/ui primitives
- `src/lib/` — Utilities (chains, filebase, wagmi config, utils)
- `src/lib/xmtp-agent.ts` — XMTP AI agent for seller
- `src/proxy.ts` — x402 payment proxy (protects /pay/* routes)

## Key Components

- `WorldIDAuth` — World ID sign-in/sign-up with IDKit (Orb & Device)
- `WorldIDOnboarding` — Initial World ID setup flow
- `DealCreator` — Create listing form → IPFS upload
- `DealDashboard` — Seller's listing management (view)
- `DealGate` — Buyer-facing listing page with verification badge, x402 payment, XMTP chat
- `XMTPChat` — Embedded XMTP V3 chat using `@xmtp/browser-sdk`
- `XMTPChat` requires wallet connection before rendering (use `useAccount` to check)
- `LandingPage` — Marketing page with features, demo, use cases

## Path Aliases

- `@/*` maps to `./src/*` (tsconfig paths)

## Important Conventions

- App Router (not Pages Router) — layouts in `layout.tsx`, pages in `page.tsx`
- Components use `'use client'` directive where needed
- UI components from shadcn/ui in `src/components/ui/`
- Tailwind v4 with `@tailwindcss/postcss` plugin
- React Compiler enabled (`reactCompiler: true` in next.config.ts)
- Environment variables in `.env.local` (not committed)

## XMTP Integration

### Frontend (Browser SDK)

The frontend uses `@xmtp/browser-sdk` for V3:

```typescript
import { Client } from '@xmtp/browser-sdk';
import { useWalletClient, useAccount } from 'wagmi';

// Create signer from wagmi walletClient (avoid ethers BrowserProvider)
const eoaSigner = {
  type: 'EOA' as const,
  getIdentifier: async () => ({
    identifierKind: 1,
    identifier: walletAddress.toLowerCase()
  } as any),
  signMessage: async (message: string): Promise<Uint8Array> => {
    const sig = await walletClient.signMessage({ message });
    const sigHex = sig.slice(2);
    return new Uint8Array(sigHex.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []);
  }
};

const client = await Client.create(eoaSigner, { env: 'dev' });
```

### Agent (Agent SDK)

The seller agent uses `@xmtp/agent-sdk`:

```typescript
import { Agent, createSigner, createUser } from '@xmtp/agent-sdk';

const user = createUser(privateKey);
const signer = createSigner(user);
const agent = await Agent.create(signer, { env: 'dev' });

agent.on('text', async (ctx) => {
  await ctx.sendTextReply('Response');
});

await agent.start();
```

## Environment Variables

```
NEXT_PUBLIC_WLD_APP_ID       # World ID app ID (from developer.worldcoin.org)
WORLD_PRIVATE_KEY            # World ID RP signing key
NEXT_PUBLIC_X402_PAY_TO      # Wallet address to receive x402 payments
NEXT_PUBLIC_XMTP_ENV         # XMTP environment: 'dev' (default) or 'production'
XMTP_WALLET_KEY              # Private key for XMTP agent
XMTP_DB_ENCRYPTION_KEY       # Encryption key for agent database
FILEBASE_ACCESS_KEY          # Filebase IPFS access
FILEBASE_SECRET_KEY          # Filebase IPFS secret
NEXT_PUBLIC_FILEBASE_BUCKET  # Filebase bucket name
NEXT_PUBLIC_FILEBASE_GATEWAY # Filebase gateway URL
```

## x402 Payment Integration

- **Page paywall:** `src/proxy.ts` protects `/pay/*` routes with x402 payment requirement
- **Agent API:** `src/app/api/deal/[id]/x402/route.ts` uses `withX402` for programmatic agent purchases
- **Testnet:** Uses default x402.org facilitator (no CDP credentials needed for base-sepolia)
- **Mainnet:** Requires `CDP_API_KEY_ID` and `CDP_API_KEY_SECRET` with `@coinbase/x402` facilitator

## Common Tasks

### Adding a new UI component
1. Use existing shadcn/ui components from `src/components/ui/`
2. Follow the naming and structure conventions
3. Use Tailwind for styling

### Creating a new API route
1. Add route file in `src/app/api/[endpoint]/route.ts`
2. Use standard Next.js App Router conventions
3. Handle errors gracefully

### Testing XMTP chat
1. Ensure wallet is connected (XMTPChat only renders when `isConnected`)
2. Check browser console for `[XMTP V3]` logs
3. Agent must be running: `bun run agent`

### Fixing XMTP connection issues
1. Check that wallet is connected first
2. Verify agent is running with `ps aux | grep agent`
3. Check agent logs for errors
4. Ensure both use same XMTP network (dev vs production)
5. Clear old XMTP databases: `rm -f xmtp-dev-*.db3*`