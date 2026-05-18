import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getDict } from '@/lib/i18n/server';

const CATEGORIES = ['poster', 'painting', 'photography'] as const;

const JUST_LISTED_COUNT = 3;
const ALL_WORKS_LIMIT = 24;
const ARCHIVE_LIMIT = 12;

type SearchParams = { [key: string]: string | string[] | undefined };

type LiveRow = {
  id: string;
  title: string;
  category: 'poster' | 'painting' | 'photography';
  price_start: number;
  thumb_url: string | null;
  image_url: string | null;
  created_at: string;
};

type ArchiveRow = {
  id: string;
  category: 'poster' | 'painting' | 'photography';
  sold_price: number;
  sold_at: string;
  notes: string;
  meta: Record<string, unknown>;
};

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const categoryParam = typeof params.category === 'string' ? params.category : null;
  const activeCategory = (CATEGORIES as readonly string[]).includes(categoryParam ?? '')
    ? (categoryParam as (typeof CATEGORIES)[number])
    : null;

  const supabase = await createClient();

  let liveQuery = supabase
    .from('artworks')
    .select('id, title, category, price_start, thumb_url, image_url, created_at')
    .eq('status', 'live')
    .order('created_at', { ascending: false })
    .limit(ALL_WORKS_LIMIT);
  if (activeCategory) liveQuery = liveQuery.eq('category', activeCategory);
  const { data: liveRows, error: liveErr } = await liveQuery;

  let archiveQuery = supabase
    .from('comparable_sales')
    .select('id, category, sold_price, sold_at, notes, meta')
    .order('sold_at', { ascending: false })
    .limit(ARCHIVE_LIMIT);
  if (activeCategory) archiveQuery = archiveQuery.eq('category', activeCategory);
  const { data: archiveRows } = await archiveQuery;

  const { count: totalLive } = await supabase
    .from('artworks')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'live')
    .then((r) => r);

  const { count: totalArchive } = await supabase
    .from('comparable_sales')
    .select('id', { count: 'exact', head: true })
    .then((r) => r);

  const live = (liveRows ?? []) as LiveRow[];
  const archive = (archiveRows ?? []) as ArchiveRow[];

  const justListed = live.slice(0, JUST_LISTED_COUNT);
  const rest = live.slice(JUST_LISTED_COUNT);

  const t = (await getDict()).browse;

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      {/* Header */}
      <header className="border-border border-b pb-10">
        <p className="text-muted-foreground tracking-label text-[10px] uppercase">
          {activeCategory ? t.eyebrow_filtered(activeCategory) : t.eyebrow_open}
        </p>
        <div className="mt-4 flex flex-wrap items-baseline justify-between gap-6">
          <h1 className="font-display text-5xl tracking-tight">{t.title}</h1>
          <p className="text-muted-foreground max-w-xs text-[13px] leading-relaxed">{t.intro}</p>
        </div>

        {/* Filter pills */}
        <nav className="mt-10 flex flex-wrap gap-1 text-[11px]">
          <FilterLink href="/browse" active={!activeCategory} label={t.filter_all} />
          {CATEGORIES.map((c) => (
            <FilterLink
              key={c}
              href={`/browse?category=${c}`}
              active={activeCategory === c}
              label={c}
            />
          ))}
        </nav>
      </header>

      {liveErr ? (
        <p className="text-destructive mt-8 text-sm" role="alert">
          {liveErr.message}
        </p>
      ) : null}

      {/* JUST LISTED — feature row */}
      <section className="mt-16">
        <SectionHeader
          eyebrow={t.just_listed_eyebrow}
          title={t.just_listed_title}
          right={
            <span className="text-muted-foreground tracking-label text-[10px] uppercase">
              {t.just_listed_count(totalLive ?? 0)}
            </span>
          }
        />
        {justListed.length === 0 ? (
          <EmptyHero
            labelFiltered={activeCategory ? t.empty_filtered(activeCategory) : t.empty_all}
            bodyFiltered={activeCategory ? t.empty_body_filtered : t.empty_body_all}
          />
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {justListed.map((row, idx) => (
              <FeatureCard
                key={row.id}
                index={idx + 1}
                id={row.id}
                title={row.title}
                category={row.category}
                priceStart={Number(row.price_start)}
                thumbUrl={row.thumb_url}
              />
            ))}
          </div>
        )}
      </section>

      {/* ALL WORKS — uniform 3-col grid */}
      {rest.length > 0 ? (
        <section className="mt-20">
          <SectionHeader eyebrow={t.all_works_eyebrow} title={t.all_works_title} />
          <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-14 sm:grid-cols-3 lg:grid-cols-4">
            {rest.map((row, idx) => (
              <GridCard
                key={row.id}
                index={JUST_LISTED_COUNT + idx + 1}
                id={row.id}
                title={row.title}
                category={row.category}
                priceStart={Number(row.price_start)}
                thumbUrl={row.thumb_url}
              />
            ))}
          </div>
          {(totalLive ?? 0) > ALL_WORKS_LIMIT ? (
            <div className="mt-12 flex justify-center">
              <p className="text-muted-foreground tracking-label text-[11px] uppercase">
                Showing {ALL_WORKS_LIMIT} of {totalLive}. Pagination arrives in Plan D.
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* THE ARCHIVE — comparable_sales (no image; typographic) */}
      {archive.length > 0 ? (
        <section className="border-border mt-24 border-t pt-16">
          <SectionHeader
            eyebrow={t.archive_eyebrow}
            title={t.archive_title}
            right={
              <span className="text-muted-foreground tracking-label text-[10px] uppercase">
                {t.archive_count(totalArchive ?? 0)}
              </span>
            }
            subtitle={t.archive_subtitle}
          />
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {archive.map((row) => (
              <ArchiveCard
                key={row.id}
                category={row.category}
                soldPrice={Number(row.sold_price)}
                soldAt={row.sold_at}
                notes={row.notes}
                meta={row.meta}
              />
            ))}
          </div>
          {(totalArchive ?? 0) > ARCHIVE_LIMIT ? (
            <p className="text-muted-foreground tracking-label mt-10 text-center text-[10px] uppercase">
              Showing {ARCHIVE_LIMIT} of {totalArchive} archive entries
            </p>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}

function SectionHeader({
  eyebrow,
  title,
  subtitle,
  right,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-gallery-accent tracking-label text-[10px] uppercase">{eyebrow}</p>
        <h2 className="font-display mt-2 text-3xl tracking-tight">{title}</h2>
        {subtitle ? (
          <p className="text-muted-foreground mt-3 max-w-md text-[13px] leading-relaxed">
            {subtitle}
          </p>
        ) : null}
      </div>
      {right}
    </div>
  );
}

function FeatureCard({
  index,
  id,
  title,
  category,
  priceStart,
  thumbUrl,
}: {
  index: number;
  id: string;
  title: string;
  category: string;
  priceStart: number;
  thumbUrl: string | null;
}) {
  const idx = String(index).padStart(3, '0');
  return (
    <Link href={`/artwork/${id}`} className="group block">
      <div className="bg-muted/40 aspect-[4/5] w-full overflow-hidden">
        {thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbUrl}
            alt=""
            className="h-full w-full object-cover transition-opacity duration-500 group-hover:opacity-90"
          />
        ) : (
          <div className="bg-muted h-full w-full" />
        )}
      </div>
      <div className="mt-4 flex items-baseline justify-between">
        <p className="text-muted-foreground tracking-label text-[10px] uppercase">
          № {idx} · {category}
        </p>
        <p className="text-[12px]">${priceStart.toFixed(0)}</p>
      </div>
      <h3 className="font-display group-hover:text-gallery-accent mt-2 text-xl leading-snug transition-colors">
        {title || 'Untitled'}
      </h3>
    </Link>
  );
}

function GridCard({
  index,
  id,
  title,
  category,
  priceStart,
  thumbUrl,
}: {
  index: number;
  id: string;
  title: string;
  category: string;
  priceStart: number;
  thumbUrl: string | null;
}) {
  const idx = String(index).padStart(3, '0');
  return (
    <Link href={`/artwork/${id}`} className="group block">
      <div className="bg-muted/40 aspect-[4/5] w-full overflow-hidden">
        {thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbUrl}
            alt=""
            className="h-full w-full object-cover transition-opacity duration-500 group-hover:opacity-90"
          />
        ) : (
          <div className="bg-muted h-full w-full" />
        )}
      </div>
      <div className="mt-3 flex items-baseline justify-between">
        <p className="text-muted-foreground tracking-label text-[10px] uppercase">№ {idx}</p>
        <p className="text-[11px]">${priceStart.toFixed(0)}</p>
      </div>
      <h3 className="group-hover:text-gallery-accent font-display mt-1 text-base leading-snug transition-colors">
        {title || 'Untitled'}
      </h3>
      <p className="text-muted-foreground tracking-label mt-1 text-[10px] uppercase">{category}</p>
    </Link>
  );
}

function ArchiveCard({
  category,
  soldPrice,
  soldAt,
  notes,
  meta,
}: {
  category: string;
  soldPrice: number;
  soldAt: string;
  notes: string;
  meta: Record<string, unknown>;
}) {
  const metaLine = formatMetaLine(category, meta);
  return (
    <article className="border-border bg-background border p-6">
      <header className="flex items-baseline justify-between gap-3">
        <p className="text-muted-foreground tracking-label text-[10px] uppercase">
          {category} · {soldAt}
        </p>
        <p className="font-display text-2xl">${soldPrice.toFixed(0)}</p>
      </header>
      {metaLine ? (
        <p className="text-foreground mt-5 text-[13px] leading-snug">{metaLine}</p>
      ) : null}
      <p className="text-muted-foreground mt-3 text-[12px] leading-relaxed italic">{notes}</p>
    </article>
  );
}

function formatMetaLine(category: string, meta: Record<string, unknown>): string {
  if (category === 'poster') {
    const size = meta.size as string | undefined;
    const printRun = meta.print_run as number | undefined;
    const signed = meta.signed as boolean | undefined;
    return [size, printRun ? `edition /${printRun}` : null, signed ? 'signed' : null]
      .filter(Boolean)
      .join(' · ');
  }
  if (category === 'painting') {
    const medium = (meta.medium as string | undefined)?.replace('_', ' ');
    const w = meta.width_cm as number | undefined;
    const h = meta.height_cm as number | undefined;
    return [medium, w && h ? `${w} × ${h} cm` : null].filter(Boolean).join(' · ');
  }
  if (category === 'photography') {
    const size = meta.print_size as string | undefined;
    const paper = (meta.paper as string | undefined)?.replace('_', ' ');
    const ed = meta.edition_size as number | null | undefined;
    return [size, paper, ed ? `edition /${ed}` : ed === null ? 'open edition' : null]
      .filter(Boolean)
      .join(' · ');
  }
  return '';
}

function EmptyHero({
  labelFiltered,
  bodyFiltered,
}: {
  labelFiltered: string;
  bodyFiltered: string;
}) {
  return (
    <div className="border-border bg-muted/30 mt-8 flex flex-col items-center justify-center border px-6 py-24 text-center">
      <p className="text-muted-foreground tracking-label text-[11px] uppercase">{labelFiltered}</p>
      <p className="text-muted-foreground mt-4 max-w-sm text-[13px] leading-relaxed">
        {bodyFiltered}
      </p>
    </div>
  );
}

function FilterLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={
        'tracking-label border-b border-transparent px-3 py-2 uppercase transition-colors ' +
        (active
          ? 'border-foreground text-foreground'
          : 'text-muted-foreground hover:border-border hover:text-foreground')
      }
    >
      {label}
    </Link>
  );
}
