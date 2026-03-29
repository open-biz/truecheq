# TruCheq — World Chain × XMTP × Coinbase Hackathon TODO

## ✅ Completed
- [x] World ID (IDKit) — Orb & Device verification with backend proof check
- [x] World ID v4 — RP signature generation + v4 verify endpoint
- [x] IPFS-only listings — No gas fees for sellers
- [x] Listing creation flow — IPFS metadata upload (Filebase)
- [x] Seller dashboard — View listings
- [x] Buyer listing page — View details from IPFS, verification badge, price
- [x] XMTP chat component — Encrypted buyer↔seller chat UI
- [x] Coinbase x402 — Payment-gated API endpoint + paywall proxy
- [x] Landing page — Full marketing page
- [x] Marketplace page — with search/filter (listings via direct links)
- [x] Removed all contract/hardhat dependencies — pure IPFS architecture

## Deployment
- [x] Set `NEXT_PUBLIC_WLD_APP_ID` in `.env.local` (from World ID dashboard)
- [x] Set `WORLD_PRIVATE_KEY` in `.env.local` (RP signing key)
- [x] Set `NEXT_PUBLIC_X402_PAY_TO` to your wallet address in `.env.local`
- [x] Filebase (IPFS) already configured
- [ ] Run `bun dev` and test the flow
- [ ] Deploy to Vercel

## Future: Adding Escrow
See README.md for options:
- Option 1: Smart Contract Escrow
- Option 2: x402 Escrow Hold
- Option 3: Third-Party Escrow
- Option 4: Reputation-Based (currently implemented)

## XMTP
- [x] Real XMTP SDK integration with wagmi signer bridge
- [ ] Build XMTP agent bot that auto-responds on behalf of sellers (future)
- [ ] Generate x402 payment links from XMTP chat (future)

## Polish
- [ ] End-to-end demo flow for hackathon video
- [ ] Test payment flow with x402
