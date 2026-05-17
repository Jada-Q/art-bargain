import { describe, expect, test } from 'vitest';
import { buildSellerSystemPrompt } from '@/lib/agent/prompt-builder';

const baseInput = {
  artwork: {
    title: 'Tokyo Skyline at Dusk',
    description: 'A signed limited edition print',
    category: 'poster' as const,
    price_start: 200,
    price_floor: 120,
    category_meta: { size: 'A3', print_run: 50, signed: true, edition_no: 12 },
    seller_agent: {
      style: 'friendly' as const,
      urgency: 3 as const,
      persona_prompt: undefined,
    },
  },
};

describe('buildSellerSystemPrompt', () => {
  test('contains the artwork title verbatim', () => {
    const prompt = buildSellerSystemPrompt(baseInput);
    expect(prompt).toContain('Tokyo Skyline at Dusk');
  });

  test('contains the artwork category', () => {
    const prompt = buildSellerSystemPrompt(baseInput);
    expect(prompt.toLowerCase()).toContain('poster');
  });

  test('contains the start price', () => {
    const prompt = buildSellerSystemPrompt(baseInput);
    expect(prompt).toContain('200');
  });

  test('contains the floor price (private constraints block)', () => {
    const prompt = buildSellerSystemPrompt(baseInput);
    expect(prompt).toContain('120');
    // Floor must appear under a private-constraint header so the agent
    // knows not to surface it to the buyer.
    expect(prompt.toLowerCase()).toMatch(/private|do not reveal|never disclose/);
  });

  test('mentions the persona style', () => {
    const prompt = buildSellerSystemPrompt(baseInput);
    expect(prompt.toLowerCase()).toContain('friendly');
  });

  test('mentions the lookupComparableSales tool name and 2-call cap', () => {
    const prompt = buildSellerSystemPrompt(baseInput);
    expect(prompt).toContain('lookupComparableSales');
    expect(prompt).toMatch(/2|two/);
  });

  test('describes the output format constraint (length + structured)', () => {
    const prompt = buildSellerSystemPrompt(baseInput);
    expect(prompt).toMatch(/80|short|concise/i);
    expect(prompt.toLowerCase()).toContain('offer');
  });

  test('urgency=5 adds a time-pressure cue absent at urgency=1', () => {
    const low = buildSellerSystemPrompt({
      artwork: {
        ...baseInput.artwork,
        seller_agent: { ...baseInput.artwork.seller_agent, urgency: 1 },
      },
    });
    const high = buildSellerSystemPrompt({
      artwork: {
        ...baseInput.artwork,
        seller_agent: { ...baseInput.artwork.seller_agent, urgency: 5 },
      },
    });
    expect(high.length).toBeGreaterThan(low.length);
    // The high-urgency prompt should mention urgency or pressure semantics.
    expect(high.toLowerCase()).toMatch(/urgent|pressure|sooner|quick/);
  });

  test('persona_prompt (custom) appears verbatim in output', () => {
    const custom = buildSellerSystemPrompt({
      artwork: {
        ...baseInput.artwork,
        seller_agent: {
          ...baseInput.artwork.seller_agent,
          persona_prompt: 'emphasize the rarity of the signed edition',
        },
      },
    });
    expect(custom).toContain('emphasize the rarity of the signed edition');
  });

  test('includes category_meta details', () => {
    const prompt = buildSellerSystemPrompt(baseInput);
    expect(prompt).toContain('A3');
    expect(prompt).toMatch(/signed|edition/i);
  });
});
