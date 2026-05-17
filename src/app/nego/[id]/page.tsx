import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { NegotiationChat, type TurnSnapshot } from '@/components/negotiation-chat';
import { createClient } from '@/lib/supabase/server';

type Params = Promise<{ id: string }>;

export default async function NegotiationPage({ params }: { params: Params }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: nego } = await supabase
    .from('negotiations')
    .select('id, artwork_id, buyer_id, status, mode')
    .eq('id', id)
    .maybeSingle();
  if (!nego) notFound();
  if (nego.buyer_id !== user.id) notFound();

  const { data: artwork } = await supabase
    .from('artworks')
    .select('id, title, category, price_start, thumb_url')
    .eq('id', nego.artwork_id)
    .maybeSingle();
  if (!artwork) notFound();

  const { data: turnRows } = await supabase
    .from('negotiation_turns')
    .select('id, turn_no, speaker, message, offer_price')
    .eq('negotiation_id', id)
    .order('turn_no', { ascending: true });

  const turns: TurnSnapshot[] = (turnRows ?? []).map((t) => ({
    id: t.id,
    turn_no: t.turn_no,
    speaker: t.speaker as TurnSnapshot['speaker'],
    message: t.message,
    offer_price: t.offer_price === null ? null : Number(t.offer_price),
  }));

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[280px_1fr]">
        <aside className="flex flex-col gap-3">
          <Link href={`/artwork/${artwork.id}`} className="block overflow-hidden rounded-lg border">
            {artwork.thumb_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={artwork.thumb_url} alt="" className="aspect-square w-full object-cover" />
            ) : (
              <div className="bg-muted aspect-square w-full" />
            )}
          </Link>
          <div>
            <h1 className="text-base font-medium">{artwork.title}</h1>
            <p className="text-muted-foreground mt-1 text-xs">
              Listed at{' '}
              <span className="text-foreground">${Number(artwork.price_start).toFixed(0)}</span>
            </p>
            <div className="mt-2 flex gap-2 text-xs">
              <Badge variant="secondary">{artwork.category}</Badge>
              <Badge variant={nego.status === 'active' ? 'default' : 'secondary'}>
                {nego.status}
              </Badge>
            </div>
          </div>
        </aside>

        <NegotiationChat negotiationId={id} initialTurns={turns} initialStatus={nego.status} />
      </div>
    </main>
  );
}
