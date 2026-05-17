import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

const CATEGORIES = ['poster', 'painting', 'photography'] as const;

type SearchParams = { [key: string]: string | string[] | undefined };

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
  let query = supabase
    .from('artworks')
    .select('id, title, category, price_start, thumb_url, image_url, created_at')
    .eq('status', 'live')
    .order('created_at', { ascending: false });

  if (activeCategory) {
    query = query.eq('category', activeCategory);
  }

  const { data: rows, error } = await query;

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <header className="border-border border-b pb-10">
        <p className="text-muted-foreground tracking-label text-[10px] uppercase">
          {activeCategory ? `Category — ${activeCategory}` : 'Open call'}
        </p>
        <div className="mt-4 flex flex-wrap items-baseline justify-between gap-6">
          <h1 className="font-display text-5xl tracking-tight">Browse</h1>
          <p className="text-muted-foreground max-w-xs text-[13px] leading-relaxed">
            Every listing carries an agent. Open one to start a negotiation — chat directly or
            dispatch your own.
          </p>
        </div>

        <nav className="mt-10 flex flex-wrap gap-1 text-[11px]">
          <FilterLink href="/browse" active={!activeCategory} label="All" />
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

      {error ? (
        <p className="text-destructive mt-8 text-sm" role="alert">
          {error.message}
        </p>
      ) : null}

      {!rows || rows.length === 0 ? (
        <p className="text-muted-foreground tracking-label mt-24 text-center text-[12px] uppercase">
          Nothing on view yet.
        </p>
      ) : (
        <div className="mt-12 grid grid-cols-1 gap-x-6 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row, idx) => (
            <ArtworkCard
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
    </main>
  );
}

function ArtworkCard({
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
      <h3 className="font-display group-hover:text-gallery-accent mt-2 text-xl transition-colors">
        {title || 'Untitled'}
      </h3>
    </Link>
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
