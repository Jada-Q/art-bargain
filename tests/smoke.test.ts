import { describe, expect, test } from 'vitest';
import Anthropic from '@anthropic-ai/sdk';

describe('smoke', () => {
  test('arithmetic', () => {
    expect(1 + 1).toBe(2);
  });

  test('MSW intercepts Anthropic SDK call', async () => {
    const client = new Anthropic({ apiKey: 'test-key' });
    const result = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 100,
      messages: [{ role: 'user', content: 'hi' }],
    });
    const block = result.content[0];
    expect(block.type).toBe('text');
    if (block.type === 'text') {
      expect(block.text).toBe('mock reply');
    }
  });
});
