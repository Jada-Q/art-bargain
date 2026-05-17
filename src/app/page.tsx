import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col justify-center px-6 py-12">
      <h1 className="text-4xl font-semibold tracking-tight">art-bargain</h1>
      <p className="text-muted-foreground mt-3 max-w-md text-balance">
        A multi-category art marketplace where every listing carries an LLM negotiation agent.
        Negotiate yourself or dispatch your own agent.
      </p>

      <div className="mt-8 flex gap-3">
        <Link href="/browse" className={buttonVariants()}>
          Browse
        </Link>
        {user ? (
          <Link href="/dashboard" className={buttonVariants({ variant: 'outline' })}>
            Dashboard
          </Link>
        ) : (
          <>
            <Link href="/signup" className={buttonVariants({ variant: 'outline' })}>
              Sign up
            </Link>
            <Link href="/login" className={buttonVariants({ variant: 'outline' })}>
              Log in
            </Link>
          </>
        )}
      </div>

      <p className="text-muted-foreground mt-12 text-xs">
        Plan A foundation · auth wired · listings, agents, and negotiation arrive in subsequent
        plans.
      </p>
    </main>
  );
}
