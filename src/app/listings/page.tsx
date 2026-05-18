import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { getDict } from '@/lib/i18n/server';
import { publishListing, withdrawListing } from './actions';

export default async function MyListingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const t = (await getDict()).listings;

  const { data: rows, error } = await supabase
    .from('artworks')
    .select('id, title, category, price_start, status, thumb_url, created_at')
    .eq('seller_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-3xl">{t.title}</h1>
        <Link href="/listings/new" className={buttonVariants()}>
          {t.new_listing}
        </Link>
      </header>

      {error ? (
        <p className="text-destructive mt-6 text-sm" role="alert">
          {error.message}
        </p>
      ) : null}

      {!rows || rows.length === 0 ? (
        <p className="text-muted-foreground mt-8 text-sm">
          {t.no_listings}{' '}
          <Link href="/listings/new" className="underline">
            {t.create_one}
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {rows.map((row) => (
            <li key={row.id} className="border-border flex items-center gap-4 border p-3">
              {row.thumb_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={row.thumb_url} alt="" className="h-16 w-16 object-cover" />
              ) : (
                <div className="bg-muted h-16 w-16" />
              )}
              <div className="flex-1">
                <Link
                  href={`/artwork/${row.id}`}
                  className="font-display text-base hover:underline"
                >
                  {row.title || t.untitled}
                </Link>
                <p className="text-muted-foreground mt-1 text-xs">
                  {row.category} · ${Number(row.price_start).toFixed(0)} ·{' '}
                  <StatusBadge status={row.status} />
                </p>
              </div>
              <div className="flex gap-2">
                {row.status === 'live' ? (
                  <form action={withdrawListing.bind(null, row.id)}>
                    <Button size="sm" variant="outline" type="submit">
                      {t.withdraw}
                    </Button>
                  </form>
                ) : row.status === 'draft' || row.status === 'withdrawn' ? (
                  <form action={publishListing.bind(null, row.id)}>
                    <Button size="sm" type="submit">
                      {row.status === 'withdrawn' ? t.republish : t.publish}
                    </Button>
                  </form>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant={status === 'live' ? 'default' : status === 'sold' ? 'secondary' : 'destructive'}
      className="ml-1"
    >
      {status}
    </Badge>
  );
}
