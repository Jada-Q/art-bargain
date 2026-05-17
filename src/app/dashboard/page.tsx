import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import { logoutAction } from '../(auth)/actions';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <form action={logoutAction}>
          <Button type="submit" variant="outline" size="sm">
            Log out
          </Button>
        </form>
      </header>

      <section className="mt-8 rounded-lg border p-6">
        <p className="text-sm">
          Signed in as <span className="font-medium">{user.email}</span>
        </p>
        <p className="text-muted-foreground mt-2 text-xs">User id: {user.id}</p>
      </section>

      <section className="mt-8">
        <Link
          href="/listings/new"
          className="inline-flex h-9 items-center rounded-md border px-3 text-sm"
        >
          New listing (T8 stub)
        </Link>
      </section>

      <section className="text-muted-foreground mt-8 text-sm">
        <p>Coming up in Plan A:</p>
        <ul className="mt-2 list-disc pl-5">
          <li>T9 — image upload</li>
          <li>T10 — publish / withdraw actions</li>
          <li>T11/T12 — browse and detail pages</li>
        </ul>
      </section>
    </main>
  );
}
