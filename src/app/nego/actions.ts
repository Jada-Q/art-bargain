'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function startNegotiation(artworkId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: artwork } = await supabase
    .from('artworks')
    .select('id, seller_id, status')
    .eq('id', artworkId)
    .maybeSingle();
  if (!artwork || artwork.status !== 'live') {
    redirect(`/artwork/${artworkId}`);
  }
  if (artwork.seller_id === user.id) {
    redirect(`/artwork/${artworkId}`);
  }

  // Resume any in-flight nego from this buyer.
  const { data: existing } = await supabase
    .from('negotiations')
    .select('id')
    .eq('artwork_id', artworkId)
    .eq('buyer_id', user.id)
    .eq('status', 'active')
    .maybeSingle();
  if (existing) redirect(`/nego/${existing.id}`);

  const { data: nego, error } = await supabase
    .from('negotiations')
    .insert({
      artwork_id: artworkId,
      buyer_id: user.id,
      mode: 'human_vs_agent',
      status: 'active',
    })
    .select('id')
    .single();
  if (error || !nego) {
    redirect(
      `/artwork/${artworkId}?error=${encodeURIComponent(error?.message ?? 'create_failed')}`,
    );
  }

  redirect(`/nego/${nego.id}`);
}

export async function acceptOffer(negoId: string, agreedPrice: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: 'unauthorized' };

  const admin = createAdminClient();

  const { data: nego } = await admin
    .from('negotiations')
    .select('id, artwork_id, buyer_id, status')
    .eq('id', negoId)
    .single();
  if (!nego || nego.buyer_id !== user.id) {
    return { ok: false as const, error: 'forbidden' };
  }
  if (nego.status !== 'active') {
    return { ok: false as const, error: 'not_active' };
  }

  const { data: artwork } = await admin
    .from('artworks')
    .select('seller_id')
    .eq('id', nego.artwork_id)
    .single();
  if (!artwork) {
    return { ok: false as const, error: 'artwork_missing' };
  }

  await admin
    .from('negotiations')
    .update({
      status: 'accepted',
      final_price: agreedPrice,
      ended_at: new Date().toISOString(),
    })
    .eq('id', negoId);

  await admin.from('orders').insert({
    negotiation_id: negoId,
    artwork_id: nego.artwork_id,
    buyer_id: user.id,
    seller_id: artwork.seller_id,
    agreed_price: agreedPrice,
    status: 'pending',
  });

  await admin.from('artworks').update({ status: 'sold' }).eq('id', nego.artwork_id);

  revalidatePath(`/nego/${negoId}`);
  revalidatePath('/browse');
  return { ok: true as const };
}
