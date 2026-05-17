// Pure validators used by the negotiation coordinator + the SSE route.
// Anti-cheese rules live here so they're independently testable.

const MAX_OFFER = 1_000_000;
const FIRST_OFFER_FLOOR_RATIO = 0.7;

export function validateBuyerOffer(args: {
  offer: number;
  price_start: number;
  isFirstTurn: boolean;
}): void {
  const { offer, price_start, isFirstTurn } = args;

  if (!Number.isFinite(offer) || offer < 0) {
    throw new Error(`Buyer offer negative or invalid: ${offer}`);
  }
  if (offer > MAX_OFFER) {
    throw new Error(`Buyer offer exceeds maximum (${MAX_OFFER}): ${offer}`);
  }
  if (isFirstTurn && offer < FIRST_OFFER_FLOOR_RATIO * price_start) {
    throw new Error(
      `First-turn lowball: ${offer} < ${FIRST_OFFER_FLOOR_RATIO * price_start} ` +
        `(0.7 × listed ${price_start}). Open with a credible offer.`,
    );
  }
}

export function validateSellerOffer(args: { offer: number; price_floor: number }): void {
  const { offer, price_floor } = args;

  if (!Number.isFinite(offer) || offer < 0) {
    throw new Error(`Seller offer negative or invalid: ${offer}`);
  }
  if (offer > MAX_OFFER) {
    throw new Error(`Seller offer exceeds maximum (${MAX_OFFER}): ${offer}`);
  }
  if (offer < price_floor) {
    throw new Error(`Seller offer ${offer} is below floor ${price_floor}.`);
  }
}
