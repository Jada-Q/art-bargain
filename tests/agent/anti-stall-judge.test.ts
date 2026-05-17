import { describe, expect, test } from 'vitest';
import { judgeStall, type StallTurn } from '@/lib/agent/anti-stall-judge';

function turn(
  offer: number | null,
  speaker: 'buyer_human' | 'buyer_agent' | 'seller_agent' = 'seller_agent',
): StallTurn {
  return { offer_price: offer, speaker };
}

describe('judgeStall', () => {
  test('returns null when fewer than 3 priced turns', () => {
    expect(judgeStall([turn(200), turn(180)])).toBeNull();
  });

  test('returns null when last 3 turns gap > 2 percent', () => {
    expect(judgeStall([turn(200), turn(180), turn(150)])).toBeNull();
  });

  test('triggers when last 3 turns within 2 percent of each other', () => {
    const result = judgeStall([turn(200), turn(198), turn(201)]);
    expect(result).not.toBeNull();
    expect(result?.trigger).toBe('mid_proposal');
    expect(result?.price).toBeGreaterThanOrEqual(198);
    expect(result?.price).toBeLessThanOrEqual(201);
  });

  test('median price is rounded to integer', () => {
    const result = judgeStall([turn(198), turn(200), turn(199)]);
    // gap (200-198)/198 = 1.01% within 2% → triggers
    expect(result?.price).toBe(Math.round((198 + 200) / 2));
  });

  test('ignores talk-only turns (offer_price null) when counting consecutive', () => {
    // Last 3 PRICED turns from the tail are 200/198/201 → triggers despite a null in between.
    const result = judgeStall([
      turn(200),
      turn(null, 'buyer_human'),
      turn(198),
      turn(null, 'seller_agent'),
      turn(201),
    ]);
    expect(result?.trigger).toBe('mid_proposal');
  });

  test('configurable epsilon via opts', () => {
    // With default 2%, 200/210 is >2% gap → null. With opts.epsilon=0.1, accepted.
    expect(judgeStall([turn(200), turn(210), turn(205)])).toBeNull();
    expect(judgeStall([turn(200), turn(210), turn(205)], { epsilon: 0.1 })?.trigger).toBe(
      'mid_proposal',
    );
  });
});
