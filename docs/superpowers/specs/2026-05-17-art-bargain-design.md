# art-bargain — Design Spec

| Field | Value |
|---|---|
| Date | 2026-05-17 |
| Owner | Jada |
| Status | Draft — awaiting user review |
| Type | Portfolio / technical demo project |
| Repo | `~/Desktop/Projects/art-bargain/` (TBD: GitHub repo) |
| Target deploy | Vercel |

---

## TL;DR

A multi-category art marketplace where every listing carries an LLM negotiation agent. Buyers can either negotiate themselves or dispatch their own agent to negotiate on their behalf — producing an "agent vs agent" live-streamed bargaining experience as the portfolio centerpiece. Built as a full-stack Next.js + Supabase + Claude API application.

---

## Motivation & Goals

### Why this project exists

- **Portfolio / technical demo**, not a commercial SaaS. Success = a 30-second pitchable demo that distinguishes Jada from generic AI demo work.
- The "agent vs agent negotiation" interaction is novel enough that incumbents (Saatchi Art, Bandcamp, Etsy) cannot trivially absorb it.

### Primary goals

1. Deliver a deployed, registerable application demonstrating end-to-end product capability (auth + DB + uploads + payments stub + streaming AI).
2. Make the **agent layer** carry ≥50% of the visible engineering depth — prompt design, tool use, streaming, state machine, anti-cheese rules.
3. Produce three demo-worthy moments tied to user journeys (see below).

### Non-goals

- Real transactions / real payment processing — Stripe **test mode happy path only**.
- Real users / dogfood validation — portfolio context.
- Mobile-first UX — responsive-only, no PWA.
- Multi-language UI — Chinese UI, English README.
- SEO / discoverability — case study links from portfolio only.
- Admin moderation, content review, dispute resolution.
- Email / push / in-app notifications.

---

## User Journeys

### A. Seller Listing

1. Register → dashboard → new listing.
2. Upload image + form (title / category / starting price / description / category-specific metadata).
3. **Configure seller agent**: floor price, negotiation style (firm / friendly / scholarly), urgency 1-5.
4. Publish → listing goes live on browse page.

### B. Buyer Negotiation (human)

1. Browse → click listing → "Start Negotiation".
2. Chat page (left: listing card + progress bar; right: chat thread).
3. Streaming back-and-forth; seller agent calls `lookupComparableSales` tool to anchor its offers.
4. Both agree → one-click checkout (Stripe test mode).

### C. Buyer Negotiation (agent-delegated) ★ portfolio centerpiece

1. Same flow but click **"Dispatch agent"** → modal sets buyer agent parameters (target price, max price, style).
2. Enters **spectator page**: dual streams left/right + center progress bar.
3. Auto-negotiates to agreement or turn limit; buyer decides "Accept / Cancel".

---

## Non-functional constraints

- Agent layer work effort ≥50% of total project time.
- Every core feature must support a 30-second walkthrough narrative.
- Multi-category support — category-aware agent valuation reasoning.

---

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│  Browser (Next.js App Router · RSC + Client Components)    │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │ Browse/Detail│  │ Negotiate    │  │ Spectator       │   │
│  │ (RSC)        │  │ (Client+SSE) │  │ (Client+SSE)    │   │
│  └──────────────┘  └──────────────┘  └─────────────────┘   │
└─────────────┬──────────────────────────────────────────────┘
              │
   ┌──────────┴──────────┬─────────────────┬──────────────┐
   ▼                     ▼                 ▼              ▼
┌────────────┐   ┌────────────────┐   ┌──────────┐  ┌─────────┐
│ Server     │   │ Route Handlers │   │ Supabase │  │ Stripe  │
│ Components │   │ /api/nego/*    │   │ Auth/DB/ │  │ test    │
│ (DB read)  │   │ (SSE stream)   │   │ Storage/ │  │ mode    │
│            │   │                │   │ Realtime │  │         │
└────────────┘   └───────┬────────┘   └──────────┘  └─────────┘
                         ▼
                  ┌──────────────┐
                  │ Anthropic    │
                  │ Claude API   │
                  └──────────────┘
```

### Key architectural decisions

1. **SSE, not WebSocket** for negotiation streaming.
   - One-directional (agent → client) is sufficient; user input goes via plain POST to kick off the next streamed segment.
   - 70% less complexity than WebSocket; Vercel Serverless supports natively.

2. **Dual-agent coordination runs server-side** in a single Route Handler.
   - Anthropic API key stays server-side.
   - Coordinator alternates calls A → B → A → B, streaming each segment to client as SSE events.
   - One HTTP request bundles multiple turns until Vercel timeout pressure.

3. **History persistence is decoupled from streaming.**
   - Each completed turn is stored as one row in `negotiation_turns`.
   - The history view queries DB directly — it does **not** replay SSE streams.

4. **Agent rate-limit and token caps**.
   - Hard caps per negotiation: 20 turns / 60s total thinking time / 400 max_tokens per segment / ~12k total tokens.
   - Exceeding any cap triggers a "system mediation" turn (mid-point price proposal).

### Tech stack (aligned with `~/.claude/tech-preferences.md`)

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 14 App Router | RSC for browse/detail; Client + SSE for negotiation pages |
| Language | TypeScript | strict mode |
| Styling | Tailwind + shadcn/ui | reuse shadcn `chat`, `card`, `progress` primitives |
| Backend | Next.js Route Handlers | SSE via `Response` + `ReadableStream` |
| Auth | Supabase Auth | email + password MVP |
| DB | Supabase Postgres | RLS-protected |
| Storage | Supabase Storage | listing images (original + thumb) |
| Realtime (side-channel) | Supabase Realtime | seller dashboard notifications only |
| LLM | Anthropic SDK + `claude-sonnet-4-6` | streaming + tool use |
| Payments | Stripe test mode | checkout happy path only |
| Deployment | Vercel | streaming under 25s default timeout — see Risks |
| Package mgr | pnpm | |

---

## Data Model

5 core tables. UUID primary keys. All timestamps `timestamptz`.

### `artworks`

```sql
artworks (
  id              uuid PK,
  seller_id       uuid → auth.users,
  title           text,
  description     text,
  category        enum('poster','painting','photography'),
  price_start     numeric,
  price_floor     numeric,                  -- agent-only; never sent to buyer
  category_meta   jsonb,                    -- e.g. poster: {size, print_run, signed, edition_no}
  image_url       text,                     -- Supabase Storage path
  thumb_url       text,
  status          enum('draft','live','sold','withdrawn'),
  seller_agent    jsonb,                    -- {style, urgency, persona_prompt}
  created_at      timestamptz
)
```

### `negotiations`

```sql
negotiations (
  id              uuid PK,
  artwork_id      uuid → artworks,
  buyer_id        uuid → auth.users,
  mode            enum('human_vs_agent','agent_vs_agent'),
  buyer_agent     jsonb NULL,               -- {target_price, max_price, style}; only when agent mode
  status          enum('active','accepted','rejected','stalled','expired'),
  final_price     numeric NULL,
  turn_count      int DEFAULT 0,
  started_at      timestamptz,
  ended_at        timestamptz NULL
)
```

### `negotiation_turns`

```sql
negotiation_turns (
  id              uuid PK,
  negotiation_id  uuid → negotiations,
  turn_no         int,
  speaker         enum('seller_agent','buyer_agent','buyer_human','system'),
  message         text,                     -- full final utterance (not token-level)
  offer_price     numeric NULL,             -- null for talk-only turns
  reasoning       jsonb NULL,               -- {tool_calls: [...], thoughts: text}
  created_at      timestamptz
)
```

### `orders`

```sql
orders (
  id              uuid PK,
  negotiation_id  uuid → negotiations,
  artwork_id      uuid → artworks,
  buyer_id        uuid → auth.users,
  seller_id       uuid → auth.users,
  agreed_price    numeric,
  stripe_intent   text,                     -- test-mode payment intent id
  status          enum('pending','paid','cancelled'),
  created_at      timestamptz
)
```

### `comparable_sales` (RAG source for tool use)

```sql
comparable_sales (
  id              uuid PK,
  category        enum('poster','painting','photography'),
  meta            jsonb,                    -- matching dimensions
  sold_price      numeric,
  sold_at         date,
  notes           text                      -- human-readable description for agent reasoning
)
```

Seeded with 10-15 rows per category as demo anchor data.

### Design decisions

- **Agent config inline as jsonb**, not separate tables. Seller agent → `artworks.seller_agent` (1:1). Buyer agent → `negotiations.buyer_agent` (1:1).
- **History persists at turn granularity**, not token-level. Streaming is rendering-only.
- **`comparable_sales` queried via SQL with jsonb filters**, not pgvector. Simpler; sufficient for portfolio narrative ("RAG-anchored agent reasoning").
- **`category_meta` jsonb, not polymorphic tables**. Schema flexibility wins over type safety at this stage; zod schemas enforce shape at API boundary.

### RLS overview (full SQL in migration)

- `artworks`: public read where `status='live'`; seller writes own / sees own drafts.
- `negotiations`: buyer + seller of the artwork only.
- `negotiation_turns`: inherits negotiation visibility.
- `comparable_sales`: public read (demo data; no PII).

### Migration order

`enums` → `comparable_sales` (+ seed) → `artworks` → `negotiations` → `negotiation_turns` → `orders`.

---

## Agent Design

### Modes

| Mode | Seller agent | Buyer side | Coordinator |
|---|---|---|---|
| `human_vs_agent` | Yes | Human input | Simple: user msg → seller agent → stream back |
| `agent_vs_agent` | Yes | Buyer agent | Server alternates A↔B, streaming each segment |

### System prompt template (symmetric for both agents)

```
[ROLE]
You are the {seller|buyer}-side negotiation agent. Goal: {sell at the best price
seller can get | buy at the lowest price buyer will pay}.

[PERSONA]
style: {firm | friendly | scholarly}
urgency: 1-5
(Inject tone constraints; never reveal persona to opponent.)

[CONSTRAINTS — private]
seller: floor = {price_floor}; never go below.
buyer:  ceiling = {max_price}; never go above. Target = {target_price}.

[ARTWORK CONTEXT]
{title, category, price_start, full category_meta fields}

[TOOL]
You may call `lookupComparableSales` to fetch comparable sold prices as anchors.
Max 2 calls per negotiation.

[OUTPUT FORMAT]
Each utterance ≤80 chars. Must include:
- Reasoning anchor
- Current offer / acceptance signal
- One push-forward line
Turn limit: 20.
```

### Anti-cheese (write into spec; enforce in code)

- Agent A's input history contains **only opponent utterances** — never opponent system prompt, reasoning, or tool calls.
- Agents never see `price_floor` / `max_price` of the counterparty.
- Forced response shape → server-side parser extracts `offer_price` to DB (does not rely on LLM JSON).
- Seller forced to hold at least 2 turns without concession.
- Buyer's first offer must be ≥ 0.7 × `price_start`.
- Prompt injection mitigation: agent system prompt forbids disclosing floor/max in any form; server-side regex warns (does not block) when user input contains keywords like 底价/floor/lowest.

### Tool schema

```typescript
{
  name: "lookupComparableSales",
  description: "Fetch comparable sold prices as anchor for offer reasoning.",
  input_schema: {
    type: "object",
    properties: {
      category: { type: "string", enum: ["poster","painting","photography"] },
      filters: {
        type: "object",
        description: "Category-specific filters, e.g. {signed: true, edition_no_max: 100}"
      },
      limit: { type: "integer", default: 3, maximum: 5 }
    },
    required: ["category"]
  }
}
```

Result format fed back to agent:

```
Found 3 comparable sales:
1. 2024-08, similar poster (signed /50, A2), $180
2. 2024-11, similar poster (signed /100, A2), $120
3. ...
```

### Coordinator state machine

```
START
  ↓
seller_agent_open (seller pitches + states price_start)
  ↓
  ├── mode = human_vs_agent → wait_human_offer ──┐
  │                                              ↓
  └── mode = agent_vs_agent → buyer_agent_turn ──┤
                                                  ↓
                                          ┌──── seller_agent_turn ────┐
                                          ↑                            │
                                          │                            ↓
                                          └──── buyer_turn (agent/human)
                                                  │
                                                  ↓
                                              CHECK_TERMINATION
                                              ├── offers match → ACCEPTED → create order
                                              ├── reject signal → REJECTED
                                              ├── turn_no ≥ 20 → STALLED
                                              ├── 3 consecutive turns with <2% offer gap → system mediation (median proposal)
                                              └── continue
```

### Streaming protocol

**Endpoint**: `POST /api/nego/[id]/turn`

**Request**:

```json
{ "speaker": "buyer_human" | "buyer_agent" | "seller_agent",
  "user_message": "..." }
```

**Response**: SSE stream with event types:

- `event: turn_start { speaker, turn_no }`
- `event: token { delta }` — streamed token deltas
- `event: tool_call { name, input }`
- `event: tool_result { output }`
- `event: turn_end { offer_price, full_text }` — persisted to DB before emit
- `event: state { status, next_speaker }`
- `event: done` / `event: error { code, user_message, retry_after }`

In `agent_vs_agent`, the server emits multiple consecutive turns within one request until timeout-pressure threshold (every 5 turns); client reconnects with `last_turn_no` to resume.

### Limits (initial values; tunable)

| Limit | Value |
|---|---|
| Turns per negotiation | 20 |
| Max tokens per segment | 400 |
| Max tokens per negotiation total | ~12,000 |
| Tool calls per agent per negotiation | 2 |
| Coordinator wall-clock per segment | ≤4s server-side |

---

## Error Handling & Edge Cases

### Failure matrix

| Failure | Client behavior | Server behavior | DB state |
|---|---|---|---|
| Claude API 5xx | "Agent unavailable, retry in 30s" + retry button | Route Handler catches → `event: error` | Current turn not persisted |
| Claude API timeout (>15s per segment) | Stream halts; "agent thought too long" | `AbortController.abort()` → `event: timeout` | Same |
| Client network drop (SSE break) | "Connection lost"; auto-reconnect after 10s | Reconnect carries `last_turn_no`; server resumes from DB state | Persisted turns preserved |
| Page refresh | Rehydrate negotiation history from DB; auto-resume if `status='active'` | `GET /api/nego/[id]` returns all turns + state | — |
| `tool_call` fails | "Tool call failed; agent proceeds without anchor" | Skip tool result; let agent continue without RAG data | Tool failure logged in `reasoning.errors` |
| Vercel 25s timeout | Each request bundles ≤5 turns; auto-resume next request | Server emits `event: pause` proactively at threshold | All persisted turns retained |
| Seller withdraws mid-negotiation | "Seller withdrew; negotiation ended" | Detect `artwork.status` change → `event: state` rejected | `negotiations.status = rejected` |
| Concurrent buyers on same artwork | All allowed; independent negotiations | 1:N artwork→negotiations; first ACCEPT wins | Others auto-expire (trigger) |

### Input validation

- Chat input: trim → max 200 chars → zod-validated.
- Buyer agent params: `target_price > 0`, `max_price ≥ target_price`, `max_price ≤ price_start × 1.5`.
- Listing form: image ≤ 8MB; client-side compressed via `browser-image-compression` before upload.
- All numeric fields: server-side `≥ 0 && ≤ 1,000,000`.

### Edge case design decisions

- **Spectator user closes tab mid-`agent_vs_agent`** → negotiation continues server-side until terminal state. User reopens to resume + see history.
- **Same buyer in multiple negotiations** → allowed; nav badge shows active count.
- **History playback** → DB-only render with expandable `reasoning` per turn. No SSE replay.

### Fallback principles

1. Data integrity over stream completion: each turn fully persisted before `event: turn_end` emit.
2. Agent failure does not block happy path: tool failure → fallback to anchorless reasoning; API failure → user retry or switch to `human_vs_agent`.
3. All error events to client carry `{ code, user_message, retry_after }`.
4. Agent failures logged to dedicated `nego_errors` table separate from main path.

---

## Test Strategy

### TDD pre-gate (per `~/.claude/CLAUDE.md`)

| Condition | Answer | Reasoning |
|---|---|---|
| Lifespan ≥ 3 months | ✅ yes | Long-lived portfolio asset |
| Rule-driven core | ✅ yes | Coordinator + agent reasoning + anti-cheese are clear input→rule→output |
| **Verdict** | **Apply 4-question table per module** | |

### Module-level decisions

| Module | Q1 algo/rule | Q2 silent failure | Q3 ≥3 iter | Q4 historical pain | Score | Decision |
|---|---|---|---|---|---|---|
| `agent_coordinator` | ✓ +2 | ✓ +2 | ✓ +1 | — | **5** | **TDD** |
| `agent_prompt_builder` | ✓ +2 | ✓ +2 | ✓ +1 | — | **5** | **TDD** |
| `agent_response_parser` | ✓ +2 | ✓ +2 | ✓ +1 | — | **5** | **TDD** |
| `tool_executor` | ✓ +2 | ✓ +2 | — | — | **4** | **TDD** |
| `anti_stall_judge` | ✓ +2 | ✓ +2 | — | — | **4** | **TDD** |
| `price_validation` | ✓ +2 | ✓ +2 | — | — | **4** | **TDD** |
| `sse_handler` | — | — | ✓ +1 | — | **1** | smoke-test |
| Chat UI components | — | — | ✓ +1 | — | **1** | smoke-test |
| Spectator UI | — | — | ✓ +1 | — | **1** | smoke-test |
| Supabase auth wrapper | — | — | — | — | **0** | skip |
| DB CRUD wrappers | — | — | — | — | **0** | skip |
| Stripe checkout (test mode) | — | — | — | — | **0** | skip |
| Image upload | — | — | — | — | **0** | skip |

Q5 override: not a Mac native / system-state-sensitive / WebGL project — TDD remains primary tool.

### TDD discipline (per Matt Pocock TDD skill cited in CLAUDE.md)

- **Vertical slicing**: test A → write minimal code to pass A → commit → test B → … No batch test commits.
- **Public interface only**: assert `coordinator.advance(state, input)` returns, not internal helpers.
- **Mock at system boundaries**: Anthropic API, Supabase client, `Date.now`, `Math.random` — never own modules.
- **GREEN before refactor**: while red, only "make it pass". No structural changes until green.

### Tooling

| Type | Tool | Coverage |
|---|---|---|
| Unit + integration | Vitest | 6 TDD modules |
| LLM mock | MSW intercepts Anthropic API | Preset responses per scenario |
| E2E happy path | Playwright | 3 core journey smoke-tests |
| Type check | `tsc --noEmit` | CI gate |
| Lint | ESLint + Prettier | CI gate |

### Key scenarios (to elaborate during plan phase)

**`agent_coordinator`**
- Happy path: seller pitch → buyer offer → matched offers → ACCEPTED.
- Anti-stall: 3 turns with <2% gap → median-price system turn.
- Turn limit: persistent stalemate → turn 21 transitions to STALLED.
- Seller withdraw: artwork→withdrawn mid-negotiation → REJECTED immediately.

**`agent_response_parser`**
- Standard: "I offer $150" → `offer_price=150`.
- Multiple amounts: "list $200, willing to do $150" → take last numeric.
- Talk-only: no number → `offer_price=null`.
- Mixed units: "$150 USD" / "150 美元" / "150" all parse.
- Bounds: `offer<0` throws; `offer>1M` throws.

**`tool_executor`**
- Mock DB with 5 sales → filter returns top-3.
- No match → empty array → agent must fallback.
- Per-negotiation quota: 3rd call throws `tool_quota_exceeded`.

**`anti_stall_judge`**
- 3 turns <2% gap → `{ trigger: 'mid_proposal', price: median }`.
- Gap >5% sustained → `null`.
- <2 turns of data → `null`.

### CI / pre-commit

- pre-commit: `tsc` + lint + vitest unit (changed-file scope).
- pre-push: full vitest + Playwright smoke.
- Vercel deploy gate: `build` + `tsc` + vitest full.

---

## Milestones

Ordered by dependency, no time estimates.

### M1 — Scaffold + Auth + DB schema *(blocking all)*

- Next.js + TS + Tailwind + shadcn project running.
- Supabase project provisioned; 5 tables + enums + RLS migrations applied.
- Email/password auth happy path verified on production URL.
- `comparable_sales` seed data (10-15 rows per category).

**Risk**: Supabase auth flagged "待深入验证" in tech-preferences — M1 is the validation window.

### M2 — Streaming spike *(parallel with M1)*

- `/api/spike/stream` SSE endpoint deployed.
- Vercel deployment streams 30s continuous to verify whether 25s default cuts.
- Try Edge vs Node runtime combinations.
- Output: test report on which combination achieves which duration. Append to spec appendix.

**Risk**: If 25s is a hard ceiling, Section "Streaming protocol" must change to mandate per-5-turn request boundaries from day one.

### M3 — Listing CRUD + upload + browse *(after M1)*

- Seller can create listings (image upload + form + seller_agent jsonb config).
- Browse page renders all `status='live'` artworks (RSC grid).
- Detail page (image + description + price + "Start negotiation" — disabled at this stage).
- Storage upload with client-side compression.

### M4 — TDD batch 1 *(after M1, parallel with M3)*

- `agent_prompt_builder`
- `agent_response_parser`
- `tool_executor`

Tests committed first; implementations follow per TDD discipline. All vitest tests green; MSW mock library established.

### M5 — `human_vs_agent` MVP *(after M3 + M4)*

- Negotiation page (listing card / chat) working.
- User input → `/api/nego/[id]/turn` → SSE stream of seller agent reply.
- Seller agent invokes `lookupComparableSales` and references anchors in reply.
- Each turn persisted to `negotiation_turns`.
- Acceptance → order created (`status='pending'`; Stripe deferred to M9).
- **Coordinator scope**: simple turn-based dispatch only. Full state machine + `anti_stall_judge` deferred to M6 (M5 just needs "user msg → seller agent reply → persist → loop").

**Demo recording point #1**: human vs agent with expandable reasoning.

### M6 — `anti_stall_judge` + full state machine *(after M5)*

- TDD batch 2: `agent_coordinator` + `anti_stall_judge` + `price_validation` all green.
- Coordinator owns negotiation flow; all 8 state transitions exercised.
- Mid-proposal scenario verified by manual test.

### M7 — `agent_vs_agent` + spectator page *(after M6)*

- Buyer agent config modal (target_price / max_price / style).
- Spectator UI (seller stream left / buyer stream right / progress bar).
- Server-side coordinator alternates calls; turn limit / token cap / Vercel timeout fallbacks exercised.
- Seller dashboard Realtime notification of incoming negotiation.

**Demo recording point #2 (centerpiece)**: agent vs agent with converging progress.

### M8 — Negotiation history + reasoning expand *(after M7)*

- Buyer dashboard lists negotiations sorted by recency.
- Seller dashboard lists incoming negotiations per artwork.
- History detail page renders all turns; each turn expands to show `reasoning` jsonb.

**Demo recording point #3**: AI transparency — auditable tool calls + thoughts.

### M9 — Stripe test-mode checkout *(after M5)*

- On acceptance → Stripe Checkout (test mode; card `4242 4242 4242 4242`).
- Success → `orders.status = 'paid'`.
- No webhooks — return URL handler only.

### M10 — Visual polish + demo data + case study *(after all)*

- Visual treatment on browse/negotiate/spectator pages (extend daisetz visual language).
- 30 polished demo artworks across 3 categories.
- README + case study page (technical choices + architecture diagram + 3 demo gif/videos).
- Production Vercel URL embedded in CV/portfolio.

### Dependency graph

```
M1 ─┬─→ M3 ─┬─→ M5 ─→ M6 ─→ M7 ─→ M8 ─┐
    │       │                          │
    └─→ M4 ─┘                          ├─→ M10
                                       │
M2 (spike, parallel) ────→ shapes M7   │
                                       │
                              M9 ──────┘
```

### Mandatory review gates

- **After M2 spike**: if Vercel timeout pressure is worse than expected, revise SSE protocol in Section "Streaming protocol".
- **After M5**: record demo video, show to a human for reaction before continuing M6-M8.

### Shippable checkpoint

The project is "shippable as a portfolio piece" at any of M5, M7, or M8 — each stop point adds one more demo recording.

### Implementation plan decomposition

This spec covers the full project. The next phase (`writing-plans`) should produce **multiple implementation plans**, not one mega-plan. Recommended grouping:

1. **Plan A — Foundation**: M1 + M2 + M3 (scaffold, spike, listings UI).
2. **Plan B — Single-agent core**: M4 + M5 (TDD batch 1 + human-vs-agent MVP).
3. **Plan C — Coordinator + dual-agent**: M6 + M7 (state machine + spectator page).
4. **Plan D — Polish + ship**: M8 + M9 + M10 (history view + Stripe + visual polish + case study).

Each plan should end with a shippable checkpoint and a demo recording opportunity.

---

## Known Risks

| Risk | Mitigation |
|---|---|
| Supabase auth integration friction (untested in user's stack) | M1 is the validation window; if blocked, fallback to NextAuth |
| Vercel 25s streaming hard limit on dual-agent flows | M2 spike + per-5-turn request boundary fallback |
| Stripe Japan payments unverified | Stay in test mode USD only; out of scope for portfolio |
| Agent vs agent stuck in cosmetic loop | `anti_stall_judge` median-price mediation + 20-turn limit |
| Agent vs agent collusion (instant agreement) | seller forced 2-turn hold; buyer first offer ≥ 0.7 × `price_start` |
| Token cost blowout during demo recording | Per-negotiation 12k cap; seg `max_tokens=400` |
| Scope creep diluting agent emphasis | Out-of-scope list in this spec is the contract |

---

## Open Questions

None at spec finalization. Resolved during brainstorming:

- ~~Project name~~ → `art-bargain`
- ~~Approach selection~~ → Approach A (dual agent + tool use)
- ~~Category lock~~ → multi-category, category-aware
- ~~Scope tier~~ → full registerable app
- ~~Anti-stall mechanism~~ → median-price mediation
- ~~Comparable_sales retrieval~~ → SQL with jsonb filters (not pgvector)
- ~~E2E testing~~ → Playwright smoke-tests for 3 journeys
- ~~Spec location~~ → `docs/superpowers/specs/`

---

## Appendix — Brainstorming source

This spec captures decisions made during the 2026-05-17 brainstorming session. Decisions and trade-offs are listed in order:

1. Motivation: portfolio / technical demo (not commercial).
2. Tech highlight: AI integration (negotiation agent).
3. Scope: full registerable app (accepting scaffold cost; agent layer must carry ≥50%).
4. Category: multi-category same-stage.
5. Architecture: Approach A — dual agent optional + tool use for valuation.
6. Streaming: SSE not WebSocket.
7. LLM: Claude Sonnet 4.6 (not Opus — cost/quality balance).
8. Spike for 25s timeout: in M1-M2 window.
9. Agent config: jsonb inline, not separate tables.
10. RAG: SQL jsonb filters, not pgvector.
11. Reasoning field: jsonb persisted (portfolio "AI transparency" anchor).
12. Anti-stall: median-price mediation.
13. Anti-injection: prompt + server regex (warn, not block).
14. Initial limits: 20 turns / 400 max_tokens / 12k total accepted.
15. Edge case A (close tab): agent continues server-side.
16. History view: DB render, no SSE replay.
17. Testing: MSW for Claude mock; Playwright for happy path E2E.
18. TDD: 6 modules, batch 1 (#4-6) → integration → batch 2 (#1-3 + #5-6).
19. M2 spike parallel with M1.
20. Insert "demo + human reaction" review gate after M5.
