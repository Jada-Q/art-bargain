import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getDict } from '@/lib/i18n/server';

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { count: liveCount } = await supabase
    .from('artworks')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'live');

  const t = (await getDict()).home;

  return (
    <main className="mx-auto max-w-6xl px-6">
      {/* Hero */}
      <section className="grid min-h-[calc(100svh-3.5rem)] grid-cols-1 items-center gap-12 py-20 md:grid-cols-12">
        <div className="md:col-span-7">
          <p className="text-muted-foreground tracking-label text-[11px] uppercase">{t.eyebrow}</p>
          <h1 className="font-display mt-6 text-[clamp(2.75rem,6vw,5.5rem)] leading-[1.02] font-medium tracking-tight text-balance">
            {t.headline_pre}
            <em className="text-gallery-accent font-medium not-italic">{t.headline_accent}</em>
            {t.headline_post}
          </h1>
          <p className="text-muted-foreground mt-8 max-w-md text-[15px] leading-relaxed">
            {t.body}
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-6">
            <Link
              href="/browse"
              className="bg-foreground tracking-label hover:bg-foreground/85 text-background inline-flex h-11 items-center px-7 text-[12px] uppercase transition-colors"
            >
              {t.cta_browse}
            </Link>
            {user ? (
              <Link
                href="/listings/new"
                className="tracking-label text-foreground hover:text-gallery-accent text-[12px] uppercase underline-offset-[6px] transition-colors hover:underline"
              >
                {t.cta_list}
              </Link>
            ) : (
              <Link
                href="/signup"
                className="tracking-label text-foreground hover:text-gallery-accent text-[12px] uppercase underline-offset-[6px] transition-colors hover:underline"
              >
                {t.cta_signup}
              </Link>
            )}
          </div>
        </div>

        <aside className="md:col-span-5">
          <div className="border-border border p-8 md:p-10">
            <p className="text-muted-foreground tracking-label text-[10px] uppercase">
              {t.nowOnView}
            </p>
            <p className="font-display mt-3 text-5xl">{liveCount ?? 0}</p>
            <p className="text-muted-foreground mt-1 text-[12px]">{t.liveListings}</p>

            <hr className="border-border my-6" />

            <dl className="grid grid-cols-3 gap-4 text-[11px]">
              <Stat label={t.categories} value="3" />
              <Stat label={t.anchorData} value="45" />
              <Stat label={t.turnCap} value="20" />
            </dl>

            <hr className="border-border my-6" />

            <p className="text-muted-foreground text-[12px] leading-relaxed italic">
              {t.pullquote}
            </p>
          </div>
        </aside>
      </section>

      {/* Editorial strip */}
      <section className="border-border border-t py-16">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
          <Block n="I" title={t.section_browse_title} body={t.section_browse_body} />
          <Block n="II" title={t.section_nego_title} body={t.section_nego_body} />
          <Block n="III" title={t.section_watch_title} body={t.section_watch_body} />
        </div>
      </section>

      <footer className="border-border text-muted-foreground tracking-label mt-16 border-t py-10 text-[10px] uppercase">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <span>{t.footer_credit}</span>
          <span>{t.footer_stack}</span>
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
