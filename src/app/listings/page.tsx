import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { publishListing, withdrawListing } from './actions';

export default async function MyListingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: rows, error } = await supabase
    .from('artworks')
    .select('id, title, category, price_start, status, thumb_url, created_at')
    .eq('seller_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My listings</h1>
        <Link href="/listings/new" className={buttonVariants()}>
          New listing
        </Link>
      </header>

      {error ? (
        <p className="text-destructive mt-6 text-sm" role="alert">
          {error.message}
        </p>
      ) : null}

      {!rows || rows.length === 0 ? (
        <p className="text-muted-foreground mt-8 text-sm">
          No listings yet.{' '}
          <Link href="/listings/new" className="underline">
            Create one
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center gap-4 rounded-lg border p-3">
              {row.thumb_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={row.thumb_url} alt="" className="h-16 w-16 rounded object-cover" />
              ) : (
                <div className="bg-muted h-16 w-16 rounded" />
              )}
              <div className="flex-1">
                <Link href={`/artwork/${row.id}`} className="font-medium hover:underline">
                  {row.title || '(untitled)'}
                </Link>
                <p className="text-muted-foreground mt-1 text-xs">
                  {row.category} · ${Number(row.price_start).toFixed(0)} ·{' '}
                  <StatusBadge status={row.status} />
                </p>
              </div>
              <div className="flex gap-2">
                {row.status === 'draft' ? (
                  <form action={publishListing.bind(null, row.id)}>
                    <Button size="sm" type="submit">
                      Publish
                    </Button>
                  </form>
                ) : row.status === 'live' ? (
                  <form action={withdrawListing.bind(null, row.id)}>
                    <Button size="sm" variant="outline" type="submit">
                      Withdraw
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
