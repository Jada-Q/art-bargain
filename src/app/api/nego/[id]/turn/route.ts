import Anthropic from '@anthropic-ai/sdk';
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { runSellerTurnStream } from '@/lib/agent/coordinator';
import { supabaseComparableSalesSource } from '@/lib/agent/supabase-source';
import { validateBuyerOffer } from '@/lib/agent/price-validation';
import type { SellerPromptInput } from '@/lib/agent/prompt-builder';

type Params = Promise<{ id: string }>;

const encoder = new TextEncoder();

function sse(event: string | null, data: unknown): string {
  const lines: string[] = [];
  if (event) lines.push(`event: ${event}`);
  lines.push(`data: ${JSON.stringify(data)}`);
  return lines.join('\n') + '\n\n';
}

export async function POST(request: NextRequest, ctx: { params: Params }) {
  const { id } = await ctx.params;

  let body: { buyer_message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const buyer_message = (body.buyer_message ?? '').trim();
  if (!buyer_message) {
    return NextResponse.json({ error: 'empty_message' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Load nego + artwork.
  const { data: nego, error: negoErr } = await supabase
    .from('negotiations')
    .select('id, artwork_id, buyer_id, status, turn_count')
    .eq('id', id)
    .maybeSingle();
  if (negoErr || !nego) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (nego.buyer_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  if (nego.status !== 'active') {
    return NextResponse.json({ error: 'nego_not_active' }, { status: 409 });
  }

  const { data: artwork, error: artErr } = await supabase
    .from('artworks')
    .select(
      'id, title, description, category, price_start, price_floor, category_meta, seller_agent',
    )
    .eq('id', nego.artwork_id)
    .maybeSingle();
  if (artErr || !artwork) {
    return NextResponse.json({ error: 'artwork_missing' }, { status: 500 });
  }

  // Build history.
  const { data: history } = await supabase
    .from('negotiation_turns')
    .select('speaker, message, turn_no')
    .eq('negotiation_id', id)
    .order('turn_no', { ascending: true });
  const safeHistory = (history ?? []).map((h) => ({ speaker: h.speaker, message: h.message }));

  const nextTurnNo = (history?.length ?? 0) + 1;
  const isFirstBuyerTurn = nextTurnNo === 1;
  const buyerOffer = extractOfferPrice(buyer_message);

  // Anti-cheese: validate offer bounds + first-turn ≥ 70% of listed.
  if (buyerOffer !== null) {
    try {
      validateBuyerOffer({
        offer: buyerOffer,
        price_start: Number(artwork.price_start),
        isFirstTurn: isFirstBuyerTurn,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'invalid_offer';
      return NextResponse.json({ error: 'invalid_offer', message }, { status: 400 });
    }
  }

  // Writes use the service-role client (turn inserts are server-trusted; RLS
  // intentionally blocks client-side INSERT on negotiation_turns).
  const admin = createAdminClient();

  const { error: insertBuyerErr } = await admin.from('negotiation_turns').insert({
    negotiation_id: id,
    turn_no: nextTurnNo,
    speaker: 'buyer_human',
    message: buyer_message,
    offer_price: buyerOffer,
  });
  if (insertBuyerErr) {
    return NextResponse.json({ error: insertBuyerErr.message }, { status: 500 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: 'anthropic_key_missing' }, { status: 500 });
  }
  const anthropic = new Anthropic({ apiKey });
  const source = supabaseComparableSalesSource(admin);

  // SSE stream.
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: string | null, data: unknown) => {
        controller.enqueue(encoder.encode(sse(event, data)));
      };

      emit('turn_start', { speaker: 'buyer_human', turn_no: nextTurnNo });
      emit('turn_end', {
        speaker: 'buyer_human',
        turn_no: nextTurnNo,
        full_text: buyer_message,
      });
      emit('turn_start', { speaker: 'seller_agent', turn_no: nextTurnNo + 1 });

      try {
        let finalParsed: {
          type: 'final';
          parsed: { full_text: string; offer_price: number | null; reasoning?: object };
          raw: unknown;
        } | null = null;

        for await (const ev of runSellerTurnStream(
          {
            artwork: artwork as unknown as SellerPromptInput['artwork'],
            history: safeHistory,
            buyer_message,
          },
          { anthropic, source },
        )) {
          if (ev.type === 'token') {
            emit('token', { delta: ev.delta });
          } else if (ev.type === 'final') {
            finalParsed = ev;
          }
        }

        if (finalParsed) {
          await admin.from('negotiation_turns').insert({
            negotiation_id: id,
            turn_no: nextTurnNo + 1,
            speaker: 'seller_agent',
            message: finalParsed.parsed.full_text,
            offer_price: finalParsed.parsed.offer_price,
            reasoning: (finalParsed.parsed.reasoning ?? null) as never,
          });
          await admin
            .from('negotiations')
            .update({ turn_count: nextTurnNo + 1 })
            .eq('id', id);

          emit('turn_end', {
            speaker: 'seller_agent',
            turn_no: nextTurnNo + 1,
            full_text: finalParsed.parsed.full_text,
            offer_price: finalParsed.parsed.offer_price,
          });
        }

        emit('done', { ok: true });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'unknown';
        emit('error', { code: 'agent_failed', user_message: msg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}

// Reuse the same regex used by response-parser.ts; duplicated here to keep this
// module standalone (and to avoid pulling the parser into the route bundle).
const NUMBER_RE = /-?\d+(?:\.\d+)?/g;
function extractOfferPrice(text: string): number | null {
  const matches = Array.from(text.matchAll(NUMBER_RE)).map((m) => Number(m[0]));
  if (matches.length === 0) return null;
  const last = matches[matches.length - 1];
  if (last < 0 || last > 1_000_000) return null;
  return last;
}
