# Plan A — Foundation (M1 + M2 + M3)

| Field | Value |
|---|---|
| Date | 2026-05-17 |
| Status | Draft — awaiting user review |
| Source spec | `docs/superpowers/specs/2026-05-17-art-bargain-design.md` |
| Scope | M1 (scaffold + auth + DB) + M2 (streaming spike) + M3 (listings CRUD + browse) |
| Out of scope | Agents, negotiations, orders, Stripe checkout, polish — deferred to Plans B/C/D |

---

## Goal

End of Plan A, the project must satisfy:

1. **Deployed app on Vercel** with a public URL.
2. **Auth works**: email/password signup → login → logout → access-protected dashboard.
3. **Sellers can list artworks**: form (with category-specific fields) + image upload + publish/withdraw.
4. **Browse page renders all `live` listings** with detail page (negotiation button **present but disabled**, with `data-test-id="start-nego-disabled"`).
5. **Streaming spike report committed** to spec appendix: which Vercel runtime sustains how many seconds of SSE on this stack.
6. **`comparable_sales` table seeded** with 30-45 demo rows (10-15 per category).

If any item above fails the smoke-test checklist (§ Smoke Test), Plan A is not done.

---

## Prerequisites (user must provide before T1 starts)

| Resource | Status check | Notes |
|---|---|---|
| Supabase account + new project | User confirms project URL ready | Free tier OK; project name `art-bargain` |
| Vercel account linked to GitHub | User confirms | Will deploy from this repo |
| Anthropic API key | User has key ready | Used only for T7 spike echo agent; no negotiation logic yet |
| GitHub repo `art-bargain` (private) | Created or to be created in T1 | |
| Node v20 + pnpm installed | `node -v && pnpm -v` | Verify before T1 |

**Decision point before T1**: do you want to push to a public or private GitHub repo? (Plan defaults to private until M10 case study is ready.)

---

## Task graph (dependencies)

```
T1 scaffold ─┬─→ T2 supabase env ─→ T3 DB migration + seed ─→ T4 auth happy path
             │
             ├─→ T6 anthropic env ─→ T7 SSE spike (vercel)
             │
             └─→ T13 vercel deploy gate (early)

T4 → T8 listing form
T3 + T4 → T9 image upload
T8 + T9 → T10 listing CRUD server actions
T10 → T11 browse page (RSC)
T10 → T12 detail page
T11 + T12 → T14 final smoke + spike report commit
```

Critical path: T1 → T2 → T3 → T4 → T8 → T9 → T10 → T11/T12 → T14.

Parallel-safe: T5 (Stripe env stub), T6, T7 can run alongside T2-T4.

---

## Tasks

### T1 — Scaffold + tooling baseline

**Goal**: a Next.js 14 App Router + TS + Tailwind + shadcn + ESLint + Prettier project that builds locally.

**Actions**:
1. `cd ~/Desktop/Projects/art-bargain && pnpm create next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*" --eslint`
2. Install shadcn: `pnpm dlx shadcn@latest init` (defaults: New York / Slate / CSS variables).
3. Add base shadcn components: `pnpm dlx shadcn@latest add button card form input label progress textarea select badge dialog toast`
4. Add Prettier + lint-staged + husky pre-commit hook running `tsc --noEmit && pnpm lint`.
5. `.env.example` with placeholder keys (Supabase, Anthropic, Stripe).
6. `.gitignore` includes `.env*.local`, `node_modules`, `.next`, `.vercel`.
7. `README.md` with: project description, local run instructions, env var checklist (per CLAUDE.md project rules).

**Verification**:
- `pnpm dev` shows Next.js welcome page at `localhost:3000`.
- `pnpm build` succeeds.
- `pnpm lint && pnpm tsc --noEmit` clean.
- `git status` shows no tracked changes after build (build outputs ignored).

**Commit**: `chore: scaffold next.js + ts + tailwind + shadcn`

---

### T2 — Supabase client + env wiring

**Goal**: app can talk to Supabase from both server and client.

**Actions**:
1. `pnpm add @supabase/supabase-js @supabase/ssr`
2. Create `src/lib/supabase/server.ts` and `src/lib/supabase/client.ts` per Supabase Next.js App Router pattern (cookies-based session).
3. Add to `.env.local` (user fills in values; document in `.env.example`):
   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=        # server-only, for migrations + admin tasks
   ```
4. Add **runtime startup check** in `next.config.ts` (per CLAUDE.md defense rule "if project has env var"): build fails if `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are missing or contain whitespace.
5. Add `src/app/api/health/route.ts` that pings Supabase REST endpoint and returns `{ ok: true }`.

**Verification**:
- `curl http://localhost:3000/api/health` → `{"ok":true}`.
- `unset NEXT_PUBLIC_SUPABASE_URL && pnpm build` → build fails with clear error message.

**Commit**: `feat(supabase): client setup + env runtime check + health endpoint`

---

### T3 — Database migrations + seed

**Goal**: 5 tables + enums + RLS + seeded `comparable_sales` live in Supabase.

**Actions**:
1. `pnpm add -D supabase` (CLI). `pnpm supabase init` in repo.
2. `pnpm supabase link --project-ref <ref>` (user provides ref).
3. Write migration `supabase/migrations/0001_init.sql` containing:
   - 5 enum types: `artwork_category`, `artwork_status`, `nego_mode`, `nego_status`, `turn_speaker`, `order_status`.
   - 5 tables per spec § Data Model.
   - RLS policies per spec § "RLS overview".
4. Write seed `supabase/seed.sql`:
   - 15 poster rows (mix of signed/unsigned, edition counts A2-A4).
   - 15 painting rows (mix of mediums, dimensions).
   - 15 photography rows (mix of edition sizes, paper types).
   - Each row's `meta` jsonb must match the category's expected filter dimensions.
5. `pnpm supabase db push` (apply migrations to remote project).
6. `pnpm supabase db reset` locally to verify seed runs clean.
7. Generate TS types: `pnpm supabase gen types typescript --linked > src/lib/supabase/database.types.ts`.

**Verification**:
- Supabase dashboard SQL editor: `SELECT count(*) FROM comparable_sales GROUP BY category` → 3 rows, each ~15.
- Trying to write to `artworks` without auth → RLS blocks.
- `src/lib/supabase/database.types.ts` exists and types compile.

**Commit**: `feat(db): initial schema + RLS + comparable_sales seed`

---

### T4 — Auth happy path

**Goal**: signup → login → logout → protected `/dashboard` working end-to-end. This validates the Supabase auth flow flagged as "untested" in tech-preferences.

**Actions**:
1. Server actions in `src/app/(auth)/actions.ts`: `signup`, `login`, `logout` using Supabase SSR helpers.
2. Pages:
   - `src/app/(auth)/login/page.tsx` (email + password form)
   - `src/app/(auth)/signup/page.tsx` (email + password + confirm)
   - `src/app/(auth)/auth-callback/route.ts` (email confirmation handler)
3. `src/app/dashboard/page.tsx` — RSC that calls `supabase.auth.getUser()` and redirects to `/login` if null.
4. `src/middleware.ts` — refresh session cookies on every protected route per Supabase SSR docs.
5. Toast notifications on signup success / login error (shadcn `toast`).

**Verification (manual on `localhost:3000`)**:
1. Signup with `test@example.com` → see email confirmation prompt.
2. Click confirm link in Supabase auth email → redirected to dashboard.
3. Logout → redirected to login.
4. Hit `/dashboard` directly while logged out → redirected to `/login`.

**Risk note**: tech-preferences flags Supabase auth as "待深入验证" — if any of the 4 steps above fails, **STOP and diagnose root cause before continuing**. Do not paper over with NextAuth fallback unless 1 hour of debugging fails.

**Commit**: `feat(auth): email+password signup/login/logout + protected dashboard`

---

### T5 — Stripe env stub

**Goal**: Stripe library installed + test-mode keys in env. **No checkout integration yet** (that's M9, Plan D).

**Actions**:
1. `pnpm add stripe @stripe/stripe-js`
2. Add to `.env.local` and `.env.example`:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```
3. Add a `src/lib/stripe.ts` exporting `getStripe()` that lazy-initializes the client (used later).
4. Document in README that this project uses Stripe test mode only.

**Verification**:
- `import { stripe } from '@/lib/stripe'` compiles.
- No runtime call yet.

**Commit**: `chore(stripe): library + test-mode env stub`

---

### T6 — Anthropic SDK env + minimal echo route

**Goal**: API key wired + a `/api/spike/echo` Route Handler that calls Claude Sonnet 4.6 once and returns the response. Used as the baseline for T7 SSE spike.

**Actions**:
1. `pnpm add @anthropic-ai/sdk`
2. Add to `.env.local` and `.env.example`:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```
3. Create `src/app/api/spike/echo/route.ts`:
   - Reads `prompt` from query string.
   - Non-streaming call to `claude-sonnet-4-6` with `max_tokens=200`.
   - Returns JSON `{ text, usage }`.

**Verification**:
- `curl 'http://localhost:3000/api/spike/echo?prompt=say+hi'` → returns Claude's response with non-zero usage.

**Risk**: Anthropic SDK method names must match current docs. Verify `client.messages.create(...)` signature against current Anthropic SDK before writing code (do not write from memory).

**Commit**: `feat(spike): anthropic sdk echo route`

---

### T7 — SSE streaming spike on Vercel

**Goal**: Determine which Vercel runtime sustains how many seconds of SSE streaming. Output: a written report appended to spec § Appendix.

**Actions**:
1. Create `src/app/api/spike/stream/route.ts`:
   - Streams Claude response token-by-token using `client.messages.stream(...)`.
   - Prompt: "Count from 1 to 60 slowly with brief commentary on each number" (designed to elicit ~30-60s of streaming).
   - Wrap in `ReadableStream` → return as `Response` with `text/event-stream` headers.
2. Add **two variants** of the route:
   - `src/app/api/spike/stream-node/route.ts` with `export const runtime = 'nodejs'`
   - `src/app/api/spike/stream-edge/route.ts` with `export const runtime = 'edge'`
3. Deploy to Vercel preview.
4. Manually `curl` each endpoint with `--no-buffer` against the **production URL** (not localhost) and time how long each sustains streaming before cutting off.
5. Try a 3rd variant: `maxDuration = 60` config in `route.ts`.
6. **Write report** `docs/superpowers/specs/2026-05-17-art-bargain-design.md` § Appendix B with table:
   - Runtime / config / observed cut-off duration / verdict (use for dual-agent? yes/no).
7. If 25s is hard cutoff under all configs → log decision: `agent_vs_agent` must split per 5 turns.

**Verification**:
- Spec appendix B exists with the table populated.
- Test command + raw output saved in `docs/spike-evidence/` (gitignored from main artifacts but committed for reproducibility).

**Risk note**: Vercel timeout behaviors change between platform versions. Tests must run on **the actual production deployment**, not local dev. Do not trust local `pnpm dev` timing.

**Commit**: `feat(spike): SSE streaming runtime comparison + report`

---

### T8 — Listing form UI (no submission yet)

**Goal**: form component that captures all `artworks` fields plus `seller_agent` config and `category_meta`, with category-dependent fields.

**Actions**:
1. Define zod schemas in `src/lib/schemas/artwork.ts`:
   - Base: title, description, category, price_start, price_floor.
   - Per-category meta:
     - poster: `{size: 'A2'|'A3'|'A4', print_run: number, signed: boolean, edition_no?: number}`
     - painting: `{medium: string, width_cm: number, height_cm: number}`
     - photography: `{print_size: string, paper: string, edition_size: number}`
   - seller_agent: `{style: 'firm'|'friendly'|'scholarly', urgency: 1-5, persona_prompt?: string}`
2. Build `src/components/ListingForm.tsx` using shadcn `Form` + `react-hook-form` + zod resolver.
3. Category dropdown drives which meta fields render (conditional rendering via `useWatch`).
4. Form submits to a stub server action that just logs to console (real persistence is T10).

**Verification**:
- All 3 categories render different field sets on switch.
- Validation errors show inline (negative price, missing required, etc.).
- Submitting valid form logs the parsed object to console.

**Commit**: `feat(listing): listing form with category-aware fields + zod`

---

### T9 — Image upload to Supabase Storage

**Goal**: client compresses image then uploads to Supabase Storage bucket; returns public URL + thumb URL.

**Actions**:
1. `pnpm add browser-image-compression`
2. Create Supabase Storage bucket `artworks` (public read, authenticated write) via migration `0002_storage.sql`.
3. Create `src/components/ImageUploadField.tsx`:
   - Drop zone + file picker (max 8MB, jpg/png/webp).
   - Client-side compress to max 1600px longest edge, quality 0.85 → original.
   - Also generate a 400px thumb.
   - Upload both to `artworks/{userId}/{uuid}-{original|thumb}.webp`.
   - Returns `{ image_url, thumb_url }` to form.
4. Integrate into `ListingForm`.

**Verification**:
- Upload an 8MB JPEG → compressed to ~200-500KB before upload.
- Both `image_url` and `thumb_url` accessible via direct browser URL.
- Storage policies: unauthenticated user can read, only seller can write own folder.

**Commit**: `feat(upload): supabase storage with client-side compression`

---

### T10 — Listing server actions (create / publish / withdraw)

**Goal**: form submission persists to `artworks`. Seller can publish (`status='live'`) or withdraw (`status='withdrawn'`).

**Actions**:
1. `src/app/(seller)/listings/actions.ts`:
   - `createListing(formData)` — validates with zod, inserts row with `status='draft'`.
   - `publishListing(id)` — verifies seller ownership, sets `status='live'`.
   - `withdrawListing(id)` — sets `status='withdrawn'`.
   - All use Supabase server client; RLS enforces ownership.
2. `src/app/(seller)/listings/new/page.tsx` — wraps `ListingForm`, on submit calls `createListing` then redirects to seller listing detail.
3. `src/app/(seller)/listings/page.tsx` — seller's own list of artworks with publish/withdraw buttons.

**Verification**:
- Create listing → row appears in `artworks` with `status='draft'`.
- Publish → status flips to `live`.
- Logging in as different user and trying `publishListing(otherUserId)` → RLS rejects.

**Commit**: `feat(listing): create/publish/withdraw server actions`

---

### T11 — Browse page (public RSC)

**Goal**: anyone can browse all `status='live'` listings as a card grid.

**Actions**:
1. `src/app/(public)/browse/page.tsx` — RSC, queries `artworks` where `status='live'` ordered by `created_at desc`.
2. `src/components/ArtworkCard.tsx` — image (thumb_url) + title + category badge + price_start.
3. Category filter (querystring driven, e.g. `?category=poster`).
4. Empty state if no listings.

**Verification**:
- Browse page shows all published listings.
- Filter by category narrows correctly.
- Page loads without auth (anonymous user).
- No `status='draft'` or `status='withdrawn'` listings visible.

**Commit**: `feat(browse): public browse page with category filter`

---

### T12 — Listing detail page (button disabled)

**Goal**: detail page showing one artwork, with "Start Negotiation" button visually present but `disabled` (because negotiation lives in Plan B).

**Actions**:
1. `src/app/(public)/artwork/[id]/page.tsx` — RSC, fetches one artwork by id, 404 if not `live`.
2. Layout: large image left, metadata right (title, description, price, category meta).
3. "Start Negotiation" button with `disabled` attribute + `data-test-id="start-nego-disabled"` and tooltip "Coming in Plan B".
4. Owner-aware: if viewer is the seller, show "This is your listing" badge instead of button.

**Verification**:
- Detail page renders all fields correctly per category.
- Button is visibly disabled and has tooltip.
- Direct URL to a `withdrawn` artwork returns 404.

**Commit**: `feat(listing): public detail page (negotiation button disabled)`

---

### T13 — Vercel deploy + production smoke

**Goal**: project deployed to Vercel; T1-T12 features all work on production URL.

**Actions**:
1. Create GitHub repo `art-bargain` (private). `cd ~/Desktop/Projects/art-bargain && gh repo create art-bargain --private --source=. --remote=origin`
2. **Push verify 3 steps before push** (per CLAUDE.md feedback_push_verify_3step):
   - Local vs remote parity check.
   - Verify built artifacts (`pnpm build` clean).
   - Critical files exist: `README.md`, `.gitignore`, `package.json`, `src/`.
3. `git push -u origin main`.
4. `vercel link` → connect to project. `vercel env pull` to verify env vars.
5. Set production env vars in Vercel dashboard: all keys from `.env.example`.
6. `cd ~/Desktop/Projects/art-bargain && vercel --prod` (per CLAUDE.md feedback_cwd_explicit_deploy).
7. Wait for "Ready" status (60-90s); verify timestamp is after push.
8. Add `package.json` script: `"deploy": "vercel --prod && pnpm smoke:prod"`.

**Verification (run on production URL)**:
- Signup → confirm email → login → dashboard renders.
- Create listing (with image upload) → publish.
- Logout → browse page shows the listing.
- Detail page renders with disabled negotiation button.

**Commit (during, not after)**: `feat(deploy): vercel production deployment configured`

---

### T14 — Final smoke checklist + spec appendix lock

**Goal**: complete the Plan A "Definition of Done" checklist; commit the spike report from T7 into the spec; tag commit.

**Actions**:
1. Run the **Smoke Test** checklist (next section) against production URL.
2. Confirm T7 spike report is appended to spec § Appendix B and committed.
3. Update root `README.md` with: live URL, Plan A scope summary, link to spec.
4. Tag commit: `git tag -a m3-done -m "Plan A complete"`.

---

## Smoke Test Checklist (Plan A done criteria)

Run **on the production Vercel URL** (not localhost). Each item must pass — any failure means Plan A is not done.

### Auth
- [ ] Signup with new email → email confirmation received → confirmation link works
- [ ] Login with confirmed account → lands on `/dashboard`
- [ ] Logout → redirected to login
- [ ] Direct access to `/dashboard` while logged out → redirected to `/login`

### Listing flow
- [ ] Logged-in user can access `/listings/new`
- [ ] Form switches fields when category changes (poster/painting/photography)
- [ ] Invalid input shows zod-driven validation errors
- [ ] Image upload accepts 8MB JPEG, compresses, both `image_url` and `thumb_url` viewable
- [ ] Submit valid form → row in `artworks` table with `status='draft'`
- [ ] Publish action flips status to `live`
- [ ] Withdraw action flips status to `withdrawn`

### Browse + detail
- [ ] Logged-out user can access `/browse`
- [ ] All and only `status='live'` artworks appear
- [ ] Category filter narrows correctly
- [ ] Click card → detail page renders full metadata + image
- [ ] Detail page "Start Negotiation" button visible but disabled with tooltip
- [ ] Direct URL to a `withdrawn` artwork → 404
- [ ] Detail page works for unauthenticated user

### Streaming spike
- [ ] `/api/spike/stream-node` deployed and accessible
- [ ] `/api/spike/stream-edge` deployed and accessible
- [ ] Spike report committed to spec § Appendix B
- [ ] Decision recorded: dual-agent must / need not split requests (depending on findings)

### Data integrity
- [ ] `comparable_sales` table has ≥30 rows
- [ ] RLS verified: unauthenticated user cannot write any table
- [ ] Generated `database.types.ts` matches actual schema (`pnpm supabase gen types` clean)

### Infra
- [ ] Vercel deploy succeeded; timestamp > last git push
- [ ] All env vars set in Vercel dashboard
- [ ] `pnpm build && pnpm lint && pnpm tsc --noEmit` all clean locally
- [ ] Pre-commit hook fires on commit

---

## Out of Plan A (do **not** do here)

- ❌ Any negotiation page, chat UI, or `/api/nego/*` route
- ❌ Agent prompt construction or tool wiring beyond T7 spike
- ❌ Stripe checkout integration (T5 only installs library)
- ❌ Vitest unit tests — TDD batch 1 starts in Plan B
- ❌ Playwright E2E suite — set up in Plan B alongside the agent layer
- ❌ Buyer dashboard or negotiation history
- ❌ Visual polish beyond shadcn defaults
- ❌ Multi-language UI

---

## Risks specific to Plan A

| Risk | Mitigation |
|---|---|
| Supabase auth integration friction | T4 has explicit "stop and diagnose" rule. 1-hour timeout before considering NextAuth fallback. |
| Vercel 25s timeout cuts SSE spike short | T7 explicitly tests 3 configurations and writes findings. Outcome shapes Plan C. |
| RLS policy errors hidden until runtime | T3 verification includes manual RLS test; T11 must verify only `status='live'` leaks. |
| Image storage costs balloon during dev | T9 includes client-side compression to bound payload sizes. |
| Anthropic SDK signature drift | T6 explicitly says verify against current docs, do not write from memory (per CLAUDE.md rule #4). |

---

## Review gates inside Plan A

1. **After T3** (DB up): pause to verify schema makes sense given the spec. Any missing field is much cheaper to add now than after Plan B starts.
2. **After T4** (auth works): the riskiest piece is done. If T4 took >2x expected effort, stop and reassess Plan A scope.
3. **After T7** (spike done): the streaming verdict shapes Plan C. Update the spec § Appendix B before continuing T8+.
4. **After T13** (deployed): full smoke test on production. Any failed checklist item blocks Plan A completion.

---

## When Plan A is done

- All Smoke Test items checked.
- Tag `m3-done` exists.
- README has live Vercel URL.
- Spec § Appendix B has spike report.

Then proceed to **Plan B — Single-agent core (M4 + M5)**, which introduces:
- TDD batch 1 (agent_prompt_builder + agent_response_parser + tool_executor)
- Negotiation page UI
- `human_vs_agent` end-to-end flow
- First demo recording opportunity
