'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { Locale } from '@/lib/i18n';
import { dictFor } from '@/lib/i18n/client';
import type { TurnSnapshot } from './negotiation-chat';

export function SpectatorView({
  negotiationId,
  initialTurns,
  initialStatus,
  priceStart,
  locale,
}: {
  negotiationId: string;
  initialTurns: TurnSnapshot[];
  initialStatus: 'active' | 'accepted' | 'rejected' | 'stalled' | 'expired';
  priceStart: number;
  locale: Locale;
}) {
  const t = dictFor(locale).spectator;
  const [turns, setTurns] = useState<TurnSnapshot[]>(initialTurns);
  const [sellerDraft, setSellerDraft] = useState('');
  const [buyerDraft, setBuyerDraft] = useState('');
  const [activeSpeaker, setActiveSpeaker] = useState<'seller_agent' | 'buyer_agent' | null>(null);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState<string | null>(null);
  const [mediationPrice, setMediationPrice] = useState<number | null>(null);
  const sellerRef = useRef<HTMLDivElement>(null);
  const buyerRef = useRef<HTMLDivElement>(null);

  const sellerTurns = turns.filter((t) => t.speaker === 'seller_agent');
  const buyerTurns = turns.filter(
    (t) => t.speaker === 'buyer_agent' || t.speaker === 'buyer_human',
  );
  const latestSellerOffer =
    [...sellerTurns].reverse().find((t) => t.offer_price !== null)?.offer_price ?? null;
  const latestBuyerOffer =
    [...buyerTurns].reverse().find((t) => t.offer_price !== null)?.offer_price ?? null;
  const spread =
    latestSellerOffer !== null && latestBuyerOffer !== null
      ? Math.abs(latestSellerOffer - latestBuyerOffer)
      : null;

  useEffect(() => {
    sellerRef.current?.scrollTo({ top: sellerRef.current.scrollHeight, behavior: 'smooth' });
    buyerRef.current?.scrollTo({ top: buyerRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns, sellerDraft, buyerDraft]);

  async function start() {
    if (running || status !== 'active') return;
    setRunning(true);
    setError(null);
    setMediationPrice(null);
    try {
      const res = await fetch(`/api/nego/${negotiationId}/auto`, { method: 'POST' });
      if (!res.ok || !res.body) {
        const text = await res.text();
        setError(`request failed: ${res.status} ${text}`);
        return;
      }
      await consumeSSE(res.body);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'unknown');
    } finally {
      setRunning(false);
      setSellerDraft('');
      setBuyerDraft('');
      setActiveSpeaker(null);
    }
  }

  async function consumeSSE(body: ReadableStream<Uint8Array>) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split('\n\n');
      buffer = blocks.pop() ?? '';
      for (const block of blocks) {
        const evt = parseSSEBlock(block);
        if (!evt) continue;
        handleEvent(evt);
      }
    }
  }

  function handleEvent(evt: SSEBlock) {
    if (!evt.data) return;
    const d = evt.data;
    if (evt.event === 'turn_start') {
      setActiveSpeaker(d.speaker);
      if (d.speaker === 'seller_agent') setSellerDraft('');
      else setBuyerDraft('');
    } else if (evt.event === 'token') {
      if (d.speaker === 'seller_agent') setSellerDraft((p) => p + d.delta);
      else if (d.speaker === 'buyer_agent') setBuyerDraft((p) => p + d.delta);
    } else if (evt.event === 'turn_end') {
      setTurns((prev) => [
        ...prev,
        {
          id: `local-${d.turn_no}`,
          turn_no: d.turn_no,
          speaker: d.speaker,
          message: d.full_text,
          offer_price: d.offer_price ?? null,
        },
      ]);
      if (d.speaker === 'seller_agent') setSellerDraft('');
      else setBuyerDraft('');
    } else if (evt.event === 'state') {
      if (d.status && d.status !== 'active') {
        setStatus(d.status);
      }
    } else if (evt.event === 'mediation') {
      setMediationPrice(d.proposed_price);
    } else if (evt.event === 'error') {
      setError(`agent: ${d.user_message ?? 'unknown'}`);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="border-border flex items-baseline justify-between border-b pb-3">
        <div>
          <p className="text-muted-foreground tracking-label text-[10px] uppercase">{t.eyebrow}</p>
          <h2 className="font-display mt-1 text-xl">{t.title}</h2>
        </div>
        <div className="text-muted-foreground tracking-label flex items-baseline gap-3 text-[10px] uppercase">
          <span className={status === 'active' ? 'text-foreground' : ''}>{status}</span>
          {turns.length > 0 ? <span>{t.turn_count(turns.length)}</span> : null}
        </div>
      </header>

      {/* Progress bar */}
      <ProgressBar
        priceStart={priceStart}
        buyerOffer={latestBuyerOffer}
        sellerOffer={latestSellerOffer}
        spread={spread}
        spreadLabel={t.spread}
        gapLabel={t.gap}
      />

      {/* Two-column streams */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Column
          title={t.seller_column}
          tone="seller"
          turns={sellerTurns}
          draft={sellerDraft}
          isActive={activeSpeaker === 'seller_agent'}
          scrollRef={sellerRef}
        />
        <Column
          title={t.buyer_column}
          tone="buyer"
          turns={buyerTurns}
          draft={buyerDraft}
          isActive={activeSpeaker === 'buyer_agent'}
          scrollRef={buyerRef}
        />
      </div>

      {mediationPrice !== null ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
          {t.mediation(mediationPrice)}
        </div>
      ) : null}

      {error ? (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : null}

      {status === 'active' ? (
        <Button onClick={start} disabled={running} size="lg">
          {running ? t.running : turns.length === 0 ? t.start : t.continue}
        </Button>
      ) : (
        <div className="border-gallery-accent bg-gallery-accent/5 text-foreground border-l-2 p-4 text-[13px] leading-relaxed">
          <p className="text-gallery-accent tracking-label text-[10px] uppercase">
            {status === 'accepted'
              ? t.accepted_eyebrow
              : status === 'stalled'
                ? t.stalled_eyebrow
                : status}
          </p>
          <p className="mt-2">
            {status === 'accepted'
              ? t.accepted_body
              : status === 'stalled'
                ? t.stalled_body
                : status}
          </p>
        </div>
      )}
    </div>
  );
}

function Column({
  title,
  tone,
  turns,
  draft,
  isActive,
  scrollRef,
}: {
  title: string;
  tone: 'seller' | 'buyer';
  turns: TurnSnapshot[];
  draft: string;
  isActive: boolean;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="border-border bg-background flex h-[60svh] flex-col border">
      <div className="border-b px-3 py-2 text-xs font-medium tracking-wide uppercase">
        {title}
        {isActive ? <span className="ml-2 animate-pulse text-emerald-600">●</span> : null}
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3" aria-live="polite">
        <ul className="flex flex-col gap-2">
          {turns.map((t) => (
            <li key={t.id}>
              <Bubble text={t.message} offerPrice={t.offer_price} tone={tone} />
            </li>
          ))}
          {draft ? (
            <li>
              <Bubble text={draft} offerPrice={null} tone={tone} streaming />
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}

function Bubble({
  text,
  offerPrice,
  tone,
  streaming,
}: {
  text: string;
  offerPrice: number | null;
  tone: 'seller' | 'buyer';
  streaming?: boolean;
}) {
  return (
    <div
      className={
        'rounded-sm px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap ' +
        (tone === 'buyer' ? 'bg-foreground text-background' : 'bg-muted text-foreground')
      }
    >
      {text}
      {streaming ? <span className="ml-1 animate-pulse">▋</span> : null}
      {offerPrice !== null ? (
        <span className="bg-background/15 ml-2 rounded px-1.5 py-0.5 text-xs">${offerPrice}</span>
      ) : null}
    </div>
  );
}

function ProgressBar({
  priceStart,
  buyerOffer,
  sellerOffer,
  spread,
  spreadLabel,
  gapLabel,
}: {
  priceStart: number;
  buyerOffer: number | null;
  sellerOffer: number | null;
  spread: number | null;
  spreadLabel: string;
  gapLabel: (n: number) => string;
}) {
  // Domain: 0 → priceStart × 1.2 (small headroom so price_start sits ~83% in)
  const max = Math.max(priceStart * 1.2, sellerOffer ?? 0, buyerOffer ?? 0);
  const pct = (v: number) => `${Math.min(100, Math.max(0, (v / max) * 100))}%`;

  return (
    <div className="border-border border p-5">
      <div className="text-muted-foreground mb-2 flex items-center justify-between text-xs">
        <span>{spreadLabel}</span>
        {spread !== null ? <span>{gapLabel(spread)}</span> : <span>—</span>}
      </div>
      <div className="bg-muted relative h-3 w-full rounded-full">
        {/* Listed price marker */}
        <div
          className="border-foreground/40 absolute top-0 h-3 border-r-2"
          style={{ left: pct(priceStart) }}
          title={`Listed $${priceStart}`}
        />
        {/* Buyer offer marker */}
        {buyerOffer !== null ? (
          <div
            className="bg-foreground absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ left: pct(buyerOffer) }}
            title={`Buyer $${buyerOffer}`}
          />
        ) : null}
        {/* Seller offer marker */}
        {sellerOffer !== null ? (
          <div
            className="bg-muted-foreground ring-background absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2"
            style={{ left: pct(sellerOffer) }}
            title={`Seller $${sellerOffer}`}
          />
        ) : null}
      </div>
      <div className="text-muted-foreground mt-2 flex justify-between text-[10px]">
        <span>$0</span>
        {buyerOffer !== null ? <span>buyer ${buyerOffer}</span> : null}
        {sellerOffer !== null ? <span>seller ${sellerOffer}</span> : null}
        <span>listed ${priceStart}</span>
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SSEBlock = { event: string | null; data: any };

function parseSSEBlock(block: string): SSEBlock | null {
  const lines = block
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;
  let event: string | null = null;
  let data = '';
  for (const line of lines) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) data += line.slice(5).trim();
  }
  if (!data) return { event, data: null };
  try {
    return { event, data: JSON.parse(data) };
  } catch {
    return { event, data: null };
  }
}
