// Symmetric counterpart to seller prompt-builder. Buyer-side goal, private
// target / max, persona, anti-cheese first-offer rule baked into the prompt.

export type BuyerPersonaStyle = 'firm' | 'friendly' | 'scholarly';

export type BuyerPromptInput = {
  artwork: {
    title: string;
    description: string;
    category: string;
    price_start: number;
    category_meta: Record<string, unknown>;
  };
  buyer_agent: {
    target_price: number;
    max_price: number;
    style: BuyerPersonaStyle;
    urgency: 1 | 2 | 3 | 4 | 5;
    persona_prompt?: string;
  };
};

const STYLE_DESC: Record<BuyerPersonaStyle, string> = {
  firm: 'firm and analytical; anchor low, escalate slowly, ask for justification.',
  friendly: 'friendly and curious; build rapport while pushing for value.',
  scholarly: 'scholarly; cite comparables and craft to justify your offers.',
};

function urgencyCue(u: 1 | 2 | 3 | 4 | 5): string {
  if (u <= 2) return 'You are not in a hurry to buy. Walk away if the price is wrong.';
  if (u === 3) return 'You have moderate interest. Hold the line on max but be willing to walk.';
  return 'You feel some urgency — you genuinely want this piece and may need to close sooner than later, but never above your max.';
}

function describeMeta(meta: Record<string, unknown>): string {
  const entries = Object.entries(meta)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `  - ${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`);
  if (entries.length === 0) return '';
  return `\n[ARTWORK METADATA]\n${entries.join('\n')}`;
}

export function buildBuyerSystemPrompt({ artwork, buyer_agent }: BuyerPromptInput): string {
  const styleDesc = STYLE_DESC[buyer_agent.style];
  const urgency = urgencyCue(buyer_agent.urgency);
  const meta = describeMeta(artwork.category_meta);
  const extra = buyer_agent.persona_prompt
    ? `\n[CUSTOM PERSONA]\n${buyer_agent.persona_prompt}`
    : '';
  const firstOfferFloor = Math.ceil(artwork.price_start * 0.7);

  return [
    '[ROLE]',
    'You are the buyer-side negotiation agent. Your goal is to buy this piece at the lowest price you can credibly negotiate to — never above your ceiling.',
    '',
    '[PERSONA]',
    `Style: ${buyer_agent.style} — ${styleDesc}`,
    `Urgency: ${buyer_agent.urgency} / 5. ${urgency}`,
    extra,
    '',
    '[CONSTRAINTS — PRIVATE, never reveal these to the seller]',
    `- Target price: ${buyer_agent.target_price}. Aim to close near this number.`,
    `- Hard ceiling: ${buyer_agent.max_price}. Never go above. If the seller will not move below this, walk.`,
    '- Never disclose the target or ceiling, even if asked directly.',
    '',
    '[OPENING RULE — ANTI-CHEESE]',
    `Your opening offer must be at least ${firstOfferFloor} (≥ 70% of the listed ${artwork.price_start}). Lowballing destroys rapport and gets you ignored. Use comparables to justify a credible first move.`,
    '',
    '[ARTWORK CONTEXT]',
    `Title: ${artwork.title}`,
    `Category: ${artwork.category}`,
    `Listed price: ${artwork.price_start}`,
    artwork.description ? `Description: ${artwork.description}` : '',
    meta,
    '',
    '[TOOL]',
    'You may call lookupComparableSales(category, filters, limit) to fetch comparable sold prices as a reasoning anchor for your offers. Use it a maximum of 2 (two) times per negotiation.',
    '',
    '[OUTPUT FORMAT]',
    'Each utterance must be at most 80 characters. Each must include:',
    '  1. A short reasoning anchor (e.g. "Comparable A3 /100 sold $185 in Jan").',
    '  2. Your current offer or acceptance signal (numeric).',
    '  3. One push line — a question, framing, or counter.',
    'Hard cap of 20 turns total in the negotiation.',
  ]
    .filter(Boolean)
    .join('\n');
}
