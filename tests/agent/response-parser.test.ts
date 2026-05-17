/* eslint-disable @typescript-eslint/no-explicit-any -- the SDK's content block
   union has many fields we don't need to fully type for fixtures; `as any` is
   sufficient for tests that only care about discriminant + a few props. */

import { describe, expect, test } from 'vitest';
import type Anthropic from '@anthropic-ai/sdk';
import { parseFinalMessage } from '@/lib/agent/response-parser';

type Message = Anthropic.Messages.Message;

function messageWith(content: Message['content']): Message {
  return {
    id: 'msg_test',
    type: 'message',
    role: 'assistant',
    model: 'claude-sonnet-4-6',
    content,
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: {
      input_tokens: 10,
      output_tokens: 5,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
      cache_creation: { ephemeral_5m_input_tokens: 0, ephemeral_1h_input_tokens: 0 },
      service_tier: 'standard',
    },
  } as Message;
}

describe('parseFinalMessage', () => {
  test('extracts a single $-prefixed offer', () => {
    const m = messageWith([{ type: 'text', text: "I'll go $150." } as any]);
    const result = parseFinalMessage(m);
    expect(result.offer_price).toBe(150);
    expect(result.full_text).toContain("I'll go");
  });

  test('takes the last numeric when multiple amounts appear', () => {
    const m = messageWith([{ type: 'text', text: 'list $200, willing to do $150' } as any]);
    expect(parseFinalMessage(m).offer_price).toBe(150);
  });

  test('returns null when no numeric is present', () => {
    const m = messageWith([{ type: 'text', text: 'no thanks, walking away' } as any]);
    expect(parseFinalMessage(m).offer_price).toBeNull();
  });

  test('handles "150 USD"', () => {
    const m = messageWith([{ type: 'text', text: 'final 150 USD' } as any]);
    expect(parseFinalMessage(m).offer_price).toBe(150);
  });

  test('handles "150 美元"', () => {
    const m = messageWith([{ type: 'text', text: '我出 150 美元' } as any]);
    expect(parseFinalMessage(m).offer_price).toBe(150);
  });

  test('handles "150 dollars"', () => {
    const m = messageWith([{ type: 'text', text: 'how about 150 dollars' } as any]);
    expect(parseFinalMessage(m).offer_price).toBe(150);
  });

  test('throws when offer > 1_000_000', () => {
    const m = messageWith([{ type: 'text', text: 'I think 5000000 is fair' } as any]);
    expect(() => parseFinalMessage(m)).toThrow(/exceeds|maximum|too high/i);
  });

  test('throws when offer < 0', () => {
    const m = messageWith([{ type: 'text', text: 'I drop to -200' } as any]);
    expect(() => parseFinalMessage(m)).toThrow(/negative|invalid/i);
  });

  test('captures tool_use blocks under reasoning.tool_calls', () => {
    const m = messageWith([
      {
        type: 'tool_use',
        id: 'tu_1',
        name: 'lookupComparableSales',
        input: { category: 'poster', filters: { signed: true } },
      } as any,
      { type: 'text', text: 'Based on comparables, I offer $180' } as any,
    ]);
    const result = parseFinalMessage(m);
    expect(result.offer_price).toBe(180);
    expect(result.reasoning?.tool_calls).toHaveLength(1);
    expect(result.reasoning?.tool_calls?.[0].name).toBe('lookupComparableSales');
    expect(result.reasoning?.tool_calls?.[0].input).toEqual({
      category: 'poster',
      filters: { signed: true },
    });
  });

  test('no tool_use → no reasoning field (or empty reasoning)', () => {
    const m = messageWith([{ type: 'text', text: 'offer 100' } as any]);
    const result = parseFinalMessage(m);
    expect(result.reasoning?.tool_calls ?? []).toEqual([]);
  });

  test('multi-text-block message concatenates text', () => {
    const m = messageWith([
      { type: 'text', text: 'Part one. ' } as any,
      { type: 'text', text: 'Final offer 175.' } as any,
    ]);
    const result = parseFinalMessage(m);
    expect(result.full_text).toContain('Part one');
    expect(result.full_text).toContain('Final offer');
    expect(result.offer_price).toBe(175);
  });
});
