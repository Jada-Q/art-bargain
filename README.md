# art-bargain

A multi-category art marketplace where every listing carries an LLM negotiation agent. Buyers can either negotiate themselves or dispatch their own agent — producing an "agent vs agent" live-streamed bargaining flow.

Portfolio / technical demo. **Not** a commercial SaaS.

---

## Stack

- Next.js 16 (App Router) · TypeScript · Tailwind v4 · shadcn (base-ui preset)
- Supabase (Auth · Postgres · Storage · Realtime)
- Anthropic Claude API (`claude-sonnet-4-6`) — streaming + tool use
- Stripe test mode (checkout happy path only)
- Vercel deployment

---

## Local development

### Prerequisites

- Node ≥ 20 (tested on v22)
- pnpm 10+
- Supabase project (free tier)
- Anthropic API key
- Stripe test-mode keys

### Setup

```bash
pnpm install
cp .env.example .env.local
# Fill .env.local with real values — see "Env vars" below
pnpm dev
```

App runs at `http://localhost:3020`.

### Env vars

All keys listed in `.env.example`. Fill `.env.local` with real values.

**Use `printf` not `echo`** when setting values from the shell, to avoid hidden trailing newlines that cause silent auth failures.

```bash
printf 'sk-ant-real-key-here' > /tmp/key && cat /tmp/key >> .env.local
```

Build will fail if `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are missing or contain whitespace.

### Scripts

| Command | Purpose |
|---|---|
| `pnpm dev` | Dev server on `:3020` |
| `pnpm build` | Production build |
| `pnpm start` | Production server on `:3020` |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm format` | Prettier write |
| `pnpm format:check` | Prettier check only |

Pre-commit hook runs `lint-staged` + `typecheck`.

---

## Design docs

- Spec: `docs/superpowers/specs/2026-05-17-art-bargain-design.md`
- Plan A (Foundation): `docs/superpowers/plans/2026-05-17-plan-a-foundation.md`
- Future plans (B/C/D) to be added as M4+ work begins.

---

## Status

Plan A — **in progress** (T1 scaffold underway).
