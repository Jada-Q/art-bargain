import { redirect } from 'next/navigation';
import { ListingForm } from '@/components/listing-form';
import { createClient } from '@/lib/supabase/server';
import { stubListingPreviewAction } from '../actions';

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
        T8 stub — form is wired to a server-side zod validator and logs the parsed payload.
        Persistence + storage upload arrive in T9/T10.
      </p>

      <div className="mt-8">
        <ListingForm action={stubListingPreviewAction} />
      </div>
    </main>
  );
}
