// Shared offer-figure extractor used by the human-turn route and the
// seller/buyer agent response parser. Kept dependency-free so it can be
// imported into the SSE route without pulling the Anthropic SDK into that bundle.

// `$` amounts: optional space, optional thousands separators, optional decimals.
// e.g. "$150", "$ 150", "$1,200", "$149.50", "**$185**".
const MONEY_RE = /\$\s?(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)/g;

// Any decimal number, optionally negative. Negatives are surfaced (not dropped)
// so callers can reject them loudly rather than silently treat as "no offer".
const BARE_NUMBER_RE = /-?\d+(?:\.\d+)?/g;

/**
 * Pick the most likely offer figure from free text.
 *
 * Priority:
 *  1. The LAST `$`-prefixed amount. Humans and both agents denote prices with
 *     `$` (the chat placeholder literally suggests `"Can you do $150?"`), so a
 *     `$` is a strong, unambiguous signal — and it sidesteps incidental numbers
 *     like edition sizes ("/100"), paper sizes ("A3") and dates.
 *  2. Fallback (no `$` anywhere): the LAST bare number, after stripping the
 *     noise tokens that previously produced false positives — edition
 *     denominators ("/75"), print dimensions ("50x75") and paper sizes ("A3").
 *
 * Returns the raw number (may be negative); bounds are the caller's call.
 */
export function pickOfferNumber(text: string): number | null {
  const money = Array.from(text.matchAll(MONEY_RE)).map((m) => Number(m[1].replace(/,/g, '')));
  if (money.length > 0) return money[money.length - 1];

  const cleaned = text
    .replace(/\/\s?\d+/g, ' ') // edition denominators: /75, /100
    .replace(/\d+\s?[x×]\s?\d+/gi, ' ') // dimensions: 50x75, 24 × 32
    .replace(/\bA\d+\b/gi, ' '); // paper sizes: A2, A3

  const bare = Array.from(cleaned.matchAll(BARE_NUMBER_RE)).map((m) => Number(m[0]));
  if (bare.length === 0) return null;
  return bare[bare.length - 1];
}
