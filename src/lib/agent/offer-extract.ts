// Shared offer-figure extractor used by the human-turn route and the
// seller/buyer agent response parser. Kept dependency-free so it can be
// imported into the SSE route without pulling the Anthropic SDK into that bundle.

// Stub — implementation follows in the next commit (TDD: tests first).
export function pickOfferNumber(text: string): number | null {
  void text;
  return null;
}
