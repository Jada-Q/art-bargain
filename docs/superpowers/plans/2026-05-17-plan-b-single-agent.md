# Plan B — Single-Agent Core (M4 + M5)

| Field | Value |
|---|---|
| Date | 2026-05-17 |
| Status | Draft |
| Source spec | `docs/superpowers/specs/2026-05-17-art-bargain-design.md` |
| Predecessor | Plan A (M1 + M2 + M3) — tag `m3-done` |
| Scope | M4 (TDD batch 1) + M5 (human-vs-agent MVP) |
| Out of scope | Dual-agent, anti-stall judge, state machine, history reasoning expand, Stripe checkout |

---

## Goal

End of Plan B, the project must satisfy:

1. **3 TDD modules green** under Vitest with MSW-mocked Anthropic API:
   - `agent_prompt_builder` — composes the seller agent's system prompt from `artworks` + persona config.
   - `agent_response_parser` — extracts `offer_price`, narrative text, and tool-call metadata from a Claude streaming response.
   - `tool_executor` — runs `lookupComparableSales` against `comparable_sales` with category-aware filtering.
2. **Demo recording point #1 on production**: log in → pick a live artwork → open negotiation page → type a counter-offer → watch the seller agent stream a reply that references a comparable-sales anchor.
3. **`negotiation_turns` persisted per turn** (no SSE replay; DB-only history).
4. **`negotiations.status` transitions**: `active` (default) → `accepted` (when buyer accepts an offer button) or stays `active` otherwise. No anti-stall mediation yet (M6).

Plan B explicitly **does not** include:
- `agent_coordinator` full state machine (M6)
- `anti_stall_judge` (M6)
- `agent_vs_agent` mode (M7)
- Spectator page (M7)
- Negotiation history review with expandable `reasoning` (M8)

---

## Prerequisites

| Resource | Status |
|---|---|
| Plan A complete + deployed | ✅ tag `m3-done` |
| Anthropic API key in Vercel prod env | ✅ |
| Live artwork on production | ⚠️ test listing exists but withdrawn; user can re-publish or seed new |
| Vitest familiarity | n/a — installing fresh |

---

## Task graph

```
TB0 vitest+msw setup
  │
  ├─→ TB1 tool_executor (TDD)        ──┐
  ├─→ TB2 agent_prompt_builder (TDD) ──┼─→ TB4 simple coordinator
  └─→ TB3 agent_response_parser (TDD)──┘        │
                                                ▼
                                         TB5 SSE route /api/nego/[id]/turn
                                                │
                                                ▼
                                         TB6 negotiation page UI
                                                │
                                                ▼
                                         TB7 end-to-end smoke on prod
                                                │
                                                ▼
                                         TB8 demo recording + tag b-done
```

TB1/TB2/TB3 are independent — can be done in any order. I'll do them in dependency order for the integration step (tool_executor first since the prompt builder may reference it).

---

## TDD discipline (per CLAUDE.md feedback_macro_rebuild_signal + Matt Pocock skill)

For TB1, TB2, TB3:
1. Write **one test at a time** → run → red.
2. Write the **minimum code** to make that one test green.
3. **Commit** with both test and implementation for that single behavior.
4. Move to the next test.

No batch test commits. No mocking own modules. Mock only at the system boundary: **Anthropic API (MSW)**, **Supabase client** (in-memory stub), **Date.now** (`vi.useFakeTimers`).

When red, only "make it green." No refactoring until green.

---

## Tasks

### TB0 — Vitest + MSW setup

**Goal**: `pnpm test` runs Vitest, MSW intercepts Anthropic API calls.

**Actions**:
1. `pnpm add -D vitest @vitest/coverage-v8 msw @types/node`
2. `vitest.config.ts` — node environment, `@/` alias, MSW setup file
3. `tests/setup.ts` — MSW server `setupServer` + lifecycle hooks
4. `tests/msw/anthropic.ts` — default handler returning a deterministic streaming response

**Verification**: A trivial smoke test passes (`expect(1+1).toBe(2)`); a second smoke test that calls Anthropic SDK gets intercepted by MSW and gets back the canned response.

**Commit**: `chore(test): vitest + msw setup`

---

### TB1 — `tool_executor` TDD

**Module**: `src/lib/agent/tool-executor.ts`

**Public interface**:
```typescript
type ToolInput = { category: ArtworkCategory; filters?: object; limit?: number };
type ToolResult = { items: Array<{ sold_price: number; meta: object; sold_at: string; notes: string }> };
async function lookupComparableSales(input: ToolInput, supabase: SupabaseClient): Promise<ToolResult>;
```

**Tests (write one at a time)**:
1. given an in-memory stub with 5 poster rows, returns up to `limit` newest by `sold_at`.
2. category filter narrows correctly (poster query does not return painting rows).
3. `filters: { signed: true }` matches jsonb meta containment.
4. empty result returns `{ items: [] }` — does not throw.
5. `limit` cap at 5; `limit: 100` clamped to 5.

**Commit per test** (5 commits total): `feat(agent): tool_executor — <behavior>`

---

### TB2 — `agent_prompt_builder` TDD

**Module**: `src/lib/agent/prompt-builder.ts`

**Public interface**:
```typescript
type SellerPromptInput = {
  artwork: { title: string; description: string; category: string; price_start: number; price_floor: number; category_meta: object; seller_agent: { style: string; urgency: number; persona_prompt?: string } };
};
function buildSellerSystemPrompt(input: SellerPromptInput): string;
```

**Tests**:
1. output contains the artwork title verbatim.
2. output contains `price_floor` only in the private-constraints block.
3. output references the persona `style` (firm/friendly/scholarly) by name in the persona block.
4. output mentions the `lookupComparableSales` tool and the max-2-call cap.
5. output describes the 80-char-per-utterance + structured output requirement.
6. given urgency=5, output adds a "time pressure" cue not present at urgency=1.

**Commit per test**: `feat(agent): prompt_builder — <behavior>`

---

### TB3 — `agent_response_parser` TDD

**Module**: `src/lib/agent/response-parser.ts`

**Public interface**:
```typescript
type ParsedTurn = { full_text: string; offer_price: number | null; reasoning?: { tool_calls?: Array<{ name: string; input: object; output: object }> } };
function parseFinalMessage(message: Anthropic.Messages.Message): ParsedTurn;
```

**Tests**:
1. plain text "I'll go $150" → `offer_price = 150`.
2. multiple amounts "list $200, willing to do $150" → take last numeric → 150.
3. no number → `offer_price = null`.
4. `$150 USD`, `150 美元`, `150 dollars` all parse.
5. `offer < 0` → throws.
6. `offer > 1_000_000` → throws.
7. message contains a `tool_use` block + a subsequent `tool_result` → both captured in `reasoning.tool_calls`.

**Commit per test**: `feat(agent): response_parser — <behavior>`

---

### TB4 — Simple turn-based coordinator

**Module**: `src/lib/agent/coordinator.ts`

**Goal**: A function that takes a negotiation row + a new buyer utterance, calls Claude with the seller prompt + history, and returns a parsed agent reply.

**Public interface**:
```typescript
async function runSellerTurn(input: {
  negotiation: NegotiationRow;
  artwork: ArtworkRow;
  history: NegotiationTurnRow[];
  buyer_message: string;
}, deps: { anthropic: Anthropic; supabase: SupabaseClient }): Promise<ParsedTurn>;
```

This is **not TDD'd** in M4 batch 1 (it lives in batch 2 = M6). For M5 we wire a thin orchestrator that:
1. Builds the seller system prompt via `buildSellerSystemPrompt`.
2. Calls `anthropic.messages.create({ stream: true, tools: [lookupComparableSalesTool], ... })`.
3. Resolves any tool calls by invoking `lookupComparableSales` (via `tool_executor`).
4. Returns the parsed final message.

**Commit**: `feat(agent): simple seller-turn coordinator (M5 wiring)`

---

### TB5 — SSE route `/api/nego/[id]/turn`

**Module**: `src/app/api/nego/[id]/turn/route.ts`

**Behavior**:
- POST handler. Body: `{ buyer_message: string }`.
- Auth: requires Supabase session; verifies buyer_id matches.
- Streams SSE events as defined in spec §4.5:
  - `event: turn_start { speaker: 'seller_agent', turn_no }`
  - `event: token { delta }` — text deltas
  - `event: tool_call { name, input }`
  - `event: tool_result { output }`
  - `event: turn_end { offer_price, full_text }` — after persistence
  - `event: done`
- Persists the buyer turn first (turn_no = current count + 1), then the seller turn (turn_no = current count + 2).

**Verification**: curl against prod URL with a real session cookie shows multi-line SSE output ending in `event: done`.

**Commit**: `feat(nego): SSE route /api/nego/[id]/turn — human-vs-agent`

---

### TB6 — Negotiation page UI

**Module**: `src/app/nego/[id]/page.tsx` + `src/components/negotiation-chat.tsx`

**Layout**:
- Left: artwork card (image + title + price_start)
- Right: chat thread (rendered from negotiation_turns) + input box + Send button + "Accept current offer" button (visible when seller's last turn had an offer)

**Behavior**:
- On mount, hydrate from DB (server-side).
- On Send: POST to `/api/nego/[id]/turn`, consume SSE, append tokens to a draft seller bubble; on `event: turn_end`, finalize and clear draft.
- On Accept: call a server action that sets `negotiations.status = 'accepted'`, `final_price = last_offer`, creates an `orders` row with `status='pending'`.

**Entry point**: Detail page button "Start negotiation" (currently disabled). Plan B re-enables it and points it at a server action that creates the `negotiations` row + redirects to `/nego/[id]`.

**Commit**: `feat(nego): negotiation page UI + accept flow`

---

### TB7 — End-to-end smoke on production

**Manual happy path on prod URL**:
1. Log in.
2. Publish the test artwork (or seed a new one).
3. From browse → detail → "Start negotiation".
4. Type "Can you do $150?" → watch seller agent stream a reply citing a comparable.
5. Confirm a `negotiation_turns` row exists for both buyer and seller turns.
6. Click "Accept" on the seller's latest offer.
7. Verify `negotiations.status = 'accepted'`, `orders` row created.

**Commit (if fixes needed)**: `fix(nego): <specific issue>`

---

### TB8 — Demo recording + tag `b-done`

- Record a 30-60s screen capture of the human-vs-agent flow with reasoning visible (tool call shown via SSE `event: tool_call`).
- Drop the gif/mp4 into `docs/demos/m5-human-vs-agent.gif` (or similar).
- Tag commit: `git tag -a b-done -m "Plan B complete"`.

---

## Smoke checklist

Run on production URL after TB7.

### TDD
- [ ] `pnpm test` runs and all TB1+TB2+TB3 tests pass
- [ ] MSW intercepts Anthropic calls (no real API hits during test)
- [ ] `pnpm test --coverage` shows ≥80% coverage on the 3 TDD modules

### Negotiation flow
- [ ] Detail page "Start negotiation" button is enabled
- [ ] Clicking it creates a `negotiations` row and redirects to `/nego/[id]`
- [ ] `/nego/[id]` shows artwork card + empty chat
- [ ] Typing + Send streams the seller agent reply token-by-token
- [ ] At least one negotiation in test data uses `lookupComparableSales` tool (visible via SSE `event: tool_call`)
- [ ] Both buyer and seller turns persist to `negotiation_turns`
- [ ] Accept button creates `orders` row and flips `negotiations.status`

### Auth + permissions
- [ ] Anonymous user trying to open `/nego/[id]` redirects to `/login`
- [ ] User who is not buyer/seller of the negotiation gets 404 (RLS)

### Cost
- [ ] One typical end-to-end demo (~10 turns) costs <$0.30 in Claude API spend

---

## Risks

| Risk | Mitigation |
|---|---|
| Tool-use streaming flow with Anthropic SDK is unfamiliar — may need iteration | Start TB4/TB5 with non-streaming `messages.create` first; switch to streaming only after happy path works |
| Hydration mismatches in chat UI (SSE delta append vs RSC initial render) | Keep DB hydration as initial state; client-only append after mount |
| Negotiation RLS edge cases (buyer creates negotiation → can they see it before turns exist?) | Verify policies in `0001_init.sql` cover the freshly-created row |
| Tool result returns 0 items → agent gets confused | Prompt includes "if no comparable sales found, reason without anchor" |
| Cost during dev | `max_tokens=400` per segment + `max_tokens=4000` total per nego (matches spec); during dev set lower if needed |

---

## Stop points

Plan B is "shippable as portfolio progress" at:
- **End of TB3**: 3 TDD modules pass locally — no demo, but rigor on display
- **End of TB6**: human-vs-agent demo recording possible — this is the main checkpoint

If TB7 reveals blocking issues, stop at "TDD tests green + UI prototype" rather than push through.

---

## When Plan B is done

- Tag `b-done` exists.
- Demo gif in `docs/demos/`.
- README updated with the demo link.

Then proceed to **Plan C — Coordinator + Dual-Agent (M6 + M7)**, which introduces:
- TDD batch 2 (`agent_coordinator`, `anti_stall_judge`, `price_validation`)
- Full state machine
- `agent_vs_agent` mode
- Spectator page (centerpiece demo recording #2)
