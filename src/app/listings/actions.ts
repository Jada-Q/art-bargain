'use server';

import { revalidatePath } from 'next/cache';
import { artworkFormSchema, crossFieldOk, type ArtworkFormInput } from '@/lib/schemas/artwork';
import { createClient } from '@/lib/supabase/server';

export async function createListing(data: ArtworkFormInput) {
  const parsed = artworkFormSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }
  if (!crossFieldOk(parsed.data)) {
    return { ok: false as const, error: 'Floor price must be ≤ start price' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, error: 'Not authenticated' };
  }

  const { data: row, error } = await supabase
    .from('artworks')
    .insert({
      seller_id: user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category,
      price_start: parsed.data.price_start,
      price_floor: parsed.data.price_floor,
      category_meta: parsed.data.category_meta,
      image_url: parsed.data.image_url || null,
      thumb_url: parsed.data.thumb_url || null,
      seller_agent: parsed.data.seller_agent,
      status: 'draft',
    })
    .select('id')
    .single();

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath('/listings');
  return { ok: true as const, preview: parsed.data, id: row.id };
}

export async function publishListing(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('artworks').update({ status: 'live' }).eq('id', id).eq('seller_id', user.id);

  revalidatePath('/listings');
  revalidatePath('/browse');
}

export async function withdrawListing(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('artworks')
    .update({ status: 'withdrawn' })
    .eq('id', id)
    .eq('seller_id', user.id);

  revalidatePath('/listings');
  revalidatePath('/browse');
}
