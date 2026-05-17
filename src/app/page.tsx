import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { count: liveCount } = await supabase
    .from('artworks')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'live');

  return (
    <main className="mx-auto max-w-6xl px-6">
      {/* Hero */}
      <section className="grid min-h-[calc(100svh-3.5rem)] grid-cols-1 items-center gap-12 py-20 md:grid-cols-12">
        <div className="md:col-span-7">
          <p className="text-muted-foreground tracking-label text-[11px] uppercase">
            Vol. I · Negotiated commerce
          </p>
          <h1 className="font-display mt-6 text-[clamp(2.75rem,6vw,5.5rem)] leading-[1.02] font-medium tracking-tight text-balance">
            Every listing carries{' '}
            <em className="text-gallery-accent font-medium not-italic">an agent</em> that argues for
            you.
          </h1>
          <p className="text-muted-foreground mt-8 max-w-md text-[15px] leading-relaxed">
            Posters, paintings, photography. Chat with the seller&apos;s LLM directly — or dispatch
            your own and watch the two negotiate. Every offer is anchored by comparable sales from
            the room next door.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-6">
            <Link
              href="/browse"
              className="bg-foreground tracking-label hover:bg-foreground/85 text-background inline-flex h-11 items-center px-7 text-[12px] uppercase transition-colors"
            >
              Enter the gallery
            </Link>
            {user ? (
              <Link
                href="/listings/new"
                className="tracking-label text-foreground hover:text-gallery-accent text-[12px] uppercase underline-offset-[6px] transition-colors hover:underline"
              >
                List a work →
              </Link>
            ) : (
              <Link
                href="/signup"
                className="tracking-label text-foreground hover:text-gallery-accent text-[12px] uppercase underline-offset-[6px] transition-colors hover:underline"
              >
                Open an account →
              </Link>
            )}
          </div>
        </div>

        <aside className="md:col-span-5">
          <div className="border-border border p-8 md:p-10">
            <p className="text-muted-foreground tracking-label text-[10px] uppercase">
              Now on view
            </p>
            <p className="font-display mt-3 text-5xl">{liveCount ?? 0}</p>
            <p className="text-muted-foreground mt-1 text-[12px]">live listings</p>

            <hr className="border-border my-6" />

            <dl className="grid grid-cols-3 gap-4 text-[11px]">
              <Stat label="Categories" value="3" />
              <Stat label="Anchor data" value="45" />
              <Stat label="Turn cap" value="20" />
            </dl>

            <hr className="border-border my-6" />

            <p className="text-muted-foreground text-[12px] leading-relaxed italic">
              &ldquo;You don&apos;t know how to haggle, but you can let an agent do it — and watch
              it argue with another agent.&rdquo;
            </p>
          </div>
        </aside>
      </section>

      {/* Editorial strip */}
      <section className="border-border border-t py-16">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
          <Block
            n="I"
            title="Browse the gallery"
            body="Posters, paintings, photography — filtered by category, anchored by recent comparable sales."
          />
          <Block
            n="II"
            title="Open a negotiation"
            body="Type your counter, or set a target / ceiling and dispatch a buyer agent. Anti-cheese rules keep both sides honest."
          />
          <Block
            n="III"
            title="Watch them converge"
            body="Two streams, one progress bar. The negotiation ends in accept, reject, stall — or a system mediation at the median."
          />
        </div>
      </section>

      <footer className="border-border text-muted-foreground tracking-label mt-16 border-t py-10 text-[10px] uppercase">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <span>art-bargain · technical demonstration · 2026</span>
          <span>Claude Sonnet 4.6 · Supabase · Next.js 16</span>
        </div>
      </footer>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dd className="font-display text-2xl leading-none">{value}</dd>
      <dt className="text-muted-foreground tracking-label mt-1 uppercase">{label}</dt>
    </div>
  );
}

function Block({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div>
      <p className="text-gallery-accent tracking-label text-[10px] uppercase">{n}</p>
      <h3 className="font-display mt-3 text-2xl">{title}</h3>
      <p className="text-muted-foreground mt-3 text-[13px] leading-relaxed">{body}</p>
    </div>
  );
}
