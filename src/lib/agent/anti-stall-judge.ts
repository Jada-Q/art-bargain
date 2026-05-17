// Detects "negotiation stalled within ε% of each other for N turns" and
// proposes a median-price system mediation. Pure function, easy to unit test.

const DEFAULT_EPSILON = 0.02; // 2%
const DEFAULT_WINDOW = 3;

export type StallTurn = {
  offer_price: number | null;
  speaker: 'buyer_human' | 'buyer_agent' | 'seller_agent' | 'system';
};

export type StallVerdict = { trigger: 'mid_proposal'; price: number } | null;

export function judgeStall(
  turns: StallTurn[],
  opts: { epsilon?: number; window?: number } = {},
): StallVerdict {
  const epsilon = opts.epsilon ?? DEFAULT_EPSILON;
  const window = opts.window ?? DEFAULT_WINDOW;

  // Pull the last `window` priced turns; talk-only turns are skipped.
  const priced: number[] = [];
  for (let i = turns.length - 1; i >= 0 && priced.length < window; i--) {
    const t = turns[i];
    if (t.offer_price !== null && Number.isFinite(t.offer_price)) {
      priced.unshift(t.offer_price);
    }
  }

  if (priced.length < window) return null;

  const max = Math.max(...priced);
  const min = Math.min(...priced);
  if (min === 0) return null;

  const gap = (max - min) / min;
  if (gap > epsilon) return null;

  const median = Math.round((max + min) / 2);
  return { trigger: 'mid_proposal', price: median };
}
