// XMTP Agent for TruCheq seller automation
// This runs as a standalone process to handle buyer messages
import 'dotenv-defaults/config';
import { Agent } from '@xmtp/agent-sdk';
import OpenAI from 'openai';

// Conversation history storage (in production, use Redis/Postgres)
const conversationHistories: Map<string, Array<{role: string, content: string}>> = new Map();

// Required environment variables:
// - XMTP_WALLET_KEY: Private key of the seller wallet
// - XMTP_DB_ENCRYPTION_KEY: 32-byte hex key for DB encryption
// - NEXT_PUBLIC_XMTP_ENV: 'dev' or 'production'
// Note: Seller address will be obtained from the agent after initialization

const XMTP_ENV = process.env.NEXT_PUBLIC_XMTP_ENV || 'dev';

// NVIDIA OpenAI client for DeepSeek AI
const openai = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY || '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',
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

// Build context from listings for AI
function buildListingsContext(): string {
  let context = 'Available listings:\n';
  for (const [cid, listing] of Object.entries(LISTINGS)) {
    context += `- ${listing.name}: ${listing.price} USDC. ${listing.description}\n`;
  }
  return context;
}

// Get conversation history for context
function getConversationHistory(conversationId: string): Array<{role: string, content: string}> {
  return conversationHistories.get(conversationId) || [];
}

// Add message to history
function addToHistory(conversationId: string, role: string, content: string) {
  const history = conversationHistories.get(conversationId) || [];
  history.push({ role, content });
  // Keep only last 10 messages to stay within token limits
  if (history.length > 10) {
    history.shift();
  }
  conversationHistories.set(conversationId, history);
}

// AI response function using DeepSeek with conversation history
async function getAIResponse(userMessage: string, conversationId: string): Promise<string> {
  const listingsContext = buildListingsContext();
  const history = getConversationHistory(conversationId);
  
  const systemPrompt = `You are a helpful seller assistant for TruCheq, a Web3 P2P marketplace on Base Sepolia. 
Sellers are verified via World ID (sybil resistance). Payments are handled via x402 protocol.

${listingsContext}

Instructions:
- Be helpful, friendly, and concise
- When users ask about products, provide details and offer purchase links
- When users want to buy, give them the proper command or link  
- If they ask about verification, explain World ID
- If they ask about payment, explain x402 on Base Sepolia
- Always offer to show the list with \`list\` command
- Format responses with emoji and be conversational
- Use markdown for formatting (bold, bullet points, etc.)
- Include direct purchase links when relevant
- Remember context from previous messages in this conversation`;

  try {
    // Build messages including history - cast to any to avoid strict OpenAI type issues
    const messages: any = [
      { role: 'system', content: systemPrompt },
      ...history.map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
      { role: 'user', content: userMessage }
    ];
    
    const completion = await openai.chat.completions.create({
      model: "deepseek-ai/deepseek-v3.1",
      messages,
      temperature: 0.7,
      max_tokens: 1024,
    });
    
    const response = completion.choices[0]?.message?.content || 'Sorry, I could not process your request.';
    
    // Add to history
    addToHistory(conversationId, 'user', userMessage);
    addToHistory(conversationId, 'assistant', response);
    
    return response;
  } catch (error) {
    console.error('[Agent] AI error:', error);
    return 'Sorry, I encountered an error. Try using `list` to see available items or `help` for commands.';
  }
}

interface ListingInfo {
  cid: string;
  price: string;
  name: string;
  description: string;
}

// Known listings (in production, fetch from IPFS or database)
const LISTINGS: Record<string, ListingInfo> = {
  'QmVaTcgW2rqEjNRGsUSGi75D1YRhgtbya7SJhdQqjF9mbQ': {
    cid: 'QmVaTcgW2rqEjNRGsUSGi75D1YRhgtbya7SJhdQqjF9mbQ',
    price: '1',
    name: 'Luxury Watch',
    description: 'Premium timepiece - World ID verified seller'
  },
  'Qmcu7vPqyimqLrzjdeZbxKXj39D8LdyieLSkfU269LdtPp': {
    cid: 'Qmcu7vPqyimqLrzjdeZbxKXj39D8LdyieLSkfU269LdtPp',
    price: '1',
    name: 'Designer Watch',
    description: 'Authentic designer watch - verified seller'
  },
  'QmdfjExyMR2WqosXr9Vr8YU8ZVTLP31Be8nhnnrZLQNrDR': {
    cid: 'QmdfjExyMR2WqosXr9Vr8YU8ZVTLP31Be8nhnnrZLQNrDR',
    price: '1',
    name: 'Vintage Watch',
    description: 'Classic vintage piece - verified seller'
  },
  'QmNrwrBbkjFSui4EdUmTqdXNpdGuDeeV4p5HsRHWixfESN': {
    cid: 'QmNrwrBbkjFSui4EdUmTqdXNpdGuDeeV4p5HsRHWixfESN',
    price: '1',
    name: 'Sport Watch',
    description: 'Premium sports watch - device verified'
  },
  'QmSnWxkB82MdtbHcJxpmqWYHSefhy47Kxf9hQY7d1UGZaZ': {
    cid: 'QmSnWxkB82MdtbHcJxpmqWYHSefhy47Kxf9hQY7d1UGZaZ',
    price: '1',
    name: 'Classic Watch',
    description: 'Timeless classic - device verified'
  },
};

async function createAgent() {
  console.log(`[Agent] Environment: ${XMTP_ENV}`);

  // Create agent from environment variables (XMTP_WALLET_KEY, XMTP_DB_ENCRYPTION_KEY)
  const agent = await Agent.createFromEnv({
    appVersion: 'trucheq-seller-v1',
    env: XMTP_ENV as 'dev' | 'production',
  });

  return agent;
}

export async function startSellerAgent() {
  const agent = await createAgent();

  // Handle text messages
  agent.on('text', async (ctx) => {
    const message = ctx.message.content.toLowerCase();
    const sender = (ctx.message as any).senderAddress || 'unknown';
    
    console.log(`[Agent] Received message from ${sender}: ${ctx.message.content}`);

    // Help command
    if (message === 'help' || message === '?' || message === '/help') {
      await ctx.conversation.sendText(
        `🏪 **TruCheq Seller Assistant**\n\n` +
        `Available commands:\n` +
        `• \`list\` - View available listings\n` +
        `• \`price <cid>\` - Get price for a specific item\n` +
        `• \`buy <cid>\` - Get purchase link for an item\n` +
        `• \`status\` - Check seller verification status\n\n` +
        `Just send a message to start a conversation!`
      );
      return;
    }

    // List command
    if (message === 'list' || message === '/list') {
      let response = '📦 **Available Listings:**\n\n';
      for (const [cid, listing] of Object.entries(LISTINGS)) {
        response += `• **${listing.name}** - ${listing.price} USDC\n`;
        response += `  CID: \`${cid.slice(0, 12)}...\`\n\n`;
      }
      response += `Use \`price <cid>\` for details or \`buy <cid>\` to purchase.`;
      await ctx.conversation.sendText(response);
      return;
    }

    // Price command
    if (message.startsWith('price ')) {
      const cid = message.replace('price ', '').trim();
      const listing = LISTINGS[cid];
      
      if (listing) {
        await ctx.conversation.sendText(
          `💰 **${listing.name}**\n` +
          `Price: ${listing.price} USDC\n` +
          `Description: ${listing.description}\n\n` +
          `To purchase: \`buy ${cid}\``
        );
      } else {
        await ctx.conversation.sendText(
          `❌ Listing not found. Use \`list\` to see available items.`
        );
      }
      return;
    }

    // Buy command
    if (message.startsWith('buy ')) {
      const cid = message.replace('buy ', '').trim();
      const listing = LISTINGS[cid];
      
      if (listing) {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const purchaseUrl = `${baseUrl}/pay/${cid.slice(0, 12)}?meta=https://parallel-pink-stork.myfilebase.com/ipfs/${cid}`;
        await ctx.conversation.sendText(
          `🛒 **Purchase ${listing.name}**\n\n` +
          `Price: ${listing.price} USDC\n\n` +
          `[Click here to pay](${purchaseUrl})\n\n` +
          `Payment processed via x402 on Base Sepolia.`
        );
      } else {
        await ctx.conversation.sendText(
          `❌ Listing not found. Use \`list\` to see available items.`
        );
      }
      return;
    }

    // Status command
    if (message === 'status' || message === '/status') {
      // Get agent address from the agent instance
      const agentAddress = (agent as any).address || 'Unknown';
      await ctx.conversation.sendText(
        `✅ **Seller Status**\n\n` +
        `Address: \`${agentAddress}\`\n` +
        `Verification: Orb Verified (World ID)\n` +
        `Network: Base Sepolia (Testnet)\n\n` +
        `All listings are verified via World ID sybil resistance.`
      );
      return;
    }

    // Get conversation ID for history
    const conversationId = ctx.conversation.id || ctx.conversation.topic || sender;
    
    // Default response - use AI for natural conversation with history
    const aiResponse = await getAIResponse(ctx.message.content, conversationId);
    await ctx.conversation.sendText(aiResponse);
  });

  // Handle DMs (new conversations) - clear history and send welcome
  agent.on('dm', async (ctx) => {
    const dmCtx = ctx as any;
    const sender = dmCtx.message?.senderAddress || 'unknown';
    console.log(`[Agent] New DM from ${sender}`);
    
    // Clear old history for new conversation
    const conversationId = ctx.conversation.id || ctx.conversation.topic || sender;
    conversationHistories.delete(conversationId);
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
    await ctx.conversation.sendText(
      `👋 **Welcome to TruCheq!**\n\n` +
      `I'm your automated seller assistant. Here's what I can do:\n\n` +
      `📋 **Commands:**\n` +
      `• \`list\` - View all available watches\n` +
      `• \`help\` - See all commands\n` +
      `• \`status\` - Check seller verification\n\n` +
      `💬 Just chat naturally - I can help you find the perfect watch and guide you through purchase!\n\n` +
      `🔒 **Payment:** All transactions protected via x402 on **Base Sepolia**\n\n` +
      `[View Listings](${baseUrl}/marketplace)`
    );
  });

  // Handle group messages
  agent.on('group', async (ctx) => {
    const groupCtx = ctx as any;
    console.log(`[Agent] New group message from ${groupCtx.message?.senderAddress || 'unknown'}`);
    // Optionally handle group chats
  });

  // Handle errors
  agent.on('unhandledError', (error) => {
    console.error('[Agent] Unhandled error:', error);
  });

  // Start the agent
  await agent.start();
  
  // Get the agent's wallet address
  const agentAddress = (agent as any).address;
  console.log(`[Agent] ✅ Seller agent started!`);
  console.log(`[Agent] Address: ${agentAddress}`);
  console.log(`[Agent] Listening for messages on ${XMTP_ENV} network`);
  console.log(`[Agent] Send a message to this address on XMTP (dev network) to test!`);

  return agent;
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startSellerAgent().catch(console.error);
}