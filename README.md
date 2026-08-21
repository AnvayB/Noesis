# Noesis

A personal learning app where explaining what you've learned gradually grows an
evolving knowledge landscape — not streaks, XP, or a progress bar. See
`prompt.md` for the full product spec and `.claude/plans/` history for the
architecture plan this was built from.

## Pages

- **Home** (`/`) — Mindscape preview, backlog, recent sessions, curiosity inbox.
- **Learn** (`/sessions`) — add learning material (title, AI-suggested topic,
  resource type, environment/activity mode), start/complete sessions, and
  explain back what you learned for LLM-graded feedback.
- **Practice** (`/practice`) — casual recall quizzes and "explain it to a
  nontechnical person" speaking prompts, generated from concepts you've
  already logged.
- **Mindscape** (`/mindscape`) — the force-directed concept graph: nodes are
  concepts you've learned about, edges are LLM-inferred relationships between
  them, both built up incrementally from your explain-backs.
- **Learn Noesis** (`/learn-noesis`) — a self-study curriculum on how this app
  is actually built, graded against the real implementation (see
  `lib/curriculum/`).
- **Arteris 101** (`/arteris-101`) — a second curriculum track teaching
  semiconductor/SoC/interconnect fundamentals and the Arteris product lineup;
  a second, generalized use of the same curriculum engine as Learn Noesis (see
  the "Multi-Track Curriculum" module inside Learn Noesis itself for how the
  two share one grading system).

## Setup

```bash
cp .env.local.example .env.local   # then fill in OPENAI_API_KEY
npm install
npm run db:generate                # only needed after changing lib/db/schema.ts
npm run dev
```

By default the database is an embedded libSQL file (`noesis.db`), and its
migrations are applied automatically on first use — no separate migrate step
needed locally.

## Deploying (Vercel + Turso)

Vercel's serverless functions have an ephemeral, often read-only filesystem,
so the local `noesis.db` file can't live there. Point the app at a hosted
[Turso](https://turso.tech) database instead — same libSQL driver, same
schema, just a different URL:

```bash
turso db create noesis
turso db show noesis --url            # → TURSO_DATABASE_URL
turso db tokens create noesis         # → TURSO_AUTH_TOKEN
npm run db:migrate                    # applies drizzle/ migrations to it directly
```

Set `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, and `OPENAI_API_KEY` as
environment variables in the Vercel project, then deploy as normal. The app
picks up `TURSO_DATABASE_URL` automatically — no code changes needed between
local dev and production. (The app also re-runs migrations at runtime on
cold start as a local-dev convenience; that's harmless against Turso too
since each migration is idempotent, but for a busier deployment prefer
relying on the `db:migrate` step above and dropping the runtime call in
`lib/db/index.ts`.)

`/api/export` (the one-click SQLite backup) only works in local-file mode —
against a hosted Turso database it returns a 501 pointing at Turso's own
backup/replication instead.

## Project layout

- `app/` — Next.js App Router pages and route handlers
- `lib/db/` — Drizzle schema, migrations (`drizzle/`), and the DB client
  (`getDb()` — async, since libSQL is a network-capable driver)
- `lib/ai/` — provider-agnostic LLM interface (`types.ts`), zod schemas for
  structured outputs (`schemas.ts`), and adapters (`providers/`). The OpenAI
  adapter is the V1 default; add a new file in `providers/` and a case in
  `index.ts` to support Claude or a local model later — application code
  should only ever import `{ ai }` from `lib/ai`, never a provider SDK.
- `lib/curriculum/` — content-as-code curriculum modules (`modules/*.ts`),
  each tagged with a `track` (`"noesis"` or `"arteris"`). Adding a module is a
  new file plus one entry in `index.ts`, no migration required; adding a
  whole new track is a new `CURRICULUM_TRACKS` entry, a nav item, and two thin
  page wrappers (see `app/arteris-101/` for the pattern).

## Scripts

- `npm run dev` — start the dev server
- `npm run lint` — eslint
- `npm run db:generate` — generate a new migration from schema changes
- `npm run db:migrate` — apply pending migrations directly (deploy step)
- `npm run db:studio` — browse the database
