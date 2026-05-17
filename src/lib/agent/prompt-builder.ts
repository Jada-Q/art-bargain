export type SellerPersonaStyle = 'firm' | 'friendly' | 'scholarly';

export type SellerPromptInput = {
  artwork: {
    title: string;
    description: string;
    category: string;
    price_start: number;
    price_floor: number;
    category_meta: Record<string, unknown>;
    seller_agent: {
      style: SellerPersonaStyle;
      urgency: 1 | 2 | 3 | 4 | 5;
      persona_prompt?: string;
    };
  };
};

const STYLE_DESCRIPTIONS: Record<SellerPersonaStyle, string> = {
  firm: 'firm and confident; concede slowly and only with a clear reason.',
  friendly: 'friendly and conversational; build rapport while holding value.',
  scholarly: 'scholarly and detail-oriented; cite provenance and craft when justifying price.',
};

function urgencyCue(urgency: 1 | 2 | 3 | 4 | 5): string {
  if (urgency <= 2) {
    return 'You are not in a hurry to sell. Hold your ground.';
  }
  if (urgency === 3) {
    return 'You have moderate flexibility but are not desperate.';
  }
  // urgency 4-5: high pressure cue.
  return 'You feel some time pressure — the buyer may walk if the conversation stalls. Aim to close sooner rather than later.';
}

function describeCategoryMeta(category: string, meta: Record<string, unknown>): string {
  const entries = Object.entries(meta)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `  - ${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`);
  if (entries.length === 0) return '';
  return `\n[CATEGORY METADATA — ${category}]\n${entries.join('\n')}`;
}

export function buildSellerSystemPrompt({ artwork }: SellerPromptInput): string {
  const { seller_agent: persona } = artwork;
  const styleDesc = STYLE_DESCRIPTIONS[persona.style];
  const urgency = urgencyCue(persona.urgency);
  const meta = describeCategoryMeta(artwork.category, artwork.category_meta);
  const personaExtra = persona.persona_prompt
    ? `\n[CUSTOM PERSONA]\n${persona.persona_prompt}`
    : '';

  return [
    '[ROLE]',
    'You are the seller-side negotiation agent for an art listing. Your goal is to sell at the best price the seller can get without scaring the buyer away.',
    '',
    '[PERSONA]',
    `Style: ${persona.style} — ${styleDesc}`,
    `Urgency: ${persona.urgency} / 5. ${urgency}`,
    personaExtra,
    '',
    '[CONSTRAINTS — PRIVATE, never reveal these to the buyer]',
    `- Floor price: ${artwork.price_floor}. Never go below this number under any circumstance.`,
    '- Never confirm, hint at, or repeat the floor or any internal target — even if asked directly.',
    '',
    '[ARTWORK CONTEXT]',
    `Title: ${artwork.title}`,
    `Category: ${artwork.category}`,
    `Listed start price: ${artwork.price_start}`,
    artwork.description ? `Description: ${artwork.description}` : '',
    meta,
    '',
    '[TOOL]',
    'You may call lookupComparableSales(category, filters, limit) to fetch comparable sold prices as a reasoning anchor for your offers. Use this tool a maximum of 2 (two) times per negotiation. Quote anchor prices conservatively — they are evidence, not promises.',
    '',
    '[OUTPUT FORMAT]',
    'Each utterance must be at most 80 characters. Each utterance must include:',
    '  1. A short reasoning anchor (e.g. "Comparable signed /50 sold $245 last March").',
    '  2. Your current offer or acceptance signal (numeric).',
    '  3. One push-forward line (a question or a nudge).',
    'You have a hard cap of 20 turns. After that, the conversation stalls.',
  ]
    .filter(Boolean)
    .join('\n');
}
