// Test script to send a message to the XMTP agent
import 'dotenv-defaults/config';
import { Client, IdentifierKind } from '@xmtp/browser-sdk';

const XMTP_ENV = process.env.NEXT_PUBLIC_XMTP_ENV || 'dev';

// Agent's wallet address — configurable via DEMO_SELLER_ADDRESS env var.
// Falls back to the known demo address for backwards compatibility.
const AGENT_ADDRESS =
  process.env.DEMO_SELLER_ADDRESS ||
  '0x8677e5831257e52a35d1463cfb414eda34344f4f';

// Test wallet - you'll need to set TEST_WALLET_KEY in your env
// Or use a wallet that's already connected in the browser
const TEST_PRIVATE_KEY = process.env.TEST_WALLET_KEY || process.env.XMTP_WALLET_KEY;

async function sendTestMessage() {
  if (!TEST_PRIVATE_KEY) {
    console.error('Please set TEST_WALLET_KEY or XMTP_WALLET_KEY in your environment');
    console.log('Alternatively, use xmtp.chat to send a message to:', AGENT_ADDRESS);
    return;
  }

  console.log(`[Test] Sending message to agent on ${XMTP_ENV} network...`);
  console.log(`[Test] Agent address: ${AGENT_ADDRESS}`);

  // Create a simple signer
  const privateKeyBytes = new Uint8Array(
    TEST_PRIVATE_KEY.slice(2).match(/.{2}/g)?.map(byte => parseInt(byte, 16)) || []
  );

  const { secp256k1 } = await import('@noble/curves/secp256k1');
  const { keccak_256 } = await import('@noble/hashes/sha3');

  const publicKey = secp256k1.getPublicKey(privateKeyBytes, false);
  const addressBytes = keccak_256(publicKey.slice(1)).slice(-20);
  const address = '0x' + Array.from(addressBytes, b => b.toString(16).padStart(2, '0')).join('');

  console.log(`[Test] Sender address: ${address}`);

  // Create signer
  const signer = {
    type: 'EOA' as const,
    getIdentifier: async () => ({
      identifier: address as `0x${string}`,
      identifierKind: IdentifierKind.Ethereum,
    }),
    signMessage: async (message: string): Promise<Uint8Array> => {
      const prefix = `\x19Ethereum Signed Message:\n${message.length}`;
      const hash = keccak_256(new TextEncoder().encode(prefix + message));
      const sig = secp256k1.sign(hash, privateKeyBytes);
      return new Uint8Array([...sig.toCompactRawBytes(), sig.recovery + 27]);
    },
  };

  // Create client
  console.log('[Test] Creating XMTP client...');
  const client = await Client.create(signer);

  console.log(`[Test] Client created, inboxId: ${client.inboxId}`);

  // Check if we can message the agent
  console.log('[Test] Checking if agent is reachable...');
  const canMessage = await Client.canMessage([{
    identifier: AGENT_ADDRESS as `0x${string}`,
    identifierKind: IdentifierKind.Ethereum,
  }]);
  
  const isReachable = canMessage.get(AGENT_ADDRESS.toLowerCase());
  console.log('[Test] Agent reachable:', isReachable);

  if (!isReachable) {
    console.error('[Test] Agent is not reachable on XMTP network');
    return;
  }

  // Create DM
  console.log('[Test] Creating DM with agent...');
  const dm = await client.conversations.createDm(AGENT_ADDRESS as `0x${string}`);
  
  // Send message
  console.log('[Test] Sending message: "hello there agent"');
  await dm.sendText('hello there agent');
  
  console.log('[Test] ✅ Message sent successfully!');
  console.log(`[Test] Check the agent logs to see if it responded.`);
}

sendTestMessage().catch(console.error);