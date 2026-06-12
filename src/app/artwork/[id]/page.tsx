import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { DispatchModal } from '@/components/dispatch-modal';
import { createClient } from '@/lib/supabase/server';
import { getDict, getLocale } from '@/lib/i18n/server';

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

  const locale = await getLocale();
  const t = (await getDict()).artwork;

  // Same comparable-sales evidence the negotiation agents query before they quote —
  // surfaced to the human so the "anchored by comparable sales" claim is verifiable.
  const { data: comps } = await supabase
    .from('comparable_sales')
    .select('sold_price, sold_at, notes')
    .eq('category', row.category)
    .order('sold_at', { ascending: false })
    .limit(6);

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
                locale={locale}
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

      <ComparableSales comps={comps ?? []} t={t} />
    </main>
  );
}

function ComparableSales({
  comps,
  t,
}: {
  comps: { sold_price: number; sold_at: string; notes: string }[];
  t: {
    comps_title: string;
    comps_subtitle: string;
    comps_empty: string;
    comps_range: string;
    comps_median: string;
    comps_sold: string;
    comps_count: (n: number) => string;
  };
}) {
  const prices = comps.map((c) => Number(c.sold_price)).sort((a, b) => a - b);
  const median = prices.length
    ? prices.length % 2
      ? prices[(prices.length - 1) / 2]
      : Math.round((prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2)
    : 0;

  return (
    <section className="border-border mt-16 border-t pt-10">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl">{t.comps_title}</h2>
          <p className="text-muted-foreground mt-1 text-[12px] leading-relaxed">
            {t.comps_subtitle}
          </p>
        </div>
        {comps.length > 0 && (
          <span className="text-muted-foreground tracking-label shrink-0 text-[10px] uppercase">
            {t.comps_count(comps.length)}
          </span>
        )}
      </div>

      {comps.length === 0 ? (
        <p className="text-muted-foreground mt-6 text-[13px]">{t.comps_empty}</p>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap gap-8">
            <div>
              <p className="text-muted-foreground tracking-label text-[10px] uppercase">
                {t.comps_range}
              </p>
              <p className="font-display mt-1 text-xl">
                ${prices[0].toFixed(0)} – ${prices[prices.length - 1].toFixed(0)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground tracking-label text-[10px] uppercase">
                {t.comps_median}
              </p>
              <p className="font-display mt-1 text-xl">${median.toFixed(0)}</p>
            </div>
          </div>

          <ul className="border-border mt-8 divide-y">
            {comps.map((c, i) => (
              <li key={i} className="flex items-baseline justify-between gap-4 py-3 text-[13px]">
                <span className="text-muted-foreground min-w-0 flex-1 truncate">
                  {c.notes || '—'}
                </span>
                <span className="text-muted-foreground tracking-label hidden text-[10px] uppercase sm:inline">
                  {new Date(c.sold_at).toLocaleDateString('en-CA')}
                </span>
                <span className="font-medium tabular-nums">${Number(c.sold_price).toFixed(0)}</span>
                <span className="text-muted-foreground tracking-label text-[10px] uppercase">
                  {t.comps_sold}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
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
