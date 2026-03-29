# TruCheq — Project Knowledge

## What is this?
TruCheq is a headless Web3 P2P commerce protocol for social platforms (Reddit, Discord, Twitter). Sellers verify identity via World ID, create on-chain listings, share links, and buyers chat via XMTP and pay via Coinbase x402 on Base. No database — all state lives on-chain + IPFS.

**Hackathon:** World Chain × XMTP × Coinbase (deadline March 29, 2025)

## Tech Stack
- **Framework:** Next.js 16, React 19, TypeScript
- **Package Manager:** bun
- **Styling:** Tailwind CSS v4, shadcn/ui, Framer Motion
- **Wallet:** RainbowKit + wagmi + viem
- **Identity:** World ID (IDKit) — `@worldcoin/idkit`
- **Messaging:** XMTP — encrypted buyer↔seller chat
- **Payments:** Coinbase x402 (`x402-next`, `@coinbase/x402`) on Base Sepolia
- **On-chain:** Base Sepolia (chain ID `84532`), Solidity 0.8.19
- **Storage:** Filebase (IPFS) for metadata & images
- **Smart Contract tooling:** Hardhat

## Commands
```bash
bun install          # Install dependencies
bun dev              # Dev server (Next.js)
bun build            # Production build
bun lint             # ESLint
bun x hardhat run scripts/deploy.js --network baseSepolia  # Deploy contract
```

## Key Directories
- `src/app/` — Next.js App Router pages & API routes
- `src/app/api/deal/[id]/` — Listing API (read from chain)
- `src/app/api/deal/[id]/x402/` — x402 payment-gated API endpoint (for agents)
- `src/app/api/verify/` — World ID proof verification
- `src/app/api/upload/` — IPFS upload via Filebase
- `src/app/pay/[id]/` — x402 paywall-protected payment confirmation page
- `src/components/` — React components
- `src/components/ui/` — shadcn/ui primitives
- `src/contracts/` — Solidity contracts (Hardhat sources dir)
- `src/lib/` — Utilities (chains, filebase, wagmi config, utils)
- `src/middleware.ts` — x402 payment middleware (protects /pay/* routes)
- `scripts/` — Hardhat deploy script

## Key Components
- `WorldIDAuth` — World ID sign-in/sign-up with IDKit (Orb & Device)
- `DealCreator` — Create listing form → IPFS upload → on-chain registration
- `DealDashboard` — Seller's listing management (view, cancel)
- `DealGate` — Buyer-facing listing page with verification badge, x402 payment, XMTP chat
- `XMTPChat` — Embedded XMTP chat (currently simulated for demo)
- `LandingPage` — Marketing page with features, demo, use cases

## Path Aliases
- `@/*` maps to `./src/*` (tsconfig paths)

## Important Conventions
- App Router (not Pages Router) — layouts in `layout.tsx`, pages in `page.tsx`
- Components use `'use client'` directive where needed
- UI components from shadcn/ui in `src/components/ui/`
- Tailwind v4 with `@tailwindcss/postcss` plugin
- React Compiler enabled (`reactCompiler: true` in next.config.ts)
- Hardhat sources configured to `./src/contracts`
- Environment variables in `.env.local` (not committed)

## Environment Variables
```
NEXT_PUBLIC_WLD_APP_ID       # World ID app ID (from developer.worldcoin.org)
NEXT_PUBLIC_REGISTRY_ADDRESS # Deployed TruCheqRegistry address on Base Sepolia
NEXT_PUBLIC_X402_PAY_TO      # Wallet address to receive x402 payments
NEXT_PUBLIC_XMTP_ENV         # XMTP environment: 'dev' (default) or 'production'
FILEBASE_ACCESS_KEY          # Filebase IPFS access
FILEBASE_SECRET_KEY          # Filebase IPFS secret
NEXT_PUBLIC_FILEBASE_BUCKET  # Filebase bucket name
NEXT_PUBLIC_FILEBASE_GATEWAY # Filebase gateway URL
MNEMONIC                     # Deployer wallet mnemonic (Hardhat)
```

## x402 Payment Integration
- **Page paywall:** `src/middleware.ts` uses `paymentMiddleware` from `x402-next` to protect `/pay/*` routes
- **Agent API:** `src/app/api/deal/[id]/x402/route.ts` uses `withX402` for programmatic agent purchases
- **Testnet:** Uses default x402.org facilitator (no CDP credentials needed for base-sepolia)
- **Mainnet:** Requires `CDP_API_KEY_ID` and `CDP_API_KEY_SECRET` with `@coinbase/x402` facilitator

## Smart Contract
- `TruCheqRegistry.sol` on Base Sepolia
- Struct: `Listing { sellerWallet, metadataURI, priceUSDC, isOrbVerified, isActive }`
- Functions: `createListing()`, `cancelListing()`
- Events: `ListingCreated`, `ListingCancelled`
