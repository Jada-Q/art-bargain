// /api/nego/[id]/auto — Plan C M7 dual-agent endpoint.
//
// Drives an agent-vs-agent negotiation in a single SSE response. Coordinator
// state machine alternates sides until accept / reject / 20-turn cap.
//
// Per spec §4.5, default Vercel Node runtime sustains 77s+ of streaming
// (Appendix B), so a 20-turn run fits inside one request without splits.

import Anthropic from '@anthropic-ai/sdk';
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { runSellerTurnStream, runBuyerTurnStream } from '@/lib/agent/coordinator';
import { supabaseComparableSalesSource } from '@/lib/agent/supabase-source';
import { advance, initState, type CoordState } from '@/lib/agent/coordinator-state';
import { judgeStall, type StallTurn } from '@/lib/agent/anti-stall-judge';
import type { SellerPromptInput } from '@/lib/agent/prompt-builder';
import type { BuyerPromptInput } from '@/lib/agent/buyer-prompt-builder';

// Vercel default-Node sustains 77s in our T7 spike; bump the explicit cap so
// long agent-vs-agent runs don't get cut mid-turn.
export const maxDuration = 120;

type Params = Promise<{ id: string }>;

const SELLER_OPENING_PROMPT =
  'Begin the negotiation. Open with a brief pitch and quote your starting price. Stay under 80 chars.';

const encoder = new TextEncoder();
function sse(event: string | null, data: unknown): string {
  const lines: string[] = [];
  if (event) lines.push(`event: ${event}`);
  lines.push(`data: ${JSON.stringify(data)}`);
  return lines.join('\n') + '\n\n';
}

export async function POST(_req: NextRequest, ctx: { params: Params }) {
  const { id } = await ctx.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: nego } = await supabase
    .from('negotiations')
    .select('id, artwork_id, buyer_id, status, mode, buyer_agent, turn_count')
    .eq('id', id)
    .maybeSingle();
  if (!nego) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (nego.buyer_id !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (nego.mode !== 'agent_vs_agent')
    return NextResponse.json({ error: 'mode_not_agent_vs_agent' }, { status: 409 });
  if (nego.status !== 'active')
    return NextResponse.json({ error: 'nego_not_active' }, { status: 409 });
  if (!nego.buyer_agent)
    return NextResponse.json({ error: 'buyer_agent_missing' }, { status: 400 });

  const { data: artwork } = await supabase
    .from('artworks')
    .select(
      'id, title, description, category, price_start, price_floor, category_meta, seller_agent',
    )
    .eq('id', nego.artwork_id)
    .maybeSingle();
  if (!artwork) return NextResponse.json({ error: 'artwork_missing' }, { status: 500 });

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return NextResponse.json({ error: 'anthropic_key_missing' }, { status: 500 });

  const admin = createAdminClient();
  const anthropic = new Anthropic({ apiKey });
  const source = supabaseComparableSalesSource(admin);

  const sellerInput = artwork as unknown as SellerPromptInput['artwork'];
  const buyerInput: BuyerPromptInput = {
    artwork: artwork as unknown as BuyerPromptInput['artwork'],
    buyer_agent: nego.buyer_agent as unknown as BuyerPromptInput['buyer_agent'],
  };

  const { data: priorTurnRows } = await admin
    .from('negotiation_turns')
    .select('speaker, message, turn_no, offer_price')
    .eq('negotiation_id', id)
    .order('turn_no', { ascending: true });

  const history: { speaker: string; message: string }[] = (priorTurnRows ?? []).map((t) => ({
    speaker: t.speaker,
    message: t.message,
  }));
  const stallTurns: StallTurn[] = (priorTurnRows ?? []).map((t) => ({
    speaker: t.speaker as StallTurn['speaker'],
    offer_price: t.offer_price === null ? null : Number(t.offer_price),
  }));

  let coordState: CoordState = initState('seller');
  for (let i = 0; i < (priorTurnRows ?? []).length; i++) {
    coordState = advance(coordState, {
      type: 'agent_spoke',
      speaker:
        priorTurnRows![i].speaker === 'buyer_agent' || priorTurnRows![i].speaker === 'buyer_human'
          ? 'buyer'
          : 'seller',
      offer_price:
        priorTurnRows![i].offer_price === null ? null : Number(priorTurnRows![i].offer_price),
    });
  }

  let nextTurnNo = (priorTurnRows?.length ?? 0) + 1;
  let lastSellerMessage = '';
  let lastBuyerMessage = '';
  for (const t of priorTurnRows ?? []) {
    if (t.speaker === 'seller_agent') lastSellerMessage = t.message;
    else lastBuyerMessage = t.message;
  }

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: string | null, data: unknown) =>
        controller.enqueue(encoder.encode(sse(event, data)));

      emit('state', {
        status: coordState.status,
        next_speaker: coordState.next_speaker,
        turn_count: coordState.turn_count,
      });

      try {
        while (coordState.status === 'active' && coordState.turn_count < 20) {
          const speaker: 'buyer' | 'seller' = coordState.next_speaker;
          const speakerDb = speaker === 'buyer' ? 'buyer_agent' : 'seller_agent';
          const currentTurnNo = nextTurnNo;

          emit('turn_start', { speaker: speakerDb, turn_no: currentTurnNo });

          let finalParsed: {
            full_text: string;
            offer_price: number | null;
            reasoning?: object;
          } | null = null;

          const runner =
            speaker === 'seller'
              ? runSellerTurnStream(
                  {
                    artwork: sellerInput,
                    history,
                    buyer_message: lastBuyerMessage || SELLER_OPENING_PROMPT,
                  },
                  { anthropic, source },
                )
              : runBuyerTurnStream(
                  {
                    artwork: buyerInput.artwork,
                    buyer_agent: buyerInput.buyer_agent,
                    history,
                    seller_message: lastSellerMessage,
                  },
                  { anthropic, source },
                );

          for await (const ev of runner) {
            if (ev.type === 'token') {
              emit('token', { speaker: speakerDb, delta: ev.delta });
            } else if (ev.type === 'final') {
              finalParsed = ev.parsed;
            }
          }

          if (!finalParsed) {
            emit('error', { code: 'agent_failed', user_message: 'no final message' });
            break;
          }

          await admin.from('negotiation_turns').insert({
            negotiation_id: id,
            turn_no: currentTurnNo,
            speaker: speakerDb,
            message: finalParsed.full_text,
            offer_price: finalParsed.offer_price,
            reasoning: (finalParsed.reasoning ?? null) as never,
          });

          history.push({ speaker: speakerDb, message: finalParsed.full_text });
          stallTurns.push({
            speaker: speakerDb as StallTurn['speaker'],
            offer_price: finalParsed.offer_price,
          });

          if (speaker === 'seller') lastSellerMessage = finalParsed.full_text;
          else lastBuyerMessage = finalParsed.full_text;

          emit('turn_end', {
            speaker: speakerDb,
            turn_no: currentTurnNo,
            full_text: finalParsed.full_text,
            offer_price: finalParsed.offer_price,
          });

          coordState = advance(coordState, {
            type: 'agent_spoke',
            speaker,
            offer_price: finalParsed.offer_price,
          });

          await admin
            .from('negotiations')
            .update({ turn_count: coordState.turn_count })
            .eq('id', id);

          nextTurnNo = coordState.turn_count + 1;

          // Anti-stall check after each completed turn.
          const stall = judgeStall(stallTurns);
          if (stall) {
            emit('mediation', { proposed_price: stall.price });
            await admin
              .from('negotiations')
              .update({
                status: 'accepted',
                final_price: stall.price,
                ended_at: new Date().toISOString(),
              })
              .eq('id', id);
            coordState = advance(coordState, { type: 'accept' });
            // Synthesize a final accepted offer in last_offer for downstream order creation.
            break;
          }

          emit('state', {
            status: coordState.status,
            next_speaker: coordState.next_speaker,
            turn_count: coordState.turn_count,
          });
        }

        // Terminal status persistence (if we hit turn cap or status changed).
        if (coordState.status !== 'active') {
          if (coordState.status === 'accepted' && coordState.last_offer !== null) {
            await admin
              .from('negotiations')
              .update({
                status: 'accepted',
                final_price: coordState.last_offer,
                ended_at: new Date().toISOString(),
              })
              .eq('id', id);
          } else if (coordState.status === 'stalled') {
            await admin
              .from('negotiations')
              .update({ status: 'stalled', ended_at: new Date().toISOString() })
              .eq('id', id);
          } else {
            await admin.from('negotiations').update({ status: coordState.status }).eq('id', id);
          }
        }

        emit('state', {
          status: coordState.status,
          next_speaker: coordState.next_speaker,
          turn_count: coordState.turn_count,
          final_price: coordState.last_offer,
        });
        emit('done', { ok: true });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'unknown';
        emit('error', { code: 'route_failed', user_message: msg });
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
