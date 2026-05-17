import type Anthropic from '@anthropic-ai/sdk';

type Message = Anthropic.Messages.Message;

export type ParsedToolCall = {
  name: string;
  input: unknown;
  output?: unknown;
};

export type ParsedTurn = {
  full_text: string;
  offer_price: number | null;
  reasoning?: { tool_calls?: ParsedToolCall[] };
};

const MAX_OFFER = 1_000_000;

// Match any decimal number, optionally preceded by a minus sign.
// Defensive: an agent should never produce negatives, but we surface the
// invalid value loudly rather than silently accept it.
const NUMBER_RE = /-?\d+(?:\.\d+)?/g;

function extractText(message: Message): string {
  return message.content
    .filter((b): b is Extract<Message['content'][number], { type: 'text' }> => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
}

function extractToolCalls(message: Message): ParsedToolCall[] {
  return message.content
    .filter(
      (b): b is Extract<Message['content'][number], { type: 'tool_use' }> => b.type === 'tool_use',
    )
    .map((b) => ({ name: b.name, input: b.input }));
}

function extractOfferPrice(text: string): number | null {
  const matches = Array.from(text.matchAll(NUMBER_RE)).map((m) => Number(m[0]));
  if (matches.length === 0) return null;
  const last = matches[matches.length - 1];
  if (last < 0) {
    throw new Error(`offer_price negative or invalid: ${last}`);
  }
  if (last > MAX_OFFER) {
    throw new Error(`offer_price exceeds maximum (${MAX_OFFER}): ${last}`);
  }
  return last;
}

export function parseFinalMessage(message: Message): ParsedTurn {
  const full_text = extractText(message);
  const offer_price = extractOfferPrice(full_text);
  const tool_calls = extractToolCalls(message);
  return {
    full_text,
    offer_price,
    ...(tool_calls.length > 0 ? { reasoning: { tool_calls } } : {}),
  };
}
