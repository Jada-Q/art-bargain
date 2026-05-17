import Link from 'next/link';
import { notFound } from 'next/navigation';
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

  const isOwner = user?.id === row.seller_id;
  if (row.status !== 'live' && !isOwner) notFound();

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <div className="grid grid-cols-1 gap-12 md:grid-cols-12">
        <figure className="md:col-span-7">
          <div className="bg-muted/40 aspect-square w-full overflow-hidden">
            {row.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={row.image_url} alt={row.title} className="h-full w-full object-cover" />
            ) : (
              <div className="bg-muted h-full w-full" />
            )}
          </div>
          <figcaption className="text-muted-foreground tracking-label mt-4 text-[10px] uppercase">
            № {row.id.slice(0, 8)} · {row.category}
          </figcaption>
        </figure>

        <div className="flex flex-col md:col-span-5">
          <p className="text-muted-foreground tracking-label text-[10px] uppercase">On view</p>
          <h1 className="font-display mt-4 text-4xl leading-tight text-balance">{row.title}</h1>

          <p className="font-display mt-6 text-3xl">${Number(row.price_start).toFixed(0)}</p>
          <p className="text-muted-foreground tracking-label mt-1 text-[10px] uppercase">
            Listed start price
          </p>

          {row.description ? (
            <p className="text-muted-foreground mt-8 text-[13px] leading-relaxed whitespace-pre-wrap">
              {row.description}
            </p>
          ) : null}

          <CategoryMeta category={row.category} meta={row.category_meta} />

          <hr className="border-border my-8" />

          {isOwner ? (
            <div className="border-border bg-muted/40 border p-4 text-[12px]">
              <p className="tracking-label text-muted-foreground uppercase">This is your listing</p>
              <p className="mt-2">
                Status: <span className="font-medium">{row.status}</span>
              </p>
              <Link
                href="/listings"
                className="text-foreground mt-3 inline-block text-[12px] underline underline-offset-[6px]"
              >
                Manage in your works →
              </Link>
            </div>
          ) : user ? (
            <div className="flex flex-col gap-3">
              <DispatchModal artworkId={row.id} priceStart={Number(row.price_start)} />
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Chat the seller&apos;s agent yourself, or dispatch a buyer agent and watch them
                negotiate. Anchored by comparable sales from our database.
              </p>
            </div>
          ) : (
            <Link
              href="/login"
              className="bg-foreground tracking-label hover:bg-foreground/85 text-background inline-flex h-11 items-center justify-center px-6 text-[12px] uppercase transition-colors"
            >
              Sign in to negotiate
            </Link>
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
    <dl className="mt-8 grid grid-cols-[max-content_1fr] gap-x-8 gap-y-2 text-[12px]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted-foreground tracking-label uppercase">{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}
