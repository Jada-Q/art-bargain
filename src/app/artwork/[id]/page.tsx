import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { DispatchModal } from '@/components/dispatch-modal';
import { createClient } from '@/lib/supabase/server';
import { getDict } from '@/lib/i18n/server';

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

  const dict = await getDict();
  const t = dict.artwork;

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
          <p className="text-muted-foreground tracking-label text-[10px] uppercase">
            {t.eyebrow_onview}
          </p>
          <h1 className="font-display mt-4 text-4xl leading-tight text-balance">{row.title}</h1>

          <p className="font-display mt-6 text-3xl">${Number(row.price_start).toFixed(0)}</p>
          <p className="text-muted-foreground tracking-label mt-1 text-[10px] uppercase">
            {t.listed_start_price}
          </p>

          {row.description ? (
            <p className="text-muted-foreground mt-8 text-[13px] leading-relaxed whitespace-pre-wrap">
              {row.description}
            </p>
          ) : null}

          <CategoryMeta category={row.category} meta={row.category_meta} t={t} />

          <hr className="border-border my-8" />

          {isOwner ? (
            <div className="border-border bg-muted/40 border p-4 text-[12px]">
              <p className="tracking-label text-muted-foreground uppercase">{t.your_listing}</p>
              <p className="mt-2">
                {t.status}: <span className="font-medium">{row.status}</span>
              </p>
              <Link
                href="/listings"
                className="text-foreground mt-3 inline-block text-[12px] underline underline-offset-[6px]"
              >
                {t.manage_link}
              </Link>
            </div>
          ) : user ? (
            <div className="flex flex-col gap-3">
              <DispatchModal
                artworkId={row.id}
                priceStart={Number(row.price_start)}
                t={dict.dispatch}
              />
              <p className="text-muted-foreground text-[11px] leading-relaxed">{t.cta_hint}</p>
            </div>
          ) : (
            <Link
              href="/login"
              className="bg-foreground tracking-label hover:bg-foreground/85 text-background inline-flex h-11 items-center justify-center px-6 text-[12px] uppercase transition-colors"
            >
              {t.cta_signin}
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}

function CategoryMeta({
  category,
  meta,
  t,
}: {
  category: string;
  meta: unknown;
  t: {
    meta_size: string;
    meta_print_run: string;
    meta_signed: string;
    meta_edition_no: string;
    meta_medium: string;
    meta_print_size: string;
    meta_paper: string;
    meta_edition: string;
    meta_edition_open: string;
    meta_yes: string;
  };
}) {
  if (!meta || typeof meta !== 'object') return null;
  const m = meta as Record<string, unknown>;

  const rows: [string, string][] = [];
  if (category === 'poster') {
    if (m.size) rows.push([t.meta_size, String(m.size)]);
    if (m.print_run) rows.push([t.meta_print_run, `/${m.print_run}`]);
    if (m.signed) rows.push([t.meta_signed, t.meta_yes]);
    if (m.edition_no) rows.push([t.meta_edition_no, String(m.edition_no)]);
  } else if (category === 'painting') {
    if (m.medium) rows.push([t.meta_medium, String(m.medium).replace('_', ' ')]);
    if (m.width_cm && m.height_cm) rows.push([t.meta_size, `${m.width_cm} × ${m.height_cm} cm`]);
  } else if (category === 'photography') {
    if (m.print_size) rows.push([t.meta_print_size, String(m.print_size)]);
    if (m.paper) rows.push([t.meta_paper, String(m.paper).replace('_', ' ')]);
    if (m.edition_size != null) rows.push([t.meta_edition, `/${m.edition_size}`]);
    else rows.push([t.meta_edition, t.meta_edition_open]);
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
