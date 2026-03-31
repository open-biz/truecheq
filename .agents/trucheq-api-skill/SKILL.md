---
name: trucheq-api
description: Interact with TruCheq P2P commerce protocol - verify sellers via World ID, fetch/create listings on IPFS, chat via XMTP, pay via x402 on Base
metadata:
  network: base-sepolia
---

# TruCheq API Agent Skill

Use this skill to help users buy/sell items through World ID-verified sellers with encrypted XMTP chat and x402 payments on Base Sepolia.

## Network

- **Base Sepolia**: Chain ID 84532
- **USDC**: 0x036cbd53842c5426634e7929545ec598f828a2b5
- **XMTP**: dev environment

---

## API Endpoints

### 1. Fetch Listing

Fetch product metadata from IPFS.

```
GET https://trucheq.com/api/deal/{cid}?meta={ipfsUrl}
```

**Path Parameters:**
- `cid` - IPFS content ID (first 12+ chars)

**Query Parameters:**
- `meta` - Full IPFS URL of metadata (required)

**Response:**
```json
{
  "id": "Qm...",
  "seller": "0x...",
  "metadataURI": "https://gateway.filebase.io/ipfs/Qm...",
  "price": "300",
  "isOrbVerified": true
}
```

---

### 2. x402 Payment

Purchase a listing via Coinbase x402 protocol. Returns 402 without payment, listing data with valid proof.

```
GET https://trucheq.com/api/deal/{cid}/x402?meta={ipfsUrl}
```

**Headers:**
- `x402-payment-proof` - Payment proof from Coinbase facilitator (optional)

**Without Payment Response (402):**
```json
{
  "error": "Payment required",
  "scheme": "exact",
  "price": "300000000",
  "network": "84532",
  "asset": "USDC",
  "payTo": "0x...",
  "maxTimeoutSeconds": 300,
  "description": "TruCheq listing: ItemName - 300 USDC"
}
```

**Header Format for Payment:**
```
WWW-Authenticate: x402 scheme=exact, network=eip155:84532, amount=$300000000, asset=USDC, payTo=0x...
```

**With Payment Response:**
```json
{
  "success": true,
  "paidVia": "x402",
  "listingId": "Qm...",
  "seller": "0x...",
  "metadataURI": "https://gateway.filebase.io/ipfs/Qm...",
  "price": "300",
  "isOrbVerified": true,
  "settledAt": 1734567890000
}
```

---

### 3. Upload to IPFS

Upload images or listing metadata to IPFS via Filebase.

```
POST https://trucheq.com/api/upload
Content-Type: multipart/form-data
```

**Upload Image:**
```
type=image
file={binary image file}
```

**Response:**
```json
{
  "url": "https://gateway.filebase.io/ipfs/Qm...",
  "fileName": "images/uuid.jpg",
  "cid": "Qm..."
}
```

**Upload Metadata:**
```
type=metadata
metadata={
  "itemName": "string",
  "description": "string",
  "price": "string",
  "seller": "0x...",
  "createdAt": 1734567890,
  "isOrbVerified": true,
  "images": ["ipfs://Qm...", ...]
}
```

**Response:**
```json
{
  "url": "https://gateway.filebase.io/ipfs/Qm...",
  "fileName": "metadata/1734567890-0xabcd.json",
  "cid": "Qm..."
}
```

---

### 4. World ID Verification

Verify a user's World ID proof. TruCheq supports 4 trust levels:

- **orb** - Highest trust, verified via World ID Orb (biometric)
- **secureDocument** - Government ID verification via World Coin ID
- **document** - Basic document verification
- **device** - Lowest trust, device-based verification

```
POST https://trucheq.com/api/verify
Content-Type: application/json
```

**Request:**
```json
{
  "devPortalPayload": {
    "nullifier_hash": "0x...",
    "proof": "0x...",
    "verification_level": "orb"
  }
}
```

**verification_level**: `"orb"`, `"secureDocument"`, `"document"`, or `"device"`

**Response:**
```json
{
  "success": true,
  "nullifier_hash": "0x...",
  "is_verified": true,
  "verification_level": "orb"
}
```

**Listing Trust Display:**
- `isOrbVerified: true` - Seller is orb verified (highest trust)
- For other levels, check listing metadata `verificationLevel` field

---

### 5. World ID RP Signature

Generate signature context for World ID widget initialization.

```
POST https://trucheq.com/api/rp-signature
Content-Type: application/json
```

**Request:**
```json
{
  "action": "trucheq_auth",
  "ttl": 3600
}
```

- `action` - Action ID (default: "trucheq_auth")
- `ttl` - Time-to-live in seconds (default: 3600)

**Response:**
```json
{
  "sig": "0x...",
  "nonce": "...",
  "created_at": 1734567890,
  "expires_at": 1734571490
}
```

---

### 6. XMTP Messaging

XMTP (Extensible Message Transport Protocol) enables encrypted buyer-seller chat.

**Two ways to use XMTP:**

#### A. Server-side API (for seller agent)
```
POST https://trucheq.com/api/xmtp
Content-Type: application/json
```

**Send Message:**
```json
{
  "action": "send",
  "buyerAddress": "0x...",
  "message": "Hi, I'm interested in your listing!"
}
```

**Response:**
```json
{
  "success": true,
  "conversationId": "..."
}
```

**List Conversations:**
```json
{
  "action": "list-conversations"
}
```

**Response:**
```json
{
  "conversations": [
    { "id": "...", "peerAddress": "0x..." }
  ]
}
```

**Get Messages:**
```json
{
  "action": "messages",
  "conversationId": "..."
}
```

**Response:**
```json
{
  "messages": [
    {
      "id": "...",
      "content": "Hello!",
      "senderAddress": "0x...",
      "sentAt": "2024-12-01T12:00:00.000Z"
    }
  ]
}
```

**Check XMTP Status:**
```
GET https://trucheq.com/api/xmtp
```

**Response:**
```json
{
  "address": "0x...",
  "status": "connected"
}
```

#### B. Client-side (for buyers using frontend)

Buyers can use the XMTP browser SDK directly:

```typescript
import { Client } from '@xmtp/browser-sdk';
import { useWalletClient } from 'wagmi';

// Get walletClient from wagmi
const { data: walletClient } = useWalletClient();

// Create XMTP signer from wagmi walletClient
const xmtpSigner = {
  type: 'EOA' as const,
  getIdentifier: async () => ({
    identifierKind: 1, // IDENTIFIER_KIND_ETHEREUM
    identifier: walletClient.account.address.toLowerCase()
  }),
  signMessage: async (message: string): Promise<Uint8Array> => {
    const sig = await walletClient.signMessage({ message });
    const hex = sig.slice(2); // Remove "0x" prefix
    return new Uint8Array(hex.match(/.{2}/g)?.map(byte => parseInt(byte, 16)) || []);
  }
};

// Create XMTP client
const client = await Client.create(xmtpSigner, { env: 'dev' });

// Open conversation with seller (from listing metadata)
const sellerAddress = listing.seller;
const conversation = await client.conversations.newConversation(sellerAddress);

// Send message
await conversation.sendText("Hi, is this still available?");

// Listen for messages
const messages = await conversation.messages();
for (const msg of messages) {
  console.log(msg.senderAddress, msg.content);
}
```

**Requirements:**
- Wallet connected (for signing)
- Base Sepolia network (chain 84532)
- Seller address from listing metadata
- Use `env: 'dev'` for testnet

---

## Usage Flows

### Buy Item Flow
1. Get listing URL from seller (format: `/deal/{cid}?meta={ipfsUrl}`)
2. Fetch listing: `GET /api/deal/{cid}?meta={ipfsUrl}`
3. Check `isOrbVerified` for seller trust
4. Open XMTP chat: `POST /api/xmtp` with action "send"
5. Pay via x402: `GET /api/deal/{cid}/x402?meta={ipfsUrl}` with payment proof

### Create Listing Flow (Seller)
1. Upload images: `POST /api/upload` with type=image
2. Create metadata JSON with itemName, description, price, seller address, images
3. Upload metadata: `POST /api/upload` with type=metadata
4. Share listing URL: `{baseUrl}/deal/{cid.slice(0,12)}?meta={metadataUrl}`

### Verify Seller Flow
1. Get listing to find seller address
2. Request seller to provide World ID proof
3. Verify: `POST /api/verify` with seller's devPortalPayload

---

## Key Data Structures

**Listing Metadata (IPFS):**
```json
{
  "itemName": "Apple Watch Ultra",
  "description": "Like new, comes with box",
  "price": "300",
  "seller": "0xabc123...",
  "createdAt": 1734567890,
  "isOrbVerified": true,
  "verificationLevel": "orb", // "orb", "secureDocument", "document", or "device"
  "images": ["ipfs://Qm...", "ipfs://Qm..."]
}
```

**Trust Levels:**
- `isOrbVerified: true` + `verificationLevel: "orb"` = Highest trust
- `verificationLevel: "secureDocument"` = Government ID verified
- `verificationLevel: "document"` = Basic document verified
- `verificationLevel: "device"` = Device-based (lowest trust)

**Listing URL Format:**
```
{baseUrl}/deal/{cid.slice(0,12)}?meta={metadataUrl}
Example: https://trucheq.com/deal/QmXyZ123abc?meta=https://gateway.filebase.io/ipfs/QmXyZ123abc...
```

---

## Errors

- **400** - Missing required parameters
- **402** - Payment required (x402 endpoint)
- **404** - Resource not found
- **500** - Server error

---

## Notes

- All state stored on IPFS (no database)
- Payments go directly to seller (no escrow)
- Seller address from listing metadata used for XMTP
- XMTP environment is "dev" (Base Sepolia testnet)
- XMTP send requires server configured with XMTP_SELLER_PRIVATE_KEY (returns 503 if not configured)