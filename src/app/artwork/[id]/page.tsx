import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { DispatchModal } from '@/components/dispatch-modal';
import { createClient } from '@/lib/supabase/server';

type Params = Promise<{ id: string }>;

export default async function ArtworkDetailPage({ params }: { params: Params }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: row, error } = await supabase
    .from('artworks')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !row) notFound();

  // RLS already filters non-live unless you're the owner, but double-check for safety.
  const isOwner = user?.id === row.seller_id;
  if (row.status !== 'live' && !isOwner) notFound();

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div>
          {row.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={row.image_url}
              alt={row.title}
              className="aspect-square w-full rounded-lg object-cover"
            />
          ) : (
            <div className="bg-muted aspect-square w-full rounded-lg" />
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{row.title}</h1>
            <Badge variant="secondary">{row.category}</Badge>
          </div>

          <p className="text-3xl font-medium">${Number(row.price_start).toFixed(0)}</p>

          {row.description ? (
            <p className="text-muted-foreground text-sm whitespace-pre-wrap">{row.description}</p>
          ) : null}

          <CategoryMeta category={row.category} meta={row.category_meta} />

          {isOwner ? (
            <div className="bg-muted/50 mt-4 rounded-md border p-3 text-xs">
              This is your listing — status: <span className="font-medium">{row.status}</span>
            </div>
          ) : user ? (
            <div className="mt-4 flex flex-col gap-2">
              <DispatchModal artworkId={row.id} priceStart={Number(row.price_start)} />
              <p className="text-muted-foreground text-xs">
                Chat yourself or dispatch an agent. Anchored by comparable-sales RAG.
              </p>
            </div>
          ) : (
            <div className="mt-4 flex flex-col gap-2">
              <Link href="/login" className={buttonVariants() + ' w-full text-center'}>
                Log in to negotiate
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function CategoryMeta({ category, meta }: { category: string; meta: unknown }) {
  if (!meta || typeof meta !== 'object') return null;
  const m = meta as Record<string, unknown>;

  const rows: [string, string][] = [];
  if (category === 'poster') {
    if (m.size) rows.push(['Size', String(m.size)]);
    if (m.print_run) rows.push(['Print run', `/${m.print_run}`]);
    if (m.signed) rows.push(['Signed', 'Yes']);
    if (m.edition_no) rows.push(['Edition no.', String(m.edition_no)]);
  } else if (category === 'painting') {
    if (m.medium) rows.push(['Medium', String(m.medium).replace('_', ' ')]);
    if (m.width_cm && m.height_cm) rows.push(['Size', `${m.width_cm} × ${m.height_cm} cm`]);
  } else if (category === 'photography') {
    if (m.print_size) rows.push(['Print size', String(m.print_size)]);
    if (m.paper) rows.push(['Paper', String(m.paper).replace('_', ' ')]);
    if (m.edition_size != null) rows.push(['Edition', `/${m.edition_size}`]);
    else rows.push(['Edition', 'Open']);
  }

  if (rows.length === 0) return null;
  return (
    <dl className="text-muted-foreground mt-2 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-xs">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt>{k}</dt>
          <dd className="text-foreground">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
