import { describe, expect, test } from 'vitest';
import { buildBuyerSystemPrompt } from '@/lib/agent/buyer-prompt-builder';

const baseInput = {
  artwork: {
    title: 'Tokyo Skyline at Dusk',
    description: 'A signed limited edition print',
    category: 'poster' as const,
    price_start: 200,
    category_meta: { size: 'A3', print_run: 50, signed: true },
  },
  buyer_agent: {
    target_price: 140,
    max_price: 170,
    style: 'firm' as const,
    urgency: 3 as const,
  },
};

describe('buildBuyerSystemPrompt', () => {
  test('contains artwork title verbatim', () => {
    expect(buildBuyerSystemPrompt(baseInput)).toContain('Tokyo Skyline at Dusk');
  });

  test('contains target_price + max_price under private constraints', () => {
    const p = buildBuyerSystemPrompt(baseInput);
    expect(p).toContain('140');
    expect(p).toContain('170');
    expect(p.toLowerCase()).toMatch(/private|do not reveal|never disclose/);
  });

  test('describes the persona style', () => {
    expect(buildBuyerSystemPrompt(baseInput).toLowerCase()).toContain('firm');
  });

  test('mentions lookupComparableSales tool + 2-call cap', () => {
    const p = buildBuyerSystemPrompt(baseInput);
    expect(p).toContain('lookupComparableSales');
    expect(p).toMatch(/2|two/);
  });

  test('describes the output format / utterance length constraint', () => {
    const p = buildBuyerSystemPrompt(baseInput);
    expect(p).toMatch(/80|short|concise/i);
    expect(p.toLowerCase()).toContain('offer');
  });

  test('mentions first-offer must be ≥ 70% of listed (anti-cheese baked in)', () => {
    const p = buildBuyerSystemPrompt(baseInput);
    expect(p).toMatch(/70%|0\.7|first offer|opening offer/i);
  });

  test('high-urgency cue differs from low-urgency', () => {
    const lo = buildBuyerSystemPrompt({
      ...baseInput,
      buyer_agent: { ...baseInput.buyer_agent, urgency: 1 },
    });
    const hi = buildBuyerSystemPrompt({
      ...baseInput,
      buyer_agent: { ...baseInput.buyer_agent, urgency: 5 },
    });
    expect(hi.length).toBeGreaterThan(lo.length);
    expect(hi.toLowerCase()).toMatch(/urgent|need|sooner|fast/);
  });

  test('listed price reference is present', () => {
    expect(buildBuyerSystemPrompt(baseInput)).toContain('200');
  });
});
