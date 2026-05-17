import { redirect } from 'next/navigation';
import { ListingForm } from '@/components/listing-form';
import { createClient } from '@/lib/supabase/server';
import { createListing } from '../actions';

export default async function NewListingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <h1 className="text-2xl font-semibold">New listing</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Saved as draft. Publish from <span className="font-mono text-xs">/listings</span> to make it
        browsable.
      </p>

      <div className="mt-8">
        <ListingForm action={createListing} userId={user.id} />
      </div>
    </main>
  );
}
