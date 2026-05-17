// `lookupComparableSales` is the only tool the negotiation agent calls.
// Implemented as a thin function over a `ComparableSalesSource` so tests can
// substitute an in-memory stub; production wires a Supabase-backed source.

export type Category = 'poster' | 'painting' | 'photography';

export type ComparableSale = {
  sold_price: number;
  meta: Record<string, unknown>;
  sold_at: string;
  notes: string;
};

export interface ComparableSalesSource {
  list(input: {
    category: string;
    filters?: Record<string, unknown>;
    limit: number;
  }): Promise<ComparableSale[]>;
}

export type ToolInput = {
  category: Category;
  filters?: Record<string, unknown>;
  limit?: number;
};

export type ToolResult = { items: ComparableSale[] };

const DEFAULT_LIMIT = 3;
const MIN_LIMIT = 1;
const MAX_LIMIT = 5;

function clampLimit(raw: number | undefined): number {
  const v = raw ?? DEFAULT_LIMIT;
  if (v < MIN_LIMIT) return MIN_LIMIT;
  if (v > MAX_LIMIT) return MAX_LIMIT;
  return v;
}

export async function lookupComparableSales(
  input: ToolInput,
  source: ComparableSalesSource,
): Promise<ToolResult> {
  const items = await source.list({
    category: input.category,
    filters: input.filters,
    limit: clampLimit(input.limit),
  });
  return { items };
}
