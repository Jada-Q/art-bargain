import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { logoutAction } from '@/app/(auth)/actions';

export async function SiteNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-border bg-background/85 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="font-display text-base font-medium tracking-tight"
          aria-label="art-bargain home"
        >
          art<span className="text-gallery-accent">·</span>bargain
        </Link>

        <nav className="flex items-center gap-1 text-[12px]">
          <NavLink href="/browse" label="Browse" />
          {user ? <NavLink href="/listings" label="Your works" /> : null}
          {user ? <NavLink href="/listings/new" label="New listing" /> : null}
        </nav>

        <div className="flex items-center gap-3 text-[12px]">
          {user ? (
            <>
              <span
                className="text-muted-foreground tracking-label hidden uppercase sm:inline"
                aria-label="Signed in"
              >
                {user.email?.split('@')[0]?.slice(0, 18)}
              </span>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="text-muted-foreground hover:text-foreground tracking-label uppercase transition-colors"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-muted-foreground hover:text-foreground tracking-label uppercase transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="tracking-label hover:bg-foreground/85 bg-foreground text-background inline-flex h-7 items-center px-3 uppercase transition-colors"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="text-muted-foreground hover:text-foreground tracking-label rounded-sm px-3 py-1 uppercase transition-colors"
    >
      {label}
    </Link>
  );
}
