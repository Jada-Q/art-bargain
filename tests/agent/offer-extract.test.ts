import { describe, expect, test } from 'vitest';
import { pickOfferNumber } from '@/lib/agent/offer-extract';

describe('pickOfferNumber', () => {
  // The bug this module exists to fix: an incidental "/100" (edition size)
  // was picked as the offer instead of the "$150" the buyer actually typed.
  test('regression: $-amount wins over an edition denominator', () => {
    expect(pickOfferNumber("Can you do $150? It's a /100 edition, not exactly rare.")).toBe(150);
  });

  test('single $-prefixed offer', () => {
    expect(pickOfferNumber("I'll go $150.")).toBe(150);
  });

  test('last $-amount when several appear (anchor then offer)', () => {
    expect(pickOfferNumber('A signed A3 /75 sold for $215 — current offer **$185**.')).toBe(185);
  });

  test('reasoning math does not hijack the offer ($ still wins)', () => {
    expect(pickOfferNumber('Your 20% math gives $172 — but Offer: $163.')).toBe(163);
  });

  test('$ with thousands separator', () => {
    expect(pickOfferNumber('platinum /5 piece, I can do $1,200')).toBe(1200);
  });

  test('$ with a trailing period / markdown bold', () => {
    expect(pickOfferNumber('**Final offer: $164.** Deal?')).toBe(164);
  });

  // Fallback path: no `$` at all. Still must dodge edition / dimension noise.
  test('no $: bare number wins over edition denominator', () => {
    expect(pickOfferNumber("I can do 150, it's a /100 edition")).toBe(150);
  });

  test('no $: bare number wins over print dimensions', () => {
    expect(pickOfferNumber('the 50x75 fiber print — 150 works for me')).toBe(150);
  });

  test('no $: bare number wins over paper size', () => {
    expect(pickOfferNumber('that A3 poster, how about 150')).toBe(150);
  });

  // Existing behaviours that other parsers rely on — must not regress.
  test('"150 USD" (no $)', () => {
    expect(pickOfferNumber('final 150 USD')).toBe(150);
  });

  test('"150 美元" (no $)', () => {
    expect(pickOfferNumber('我出 150 美元')).toBe(150);
  });

  test('plain "150 dollars"', () => {
    expect(pickOfferNumber('how about 150 dollars')).toBe(150);
  });

  test('null when no number present', () => {
    expect(pickOfferNumber('no thanks, walking away')).toBeNull();
  });

  test('decimal $-amount preserved', () => {
    expect(pickOfferNumber('I can stretch to $149.50')).toBe(149.5);
  });

  test('negative figures are surfaced (caller decides bounds)', () => {
    expect(pickOfferNumber('offer $-5')).toBe(-5);
  });
});
