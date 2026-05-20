import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { NegotiationChat, type TurnSnapshot } from '@/components/negotiation-chat';
import { SpectatorView } from '@/components/spectator-view';
import { createClient } from '@/lib/supabase/server';
import { getDict, getLocale } from '@/lib/i18n/server';

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

  const locale = await getLocale();
  const dict = await getDict();
  const tSpec = dict.spectator;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="grid grid-cols-1 gap-10 md:grid-cols-[280px_1fr]">
        <aside className="flex flex-col gap-4">
          <Link
            href={`/artwork/${artwork.id}`}
            className="bg-muted/40 block aspect-square overflow-hidden"
          >
            {artwork.thumb_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={artwork.thumb_url} alt="" className="h-full w-full object-cover" />
            ) : null}
          </Link>
          <div>
            <p className="text-muted-foreground tracking-label text-[10px] uppercase">
              {artwork.category}
            </p>
            <h1 className="font-display mt-2 text-2xl leading-tight">{artwork.title}</h1>
            <p className="text-muted-foreground mt-3 text-[12px]">
              {tSpec.aside_listed_at}{' '}
              <span className="text-foreground">${Number(artwork.price_start).toFixed(0)}</span>
            </p>
          </div>
          <div className="text-muted-foreground tracking-label flex gap-3 text-[10px] uppercase">
            <span>
              {nego.mode === 'agent_vs_agent' ? tSpec.aside_mode_spectator : tSpec.aside_mode_chat}
            </span>
            <span>·</span>
            <span className={nego.status === 'active' ? 'text-foreground' : ''}>{nego.status}</span>
          </div>
        </aside>

        <section>
          {nego.mode === 'agent_vs_agent' ? (
            <SpectatorView
              negotiationId={id}
              initialTurns={turns}
              initialStatus={nego.status}
              priceStart={Number(artwork.price_start)}
              locale={locale}
            />
          ) : (
            <NegotiationChat
              negotiationId={id}
              initialTurns={turns}
              initialStatus={nego.status}
              locale={locale}
            />
          )}
        </section>
      </div>
    </main>
  );
}
