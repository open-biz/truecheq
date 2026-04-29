# TruCheq — Project Knowledge

## What is this?
TruCheq is a headless Web3 P2P commerce protocol for social platforms (Reddit, Discord, Twitter). Sellers verify identity via World ID, create IPFS-hosted listings, share links, and buyers chat via XMTP and pay via Coinbase x402 on Base. No database — all state lives on IPFS.

**Hackathon:** World Chain × XMTP × Coinbase (deadline March 29, 2025)

## Tech Stack
- **Framework:** Next.js 16, React 19, TypeScript
- **Package Manager:** bun
- **Styling:** Tailwind CSS v4, shadcn/ui, Framer Motion
- **Wallet:** wagmi + viem (injected connector — MetaMask, Coinbase Wallet, etc.)
- **Identity:** World ID (IDKit) — `@worldcoin/idkit`
- **Messaging:** XMTP — encrypted buyer↔seller chat
- **Payments:** Coinbase x402 (`x402-next`, `@coinbase/x402`) on Base Sepolia
- **Storage:** Filebase (IPFS) for metadata & images

## Commands
```bash
bun install          # Install dependencies
bun dev              # Dev server (Next.js)
bun build            # Production build
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
- `src/proxy.ts` — x402 payment proxy (protects /pay/* routes)

## Key Components
- `WorldIDAuth` — World ID sign-in/sign-up with IDKit (Orb & Device)
- `DealCreator` — Create listing form → IPFS upload
- `DealDashboard` — Seller's listing management (view)
- `DealGate` — Buyer-facing listing page with verification badge, x402 payment, XMTP chat
- `XMTPChat` — Embedded XMTP chat
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

## Environment Variables
```
NEXT_PUBLIC_WLD_APP_ID       # World ID app ID (from developer.worldcoin.org)
NEXT_PUBLIC_APP_ID           # World ID app ID (same as WLD_APP_ID, used by IDKit + MiniKitProvider)
NEXT_PUBLIC_RP_ID            # World ID RP ID (from developer.worldcoin.org)
WORLD_PRIVATE_KEY            # World ID 4.0 private key (RP signing)
RP_SIGNING_KEY               # World ID 4.0 private key (same as WORLD_PRIVATE_KEY, used by rp-signature API)
NEXT_PUBLIC_X402_PAY_TO      # Wallet address to receive x402 payments
NEXT_PUBLIC_XMTP_ENV                 # XMTP environment: 'dev' (default) or 'production'
NEXT_PUBLIC_SITE_URL                   # Public site URL for OG metadata (e.g. https://trucheq.com)
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
