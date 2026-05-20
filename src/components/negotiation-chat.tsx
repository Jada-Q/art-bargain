'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { Locale } from '@/lib/i18n';
import { dictFor } from '@/lib/i18n/client';
import { acceptOffer } from '@/app/nego/actions';

export type TurnSnapshot = {
  id: string;
  turn_no: number;
  speaker: 'buyer_human' | 'seller_agent' | 'buyer_agent' | 'system';
  message: string;
  offer_price: number | null;
};

export function NegotiationChat({
  negotiationId,
  initialTurns,
  initialStatus,
  t,
}: {
  negotiationId: string;
  initialTurns: TurnSnapshot[];
  initialStatus: 'active' | 'accepted' | 'rejected' | 'stalled' | 'expired';
  locale: Locale;
}) {
  const t = dictFor(locale).chat;
  const [turns, setTurns] = useState<TurnSnapshot[]>(initialTurns);
  const [draft, setDraft] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamingSellerText, setStreamingSellerText] = useState('');
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState<string | null>(null);
  const [acceptPending, startAcceptTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns, streamingSellerText]);

  const lastSellerOffer = [...turns]
    .reverse()
    .find((t) => t.speaker === 'seller_agent' && t.offer_price !== null);

  async function send() {
    const text = draft.trim();
    if (!text || streaming) return;
    setError(null);
    setStreaming(true);
    setStreamingSellerText('');
    setDraft('');

    try {
      const res = await fetch(`/api/nego/${negotiationId}/turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyer_message: text }),
      });
      if (!res.ok || !res.body) {
        const body = await res.text();
        setError(`request failed: ${res.status} ${body}`);
        setStreaming(false);
        return;
      }
      await consumeSSE(res.body);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'unknown');
    } finally {
      setStreaming(false);
      setStreamingSellerText('');
    }
  }

  async function consumeSSE(body: ReadableStream<Uint8Array>) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let buyerAppended = false;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() ?? '';
      for (const block of events) {
        const evt = parseSSEBlock(block);
        if (!evt) continue;
        if (evt.event === 'turn_end' && evt.data?.speaker === 'buyer_human' && !buyerAppended) {
          buyerAppended = true;
          setTurns((prev) => [
            ...prev,
            {
              id: `local-${evt.data.turn_no}`,
              turn_no: evt.data.turn_no,
              speaker: 'buyer_human',
              message: evt.data.full_text,
              offer_price: null,
            },
          ]);
        } else if (evt.event === 'token' && typeof evt.data?.delta === 'string') {
          setStreamingSellerText((prev) => prev + evt.data.delta);
        } else if (evt.event === 'turn_end' && evt.data?.speaker === 'seller_agent') {
          setTurns((prev) => [
            ...prev,
            {
              id: `local-${evt.data.turn_no}`,
              turn_no: evt.data.turn_no,
              speaker: 'seller_agent',
              message: evt.data.full_text,
              offer_price: evt.data.offer_price ?? null,
            },
          ]);
          setStreamingSellerText('');
        } else if (evt.event === 'error') {
          setError(`agent: ${evt.data?.user_message ?? 'unknown'}`);
        }
      }
    }
  }

  function onAccept() {
    if (!lastSellerOffer?.offer_price) return;
    startAcceptTransition(async () => {
      const result = await acceptOffer(negotiationId, lastSellerOffer.offer_price as number);
      if (result.ok) {
        setStatus('accepted');
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex h-[calc(100svh-9rem)] flex-col gap-4">
      <div
        ref={scrollRef}
        className="border-border bg-background flex-1 overflow-y-auto border p-6"
        aria-live="polite"
      >
        {turns.length === 0 && !streamingSellerText ? (
          <p className="text-muted-foreground text-[13px] leading-relaxed italic">{t.empty}</p>
        ) : null}
        <ul className="flex flex-col gap-2">
          {turns.map((t) => (
            <li key={t.id}>
              <Bubble speaker={t.speaker} text={t.message} offerPrice={t.offer_price} />
            </li>
          ))}
          {streamingSellerText ? (
            <li>
              <Bubble
                speaker="seller_agent"
                text={streamingSellerText}
                offerPrice={null}
                streaming
              />
            </li>
          ) : null}
        </ul>
      </div>

      {error ? (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : null}

      {status === 'accepted' ? (
        <div className="border-gallery-accent bg-gallery-accent/5 text-foreground border-l-2 p-4 text-[13px] leading-relaxed">
          <p className="text-gallery-accent tracking-label text-[10px] uppercase">
            {t.accepted_eyebrow}
          </p>
          <p className="mt-2">{t.accepted_body}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {lastSellerOffer?.offer_price && status === 'active' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onAccept}
              disabled={acceptPending}
              className="self-end"
            >
              {acceptPending ? t.accepting : t.accept_offer(lastSellerOffer.offer_price as number)}
            </Button>
          ) : null}
          <div className="flex gap-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t.placeholder}
              rows={2}
              disabled={streaming || status !== 'active'}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <Button onClick={send} disabled={streaming || !draft.trim() || status !== 'active'}>
              {streaming ? t.sending : t.send}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Bubble({
  speaker,
  text,
  offerPrice,
  streaming,
}: {
  speaker: TurnSnapshot['speaker'];
  text: string;
  offerPrice: number | null;
  streaming?: boolean;
}) {
  const isBuyer = speaker === 'buyer_human' || speaker === 'buyer_agent';
  return (
    <div className={isBuyer ? 'flex justify-end' : 'flex justify-start'}>
      <div
        className={
          'max-w-[80%] rounded-sm px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap ' +
          (isBuyer ? 'bg-foreground text-background' : 'bg-muted text-foreground')
        }
      >
        {text}
        {streaming ? <span className="ml-1 animate-pulse">▋</span> : null}
        {offerPrice !== null ? (
          <span className="bg-background/15 ml-2 rounded px-1.5 py-0.5 text-xs">${offerPrice}</span>
        ) : null}
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
