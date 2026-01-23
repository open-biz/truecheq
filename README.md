# 🚀 TruCheq: The x402 Settlement Layer for Social Commerce

## 🏆 Hackathon Tracks

- **Main Track:** x402 Applications (Social Commerce).
- **Ecosystem Integration:** Crypto.com DeFi Wallet + Native CRO Utility.

## 1. Project Overview (The Pitch)

TruCheQ is "eBay in a link" for the Cronos ecosystem.

**The Missing "Buy Button" for Reddit and Social Commerce**

TruCheq is a P2P settlement protocol that uses HTTP 402 (Payment Required) logic to secure transactions using Native CRO. We utilize the low fees and speed of the Cronos EVM to create an escrow-lite experience that replaces Venmo.

Today, billions of dollars in P2P trade happen on Reddit, Discord, and Telegram, but settlement is broken. Users are forced to choose between blind trust (sending funds and hoping the seller ships) or high-friction middlemen. TruCheq solves this by unbundling the marketplace checkout. We provide a decentralized "Buy Now" button that turns any chat thread into a secure point-of-sale.

Built on the x402 (Payment Required) protocol, TruCheq creates an atomic bond between Identity and Funds. When a buyer clicks a TruCheq link, they encounter an x402 Gate. The deal details and seller identity are cryptographically locked until the buyer pledges CRO or USDC into a smart contract on Cronos. This solves the "Mexican Standoff" of P2P trading: Sellers see funds are secured before they ship, and Buyers know their money is safe until they release it.

## The "Trust Anchor" Strategy

We use the Crypto.com DeFi Wallet as the primary Trust Anchor. TruCheq gives every Crypto.com Wallet user the power to become a merchant instantly. We turn the wallet from a passive storage device into an active merchant terminal.

## 🛠 Tech Stack

- **Network:** Cronos EVM (Testnet: 338, Mainnet: 25).
- **Asset:** Native CRO.
- **Middleware:** Node.js x402 Gateway.
- **Contract:** Solidity payable Escrow.

## 7. Developer Cheat Sheet (Native CRO Edition)

### 1. The "Payable" Logic:

Your Solidity code is much simpler now.

```solidity
// Example Pledge Function
function pledge(uint256 dealId) external payable {
    Deal storage deal = deals[dealId];
    require(deal.state == State.Created, "Deal not active");
    require(msg.value == deal.price, "Incorrect CRO amount");
    
    deal.state = State.Locked;
    emit FundsLocked(dealId, msg.value);
}
```

### 2. The Release Logic:

```solidity
function release(uint256 dealId) external {
    Deal storage deal = deals[dealId];
    require(msg.sender == deal.buyer, "Only buyer can release");
    require(deal.state == State.Locked, "No funds to release");
    
    deal.state = State.Released;
    payable(deal.seller).transfer(deal.price); // Instant CRO transfer
}
```
