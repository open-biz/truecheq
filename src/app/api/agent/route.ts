/**
 * TruCheq Agent API — Server-side agent with AgentKit + x402
 *
 * This endpoint receives webhooks about new XMTP messages and runs
 * the agent logic server-side. It demonstrates AgentKit integration:
 * - Agent registration in AgentBook (human-backed verification)
 * - x402-protected API access for negotiation strategies
 *
 * In production, this would be called by a cron job or XMTP webhook.
 */

import { NextRequest, NextResponse } from 'next/server';

// AgentKit types (conceptual — actual imports would be from @worldcoin/agentkit)
interface AgentBookEntry {
  address: string;
  humanId: string;
  nonce: number;
  verifiedAt: number;
}

interface AgentKitContext {
  agentBook: Map<string, AgentBookEntry>;
  storage: {
    getUsageCount: (endpoint: string, humanId: string) => Promise<number>;
    incrementUsage: (endpoint: string, humanId: string) => Promise<void>;
  };
}

// Simulated AgentBook (in production, queries World Chain contract)
const agentBook = new Map<string, AgentBookEntry>();

// Simulated x402-protected negotiation API
// In production, this calls an external service protected by @x402/hono middleware
async function getNegotiationStrategy(
  itemName: string,
  offerAmount: number,
  askingPrice: number,
  agentCtx: AgentKitContext,
  agentAddress: string,
): Promise<{ action: 'accept' | 'reject' | 'counter'; counterAmount?: number; reason: string }> {
  // AgentKit verification: check agent is registered in AgentBook
  const entry = agentCtx.agentBook.get(agentAddress.toLowerCase());
  if (!entry) {
    throw new Error('Agent not registered in AgentBook — cannot access negotiation APIs');
  }

  // x402 check: free-trial mode (3 uses), then require payment
  const usageKey = `negotiation-api:${entry.humanId}`;
  const usageCount = await agentCtx.storage.getUsageCount(usageKey, entry.humanId);

  if (usageCount >= 3) {
    // x402 payment required — agent must pay to continue accessing strategy API
    throw new Error(
      `x402 Payment Required: Agent has used ${usageCount} free negotiation strategies. ` +
      `Payment needed to continue.`,
    );
  }

  await agentCtx.storage.incrementUsage(usageKey, entry.humanId);

  // Simple rule-based strategy (would be AI/ML in production)
  if (offerAmount >= askingPrice) {
    return { action: 'accept', reason: 'Offer meets asking price' };
  }
  if (offerAmount >= askingPrice * 0.8) {
    return { action: 'counter', counterAmount: askingPrice * 0.9, reason: 'Counter at 90%' };
  }
  return { action: 'reject', reason: 'Offer too low' };
}

/**
 * POST /api/agent
 * Webhook-style endpoint for processing agent actions
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, agentAddress, payload } = body;

    if (!agentAddress) {
      return NextResponse.json({ error: 'agentAddress required' }, { status: 400 });
    }

    const ctx: AgentKitContext = {
      agentBook,
      storage: {
        getUsageCount: async () => 0, // Mock — would query real DB
        incrementUsage: async () => {}, // Mock
      },
    };

    switch (action) {
      case 'register': {
        // Register agent in AgentBook (called once during setup)
        const { humanId, nonce } = payload || {};
        agentBook.set(agentAddress.toLowerCase(), {
          address: agentAddress,
          humanId: humanId || 'anonymous',
          nonce: nonce || 0,
          verifiedAt: Date.now(),
        });
        return NextResponse.json({
          success: true,
          message: 'Agent registered in AgentBook',
          agentKit: {
            mode: 'free-trial',
            freeUsesRemaining: 3,
          },
        });
      }

      case 'negotiate': {
        // Access x402-protected negotiation strategy API
        const { itemName, offerAmount, askingPrice } = payload || {};
        const strategy = await getNegotiationStrategy(
          itemName,
          offerAmount,
          askingPrice,
          ctx,
          agentAddress,
        );
        return NextResponse.json({
          success: true,
          strategy,
          agentKit: {
            humanBacked: true,
            endpoint: 'negotiation-api',
          },
        });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: message, agentKit: { x402Required: message.includes('x402') } },
      { status: message.includes('x402') ? 402 : 500 },
    );
  }
}

/**
 * GET /api/agent
 * Health check + AgentBook status
 */
export async function GET() {
  return NextResponse.json({
    status: 'running',
    agentBookSize: agentBook.size,
    agentKit: {
      supported: true,
      chains: ['eip155:480', 'eip155:8453'], // World Chain + Base
      x402Endpoints: ['negotiation-api'],
    },
  });
}
