import { describe, expect, test } from 'vitest';
import {
  advance,
  initState,
  type CoordState,
  type CoordEvent,
} from '@/lib/agent/coordinator-state';

describe('coordinator state machine', () => {
  test('initState defaults to active + seller-opens', () => {
    const s = initState();
    expect(s.status).toBe('active');
    expect(s.turn_count).toBe(0);
    expect(s.next_speaker).toBe('seller');
    expect(s.last_offer).toBeNull();
    expect(s.last_speaker).toBeNull();
  });

  test('initState honors opening speaker override', () => {
    const s = initState('buyer');
    expect(s.next_speaker).toBe('buyer');
  });

  test('agent_spoke increments turn_count and flips next_speaker', () => {
    const s = advance(initState(), {
      type: 'agent_spoke',
      speaker: 'seller',
      offer_price: 200,
    });
    expect(s.turn_count).toBe(1);
    expect(s.next_speaker).toBe('buyer');
    expect(s.last_speaker).toBe('seller');
    expect(s.last_offer).toBe(200);
  });

  test('agent_spoke without offer keeps prior last_offer', () => {
    let s = initState();
    s = advance(s, { type: 'agent_spoke', speaker: 'seller', offer_price: 200 });
    s = advance(s, { type: 'agent_spoke', speaker: 'buyer', offer_price: null });
    expect(s.last_offer).toBe(200);
  });

  test('reaches stalled at turn 20', () => {
    let s = initState();
    for (let i = 0; i < 19; i++) {
      s = advance(s, {
        type: 'agent_spoke',
        speaker: i % 2 === 0 ? 'seller' : 'buyer',
        offer_price: null,
      });
      expect(s.status).toBe('active');
    }
    s = advance(s, { type: 'agent_spoke', speaker: 'buyer', offer_price: null });
    expect(s.status).toBe('stalled');
    expect(s.turn_count).toBe(20);
  });

  test('accept transitions to accepted', () => {
    let s = initState();
    s = advance(s, { type: 'agent_spoke', speaker: 'seller', offer_price: 180 });
    s = advance(s, { type: 'accept' });
    expect(s.status).toBe('accepted');
    expect(s.last_offer).toBe(180);
  });

  test('reject transitions to rejected', () => {
    const s = advance(initState(), { type: 'reject' });
    expect(s.status).toBe('rejected');
  });

  test('terminal state ignores further events (no-op)', () => {
    let s = initState();
    s = advance(s, { type: 'accept' });
    expect(s.status).toBe('accepted');
    s = advance(s, { type: 'agent_spoke', speaker: 'buyer', offer_price: 100 });
    expect(s.status).toBe('accepted'); // unchanged
    expect(s.turn_count).toBe(0); // unchanged
  });

  test('agent_spoke alternation flips correctly for both directions', () => {
    let s = initState('buyer');
    s = advance(s, { type: 'agent_spoke', speaker: 'buyer', offer_price: 100 });
    expect(s.next_speaker).toBe('seller');
    s = advance(s, { type: 'agent_spoke', speaker: 'seller', offer_price: 180 });
    expect(s.next_speaker).toBe('buyer');
  });

  test('shape is immutable per call (does not mutate input state)', () => {
    const s0: CoordState = initState();
    const e: CoordEvent = { type: 'agent_spoke', speaker: 'seller', offer_price: 200 };
    const s1 = advance(s0, e);
    expect(s0.turn_count).toBe(0); // original untouched
    expect(s1.turn_count).toBe(1);
    expect(s0).not.toBe(s1);
  });
});
