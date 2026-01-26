# TruCheq - Future Roadmap & TODOs

## Base Support Integration
The application is multi-chain ready but needs final deployment on Base Sepolia.

- [ ] **Fund Deployer Wallet:** Fund `0xc7F9a40209C612d2F9dE09Ba68870dc1586033E3` with Base Sepolia ETH.
- [ ] **Deploy Registry:** Run `bun x hardhat run scripts/deploy.js --network baseSepolia`.
- [ ] **Update Frontend Map:** Replace the `0x000...` placeholder for Base Sepolia (Chain ID `84532`) in `REGISTRIES` map within:
    - `src/components/DealCreator.tsx`
    - `src/components/DealGate.tsx`
- [ ] **Base Gasless Flow:** Integrate Base Smart Wallet / Paymaster capabilities if a gasless flow similar to Cronos is desired for Base.

## Technical Debt
- [ ] **Backend Dispatcher:** Extend `/api/settle` to handle other EIP-3009 tokens if expanded.
- [ ] **Indexing:** Implement a subgraph or backend event listener to track settlement status for the Dashboard.
