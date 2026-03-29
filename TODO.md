# TruCheq — World Chain × XMTP × Coinbase Hackathon TODO

## ✅ Completed
- [x] World ID (IDKit) — Orb & Device verification with backend proof check
- [x] Smart Contract — `TruCheqRegistry.sol` for on-chain listings (Base Sepolia)
- [x] Listing creation flow — IPFS metadata upload + on-chain registration
- [x] Seller dashboard — View & cancel listings
- [x] Buyer listing page — View details, verification badge, price
- [x] XMTP chat component — Encrypted buyer↔seller chat UI
- [x] Coinbase x402 — Payment-gated API endpoint + paywall middleware
- [x] Landing page — Full marketing page with demo
- [x] Hardhat deploy script for Base Sepolia
- [x] Cleaned up old Cronos/Crypto.com references

## Deployment
- [ ] Fund deployer wallet with Base Sepolia ETH
- [ ] Deploy `TruCheqRegistry.sol`: `bun x hardhat run scripts/deploy.js --network baseSepolia`
- [ ] Set `NEXT_PUBLIC_REGISTRY_ADDRESS` in `.env.local`
- [ ] Register World ID app at developer.worldcoin.org → set `NEXT_PUBLIC_WLD_APP_ID`
- [ ] Set `NEXT_PUBLIC_X402_PAY_TO` to a valid receiving wallet address
- [ ] Deploy to Vercel

## XMTP
- [x] Added @xmtp/react-sdk package
- [x] Wire up real XMTP SDK for buyer↔seller encrypted chat - fixed wagmi v2 + ethers v6 signer incompatibility using BrowserProvider bridge
- [ ] Build XMTP agent bot (World AgentKit) that auto-responds on behalf of sellers
- [ ] Generate x402 payment links from within the XMTP chat flow

## New Features
- [x] Marketplace page at /marketplace with all active listings, search, filtering, grid/list views
- [x] WorldIDOnboarding component for new users explaining how to get verified (3-step guide)
- [x] Landing page navigation link to Marketplace

## Polish
- [ ] End-to-end demo flow for hackathon video (3 min)
- [ ] Add CDP API keys for mainnet x402 (optional for demo)
- [ ] Coinbase Onramp integration in x402 paywall (optional)

## Fixed
- [x] World ID v4 migration from IDKitWidget to useIDKitRequest hook
- [x] XMTP SDK package added (simulation kept due to signer incompatibility)
- [x] Fixed x402 route TypeScript error
- [x] Fixed middleware config for build
