import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import { getDict } from '@/lib/i18n/server';
import { logoutAction } from '../(auth)/actions';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const t = (await getDict()).dashboard;

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-3xl">{t.title}</h1>
        <form action={logoutAction}>
          <Button type="submit" variant="outline" size="sm">
            {t.log_out}
          </Button>
        </form>
      </header>

      <section className="border-border mt-8 border p-6">
        <p className="text-sm">
          {t.signed_in_as} <span className="font-medium">{user.email}</span>
        </p>
        <p className="text-muted-foreground mt-2 text-xs">
          {t.user_id}: {user.id}
        </p>
      </section>

      <section className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/listings/new"
          className="hover:bg-muted inline-flex h-9 items-center border px-3 text-sm"
        >
          {t.new_listing}
        </Link>
        <Link
          href="/listings"
          className="hover:bg-muted inline-flex h-9 items-center border px-3 text-sm"
        >
          {t.my_listings}
        </Link>
        <Link
          href="/browse"
          className="hover:bg-muted inline-flex h-9 items-center border px-3 text-sm"
        >
          {t.browse}
        </Link>
      </section>

      <section className="text-muted-foreground mt-8 text-sm">
        <p>{t.coming_eyebrow}</p>
        <ul className="mt-2 list-disc pl-5">
          <li>{t.coming_b1}</li>
          <li>{t.coming_b2}</li>
          <li>{t.coming_b3}</li>
        </ul>
      </section>
    </main>
  );
}
