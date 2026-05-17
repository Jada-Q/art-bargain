'use server';

import { artworkFormSchema, crossFieldOk, type ArtworkFormInput } from '@/lib/schemas/artwork';

// Stub action for T8. Real persistence wires in T10 (createListing).
export async function stubListingPreviewAction(data: ArtworkFormInput) {
  const parsed = artworkFormSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }
  if (!crossFieldOk(parsed.data)) {
    return { ok: false as const, error: 'Floor price must be ≤ start price' };
  }

  // Log server-side so we can confirm the round-trip while developing.
  console.log('[stub-listing] received', JSON.stringify(parsed.data, null, 2));

  return { ok: true as const, preview: parsed.data };
}
