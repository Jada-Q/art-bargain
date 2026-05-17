# Plan C — Coordinator + Dual-Agent (M6 + M7)

| Field | Value |
|---|---|
| Date | 2026-05-18 |
| Status | Draft |
| Source spec | `docs/superpowers/specs/2026-05-17-art-bargain-design.md` |
| Predecessor | Plan B — tag `b-done` |
| Scope | M6 (TDD batch 2) + M7 (agent_vs_agent + spectator page) |

---

## Goal

End of Plan C:

1. **3 new TDD modules green** (TDD batch 2):
   - `price_validation` — guards offer_price + agent param bounds.
   - `anti_stall_judge` — detects N consecutive turns with sub-Δ% gaps → median mediation.
   - `agent_coordinator` — full state machine taking { state, event } → { next_state, side_effects }.
2. **Demo recording point #2 (centerpiece)**: spectator page at `/nego/[id]` in `agent_vs_agent` mode shows two streams converging on a price with a progress bar.
3. **Dispatch-agent modal** on `/artwork/[id]`: buyer can choose "Negotiate myself" or "Dispatch agent" (set target / max / style).
4. **Anti-cheese enforced**: buyer first offer ≥ 0.7 × price_start; seller holds 2 turns; tool-quota at 2/nego; 20-turn cap; mediation triggers.
5. **Buyer agent system prompt** built symmetrically to seller (own module).

---

## Out of scope (Plan D)

- Stripe real checkout
- M8 history reasoning expand
- Visual polish
- Case study README + demo gif

---

## Task graph

```
TC0 plan doc
  │
  ├─→ TC1 price_validation TDD ────┐
  ├─→ TC2 anti_stall_judge TDD ────┼─→ TC4 integrate coordinator into existing /api/nego/[id]/turn (replace M5 simple orchestrator)
  └─→ TC3 agent_coordinator TDD ───┘                                    │
                                                                        ▼
                                            TC5 buyer prompt builder
                                                  │
                                                  ▼
                                            TC6 dual-agent SSE route (mode='agent_vs_agent')
                                                  │
                                                  ▼
                                            TC7 spectator page UI (split streams + progress bar)
                                                  │
                                                  ▼
                                            TC8 dispatch-agent modal on detail page
                                                  │
                                                  ▼
                                            TC9 e2e smoke + demo + tag c-done
```

---

## Tasks (concise)

### TC1 — price_validation TDD
- `validateBuyerOffer({ offer, price_start, isFirstTurn })`: throws if `<0`, `>1M`, or (isFirstTurn && offer < 0.7 * price_start).
- `validateSellerOffer({ offer, price_floor })`: throws if `offer < price_floor` or `offer < 0`.
- Pure functions, no I/O.
- ~6 tests.

### TC2 — anti_stall_judge TDD
- `judgeStall(turns, opts?)` → `{ trigger: 'mid_proposal', price: number } | null`.
- Trigger when last 3 turns each have offer_price and pairwise gap ≤ 2%.
- median = (max + min) / 2 rounded to integer.
- ~5 tests.

### TC3 — agent_coordinator TDD
- `advance(state, event)` pure reducer over enum state + event union.
- States: `pending`, `seller_open`, `waiting_for_buyer`, `waiting_for_seller`, `mediation`, `accepted`, `rejected`, `stalled`.
- Events: `buyer_message`, `seller_message`, `accept`, `reject`, `turn_limit_hit`, `mediation_resolved`.
- ~8 tests covering all transitions + invalid transitions.

### TC4 — integrate coordinator into SSE route
- Refactor `/api/nego/[id]/turn` POST to delegate state transitions to `agent_coordinator.advance`.
- Server emits `event: state { status, next_speaker }` after each transition.
- Apply `validateBuyerOffer` on incoming `buyer_message`; reject 400 with clear message if first turn under 70%.
- Apply `judgeStall` after each turn; on trigger, emit `event: state { status: 'mediation', proposed_price }` and pause for buyer accept/reject.

### TC5 — buyer prompt builder
- `buildBuyerSystemPrompt(input)`: same shape as seller but buyer-side goals + private constraints (target, max).
- `buyer first offer ≥ 0.7 × price_start` rule baked into the prompt itself.
- ~6 tests (mirror of TB2).

### TC6 — dual-agent route
- New endpoint `POST /api/nego/[id]/auto`:
  - Body: empty or `{ stop_at_turn?: number }`.
  - Auth: buyer only; requires `mode='agent_vs_agent'` and `buyer_agent` non-null.
  - SSE: emits alternating buyer_agent / seller_agent turns until `accepted` / `rejected` / `stalled` / `turn_count=20`.
  - Coordinator drives transitions; tool quota tracked across both sides.

### TC7 — spectator page UI
- Reuse `/nego/[id]/page.tsx` but branch on `mode`:
  - `human_vs_agent`: keep current chat UI.
  - `agent_vs_agent`: render two streaming columns + center progress bar (buyer offer vs seller offer vs price_start anchor).
- Auto-start button at top: "▶ Run negotiation" calls `/api/nego/[id]/auto` and consumes SSE.
- After done: show accept summary.

### TC8 — dispatch-agent modal
- On `/artwork/[id]`, "Start negotiation" now opens a modal:
  - 2 cards: "Negotiate myself" (mode=human_vs_agent) vs "Dispatch agent" (mode=agent_vs_agent + inputs).
  - Dispatch fields: target_price, max_price, style (firm/friendly/scholarly).
- Submit → server action `startNegotiation(artworkId, mode, buyer_agent)` → redirect.

### TC9 — e2e smoke + demo + tag c-done
- Manual happy path on prod for both modes.
- Record gif of `agent_vs_agent` 5-10 turn run to `docs/demos/m7-spectator.gif`.
- Tag `c-done`.

---

## TDD discipline (continuing from Plan B)

For TC1, TC2, TC3, TC5: tests → minimum impl → green → single commit per module. Per CLAUDE.md TDD pre-gate, these 4 score ≥4 each (all are pure rules / silent failures / iterated). Continue MSW mock at Anthropic boundary.

---

## Risks

| Risk | Mitigation |
|---|---|
| Coordinator state machine has more edges than expected | TDD will surface them; commit per transition |
| dual-agent collusion (instant agreement) | Anti-cheese: buyer first offer cap + seller 2-turn hold (verified in `price_validation`) |
| Single-request 20-turn run hits some other Vercel cap | T7 spike showed 77s+ headroom; if it doesn't, fall back to client-side pause/resume |
| Cost during dev recording | 12k token cap per nego in coordinator |
