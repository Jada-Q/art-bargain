import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ListingForm } from '@/components/listing-form';
import { createClient } from '@/lib/supabase/server';
import { getDict } from '@/lib/i18n/server';
import { createListing } from '../actions';

export default async function NewListingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const dict = await getDict();
  const t = dict.listing_new;
  const fdict = dict.listing_form;

  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <h1 className="font-display text-3xl">{t.title}</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        {t.subtitle_pre}
        <Link href="/listings" className="text-foreground underline">
          {t.subtitle_link}
        </Link>
        {t.subtitle_post}
      </p>

      <div className="mt-8">
        <ListingForm action={createListing} userId={user.id} t={fdict} />
      </div>
    </main>
  );
}
