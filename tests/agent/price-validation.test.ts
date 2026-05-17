import { describe, expect, test } from 'vitest';
import { validateBuyerOffer, validateSellerOffer } from '@/lib/agent/price-validation';

describe('validateBuyerOffer', () => {
  test('accepts a reasonable mid-range offer', () => {
    expect(() =>
      validateBuyerOffer({ offer: 150, price_start: 200, isFirstTurn: false }),
    ).not.toThrow();
  });

  test('throws when offer is negative', () => {
    expect(() => validateBuyerOffer({ offer: -1, price_start: 200, isFirstTurn: false })).toThrow(
      /negative|invalid/i,
    );
  });

  test('throws when offer exceeds maximum (1_000_000)', () => {
    expect(() =>
      validateBuyerOffer({ offer: 1_000_001, price_start: 200, isFirstTurn: false }),
    ).toThrow(/maximum|too high|exceeds/i);
  });

  test('first-turn offer below 0.7 × price_start is rejected (anti-cheese)', () => {
    expect(() => validateBuyerOffer({ offer: 100, price_start: 200, isFirstTurn: true })).toThrow(
      /first|0\.7|lowball/i,
    );
  });

  test('first-turn offer at exactly 0.7 × price_start is accepted', () => {
    expect(() =>
      validateBuyerOffer({ offer: 140, price_start: 200, isFirstTurn: true }),
    ).not.toThrow();
  });

  test('later-turn lowball is allowed (only first turn is gated)', () => {
    expect(() =>
      validateBuyerOffer({ offer: 50, price_start: 200, isFirstTurn: false }),
    ).not.toThrow();
  });
});

describe('validateSellerOffer', () => {
  test('accepts an offer above floor', () => {
    expect(() => validateSellerOffer({ offer: 180, price_floor: 120 })).not.toThrow();
  });

  test('accepts an offer exactly at floor', () => {
    expect(() => validateSellerOffer({ offer: 120, price_floor: 120 })).not.toThrow();
  });

  test('throws when offer falls below floor', () => {
    expect(() => validateSellerOffer({ offer: 100, price_floor: 120 })).toThrow(/floor|below/i);
  });

  test('throws when offer is negative', () => {
    expect(() => validateSellerOffer({ offer: -5, price_floor: 0 })).toThrow(/negative|invalid/i);
  });

  test('throws when offer exceeds maximum', () => {
    expect(() => validateSellerOffer({ offer: 1_000_001, price_floor: 100 })).toThrow(
      /maximum|exceeds/i,
    );
  });
});
