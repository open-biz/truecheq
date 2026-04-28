/**
 * TruCheq Agent — Auto-negotiate rules engine
 *
 * Each user can configure their agent to handle offers automatically:
 * - Auto-accept if offer >= asking price
 * - Auto-accept if offer >= minimum threshold
 * - Auto-reject if offer < floor price
 * - Otherwise: queue for human review
 *
 * Rules stored per-user in localStorage.
 */

export interface AgentRules {
  enabled: boolean;
  autoAcceptAtAskingPrice: boolean;
  minimumAcceptable: string;   // e.g. "40" (USDC)
  autoRejectBelow: string;     // e.g. "20" (USDC)
  // When true, agent replies with counter-offer at minimumAcceptable
  counterOffer: boolean;
}

const AGENT_KEY = 'trucheq_agent_rules';

export const DEFAULT_RULES: AgentRules = {
  enabled: false,
  autoAcceptAtAskingPrice: true,
  minimumAcceptable: '',
  autoRejectBelow: '',
  counterOffer: false,
};

export function loadAgentRules(): AgentRules {
  if (typeof window === 'undefined') return DEFAULT_RULES;
  try {
    const raw = localStorage.getItem(AGENT_KEY);
    if (!raw) return DEFAULT_RULES;
    return { ...DEFAULT_RULES, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_RULES;
  }
}

export function saveAgentRules(rules: AgentRules): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AGENT_KEY, JSON.stringify(rules));
}

/**
 * Evaluate an offer against agent rules
 * Returns: 'accept' | 'reject' | 'counter' | 'review'
 */
export function evaluateOffer(
  offerAmount: number,
  askingPrice: number,
  rules: AgentRules,
): { action: 'accept' | 'reject' | 'counter' | 'review'; counterAmount?: number; reason: string } {
  if (!rules.enabled) {
    return { action: 'review', reason: 'Agent disabled — queued for you' };
  }

  // Auto-accept at asking price
  if (rules.autoAcceptAtAskingPrice && offerAmount >= askingPrice) {
    return { action: 'accept', reason: `Offer $${offerAmount} >= asking $${askingPrice}` };
  }

  // Minimum acceptable threshold
  const min = parseFloat(rules.minimumAcceptable);
  if (!isNaN(min) && offerAmount >= min) {
    return { action: 'accept', reason: `Offer $${offerAmount} >= minimum $${min}` };
  }

  // Auto-reject floor
  const floor = parseFloat(rules.autoRejectBelow);
  if (!isNaN(floor) && offerAmount < floor) {
    if (rules.counterOffer && !isNaN(min)) {
      return { action: 'counter', counterAmount: min, reason: `Offer too low — countering at $${min}` };
    }
    return { action: 'reject', reason: `Offer $${offerAmount} < floor $${floor}` };
  }

  // Default: queue for human
  return { action: 'review', reason: 'Offer queued for your review' };
}

/**
 * Generate agent reply text based on evaluation
 */
export function generateAgentReply(
  evaluation: { action: 'accept' | 'reject' | 'counter' | 'review'; counterAmount?: number; reason: string },
  itemName: string,
): string {
  switch (evaluation.action) {
    case 'accept':
      return `✅ My agent accepted your offer for "${itemName}". Sending payment request...`;
    case 'reject':
      return `❌ My agent declined this offer for "${itemName}". ${evaluation.reason}.`;
    case 'counter':
      return `🤝 My agent counters at $${evaluation.counterAmount} for "${itemName}". Accept?`;
    case 'review':
      return `⏳ I'm offline. My agent queued your offer for "${itemName}". I'll reply when I'm back.`;
  }
}
