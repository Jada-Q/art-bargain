import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <main className="mx-auto max-w-5xl px-6 py-12">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Browse</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Every listing carries an agent. Open one to start a negotiation.
        </p>
      </header>

      <nav className="mt-6 flex flex-wrap gap-2">
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

      {error ? (
        <p className="text-destructive mt-6 text-sm" role="alert">
          {error.message}
        </p>
      ) : null}

      {!rows || rows.length === 0 ? (
        <p className="text-muted-foreground mt-12 text-sm">No listings yet.</p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => (
            <Link key={row.id} href={`/artwork/${row.id}`} className="block">
              <Card className="overflow-hidden transition-shadow hover:shadow-md">
                {row.thumb_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={row.thumb_url} alt="" className="aspect-square w-full object-cover" />
                ) : (
                  <div className="bg-muted aspect-square w-full" />
                )}
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{row.title || '(untitled)'}</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between pb-4">
                  <Badge variant="secondary">{row.category}</Badge>
                  <span className="text-sm font-medium">${Number(row.price_start).toFixed(0)}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

function FilterLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={
        'rounded-full border px-3 py-1 text-xs ' +
        (active
          ? 'bg-foreground text-background border-foreground'
          : 'bg-background hover:bg-muted')
      }
    >
      {label}
    </Link>
  );
}
