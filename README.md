# 🛡️ TruCheq: Headless Web3 Commerce Protocol

**Built for the World Chain × XMTP × Coinbase Hackathon**

---

## 🧭 Overview

TruCheq is a **sybil-resistant P2P commerce protocol** for social platforms like Reddit, Discord, and Twitter. It turns any chat thread into a verifiable storefront — no marketplace, no database, no middlemen.

It combines three hackathon primitives into one seamless flow:

- **World ID (IDKit)** — Seller identity verification. Orb-verified = trusted human. Device-verified = basic trust.
- **XMTP** — End-to-end encrypted buyer↔seller chat embedded directly on listing pages.
- **Coinbase x402** — Payment settlement on Base.
- **Smart Contract on Base Sepolia** — On-chain listing registry. No database needed.

---

## ⚙️ How It Works

1. **Verify** — Seller signs in with World ID → receives an Orb or Device verification badge.
2. **List** — Seller creates a listing → images & metadata upload to IPFS (Filebase), listing registers on-chain.
3. **Share** — A unique link is generated → seller posts it on Reddit / Discord / Twitter.
4. **Browse** — Buyer clicks the link → sees the listing with the seller's verification status and trust level.
5. **Chat** — Buyer negotiates with the seller's AI agent via XMTP (encrypted).
6. **Pay** — Payment settles via Coinbase x402 on Base.

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15, React 19, TypeScript |
| Identity | World ID (IDKit) — Orb & Device verification |
| Messaging | XMTP — encrypted buyer↔seller chat |
| Payments | Coinbase x402 protocol on Base |
| On-chain State | Base Sepolia (Chain ID `84532`) |
| Storage | Filebase (IPFS) for metadata & images |
| Wallet | RainbowKit + wagmi + viem |
| UI | Tailwind CSS, shadcn/ui, Framer Motion |

---

## 📜 Smart Contract

- **Network:** Base Sepolia (Chain ID `84532`)
- **Contract:** `TruCheqRegistry.sol`
- **Stores:** `Listing` struct with:
  - `sellerWallet` — seller's wallet address
  - `metadataURI` — IPFS link to listing metadata
  - `priceUSDC` — listing price
  - `isOrbVerified` — stamped from World ID orb verification
  - `isActive` — listing status

```solidity
struct Listing {
    address sellerWallet;
    string  metadataURI;
    uint256 priceUSDC;
    bool    isOrbVerified;
    bool    isActive;
}
```

---

## 🚀 Getting Started

```bash
# Install dependencies
bun install

# Run development server
bun dev
```

---

## 🔑 Environment Variables

Create a `.env.local` file in the project root:

```env
# World ID
NEXT_PUBLIC_WLD_APP_ID=app_staging_...

# Smart Contract (Base Sepolia)
NEXT_PUBLIC_REGISTRY_ADDRESS=0x...

# Coinbase x402 — wallet to receive payments
NEXT_PUBLIC_X402_PAY_TO=0x...

# Filebase (IPFS)
FILEBASE_ACCESS_KEY=your_access_key
FILEBASE_SECRET_KEY=your_secret_key
NEXT_PUBLIC_FILEBASE_BUCKET=trucheq
NEXT_PUBLIC_FILEBASE_GATEWAY=your_gateway.myfilebase.com
```

---

## ✅ Hackathon Qualification

| Track | Integration | Status |
|---|---|---|
| **World ID** | IDKit — Orb & Device seller verification | ✅ |
| **XMTP** | Encrypted buyer↔seller chat on listing pages | ✅ |
| **Coinbase x402** | Payment settlement on Base | ✅ |

---

## 📐 Architecture

```
Seller                              Buyer / Agent
  │                                   │
  ├─ World ID verify ──────────┐      │
  ├─ Upload to IPFS (Filebase) │      │
  ├─ Register on-chain ────────┤      │
  │                             ▼      │
  │                      TruCheq Link  │
  │                             │      │
  │                             ├──────┤
  │                             │  View listing + trust badge
  │                             │  Chat via XMTP
  │                             │  Pay via x402 paywall (human)
  │                             │  Pay via x402 API (agent)
  │                             ▼
  └──────────── Settlement on Base ────┘
```

---

<p align="center"><b>TruCheq</b> — Trust in a link.</p>
