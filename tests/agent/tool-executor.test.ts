import { describe, expect, test, vi } from 'vitest';
import {
  lookupComparableSales,
  type ComparableSalesSource,
  type ComparableSale,
} from '@/lib/agent/tool-executor';

// Tiny stub source — captures the input it was called with and returns canned data.
function stubSource(returnValue: ComparableSale[] = []): ComparableSalesSource & {
  lastCall?: { category: string; filters?: object; limit: number };
} {
  const stub = {
    lastCall: undefined as { category: string; filters?: object; limit: number } | undefined,
    async list(input: { category: string; filters?: object; limit: number }) {
      stub.lastCall = input;
      return returnValue;
    },
  };
  return stub;
}

const sample: ComparableSale = {
  sold_price: 250,
  meta: { size: 'A3', signed: true },
  sold_at: '2025-01-09',
  notes: 'signed A3 /100',
};

describe('lookupComparableSales', () => {
  test('forwards category to source', async () => {
    const src = stubSource();
    await lookupComparableSales({ category: 'poster' }, src);
    expect(src.lastCall?.category).toBe('poster');
  });

  test('forwards filters to source', async () => {
    const src = stubSource();
    await lookupComparableSales({ category: 'poster', filters: { signed: true } }, src);
    expect(src.lastCall?.filters).toEqual({ signed: true });
  });

  test('default limit is 3 when omitted', async () => {
    const src = stubSource();
    await lookupComparableSales({ category: 'painting' }, src);
    expect(src.lastCall?.limit).toBe(3);
  });

  test('limit clamps to max 5', async () => {
    const src = stubSource();
    await lookupComparableSales({ category: 'painting', limit: 99 }, src);
    expect(src.lastCall?.limit).toBe(5);
  });

  test('limit clamps to min 1', async () => {
    const src = stubSource();
    await lookupComparableSales({ category: 'painting', limit: 0 }, src);
    expect(src.lastCall?.limit).toBe(1);
  });

  test('wraps source rows in { items }', async () => {
    const src = stubSource([sample, sample]);
    const result = await lookupComparableSales({ category: 'poster' }, src);
    expect(result).toEqual({ items: [sample, sample] });
  });

  test('empty result → { items: [] }', async () => {
    const src = stubSource([]);
    const result = await lookupComparableSales({ category: 'photography' }, src);
    expect(result).toEqual({ items: [] });
  });

  test('source list method is called once per invocation', async () => {
    const src = stubSource();
    const spy = vi.spyOn(src, 'list');
    await lookupComparableSales({ category: 'poster' }, src);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
