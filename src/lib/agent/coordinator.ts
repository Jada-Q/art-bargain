// runSellerTurn — Plan B M5 thin orchestrator for human-vs-agent.
// Pre-fetches comparables (RAG anchoring), builds the seller prompt,
// calls Claude with streaming, and yields chunks the SSE route forwards
// to the client. Tool-use round-trip is deferred to Plan C (M6/M7).

import Anthropic from '@anthropic-ai/sdk';
import { buildSellerSystemPrompt, type SellerPromptInput } from './prompt-builder';
import { parseFinalMessage, type ParsedTurn } from './response-parser';
import { lookupComparableSales, type ComparableSalesSource, type Category } from './tool-executor';

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS_PER_SEGMENT = 400;
const PRE_FETCH_LIMIT = 3;

export type CoordinatorTurn =
  | { type: 'token'; delta: string }
  | { type: 'anchor'; items: { sold_price: number; sold_at: string; notes: string }[] }
  | { type: 'final'; parsed: ParsedTurn; raw: Anthropic.Messages.Message };

export type CoordinatorDeps = {
  anthropic: Anthropic;
  source: ComparableSalesSource;
};

export type CoordinatorInput = {
  artwork: SellerPromptInput['artwork'];
  history: { speaker: string; message: string }[];
  buyer_message: string;
};

async function fetchAnchorContext(
  input: CoordinatorInput,
  source: ComparableSalesSource,
): Promise<string[]> {
  const { items } = await lookupComparableSales(
    { category: input.artwork.category as Category, limit: PRE_FETCH_LIMIT },
    source,
  );
  return items.map((s) => `- ${s.sold_at}, sold $${s.sold_price}: ${s.notes}`);
}

function historyToMessages(history: CoordinatorInput['history']) {
  return history.map((h) => ({
    role: h.speaker === 'buyer_human' || h.speaker === 'buyer_agent' ? 'user' : 'assistant',
    content: h.message,
  })) as Anthropic.Messages.MessageParam[];
}

export async function* runSellerTurnStream(
  input: CoordinatorInput,
  deps: CoordinatorDeps,
): AsyncGenerator<CoordinatorTurn> {
  const anchors = await fetchAnchorContext(input, deps.source);
  if (anchors.length > 0) {
    yield {
      type: 'anchor',
      items: [], // placeholder — full items emitted by SSE route from a separate side-channel if needed
    };
  }

  const systemPrompt =
    buildSellerSystemPrompt(input) +
    (anchors.length > 0
      ? `\n\n[CURRENT COMPARABLE ANCHORS]\n${anchors.join('\n')}\nUse these as evidence — quote at most one inline in each reply.`
      : '');

  const messages: Anthropic.Messages.MessageParam[] = [
    ...historyToMessages(input.history),
    { role: 'user', content: input.buyer_message },
  ];

  const stream = deps.anthropic.messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS_PER_SEGMENT,
    system: systemPrompt,
    messages,
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield { type: 'token', delta: event.delta.text };
    }
  }

  const raw = await stream.finalMessage();
  const parsed = parseFinalMessage(raw);
  yield { type: 'final', parsed, raw };
}
