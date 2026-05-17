// Stripe is wired as a stub during Plan A. Real checkout integration arrives in M9 (Plan D).
// We deliberately lazy-init so a missing test-mode key doesn't crash imports at build time —
// callers should themselves throw if the client is required but not configured.

import Stripe from 'stripe';

let _client: Stripe | null = null;

export function getStripe(): Stripe {
  if (_client) return _client;
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error(
      '[stripe] STRIPE_SECRET_KEY is missing. Add a test-mode key to .env.local — see .env.example.',
    );
  }
  _client = new Stripe(key);
  return _client;
}
