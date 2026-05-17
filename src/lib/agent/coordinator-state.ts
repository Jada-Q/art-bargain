// Pure reducer driving negotiation state. The coordinator route handler is the
// only caller; it calls advance() after each agent / human input.

export const TURN_LIMIT = 20;

export type CoordStatus = 'active' | 'accepted' | 'rejected' | 'stalled';

export type CoordState = {
  status: CoordStatus;
  turn_count: number;
  last_offer: number | null;
  last_speaker: 'buyer' | 'seller' | null;
  next_speaker: 'buyer' | 'seller';
};

export type CoordEvent =
  | {
      type: 'agent_spoke';
      speaker: 'buyer' | 'seller';
      offer_price: number | null;
    }
  | { type: 'accept' }
  | { type: 'reject' };

export function initState(opening_speaker: 'buyer' | 'seller' = 'seller'): CoordState {
  return {
    status: 'active',
    turn_count: 0,
    last_offer: null,
    last_speaker: null,
    next_speaker: opening_speaker,
  };
}

export function advance(state: CoordState, event: CoordEvent): CoordState {
  if (state.status !== 'active') return state;

  switch (event.type) {
    case 'agent_spoke': {
      const turn_count = state.turn_count + 1;
      const status: CoordStatus = turn_count >= TURN_LIMIT ? 'stalled' : 'active';
      return {
        status,
        turn_count,
        last_offer: event.offer_price ?? state.last_offer,
        last_speaker: event.speaker,
        next_speaker: event.speaker === 'buyer' ? 'seller' : 'buyer',
      };
    }
    case 'accept':
      return { ...state, status: 'accepted' };
    case 'reject':
      return { ...state, status: 'rejected' };
    default:
      return state;
  }
}
