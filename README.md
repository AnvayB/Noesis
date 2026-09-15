# Noesis

A personal learning app where explaining what you've learned gradually grows an
evolving knowledge landscape — not streaks, XP, or a progress bar. See
`prompt.md` for the full product spec and `.claude/plans/` history for the
architecture plan this was built from.

## Pages

Three places, plus the pages they open.

- **Now** (`/`) — the Mindscape, this week's one thing, anything in progress
  with a Continue, the daily recall question, and the capture field.
- **Learn** (`/learn`) — the capture field (paste a link or write a question;
  Start now or Keep for later), what is in progress, what is kept for later,
  open questions, and links to History, the detailed add form, and the tracks.
- **Mindscape** (`/mindscape`) — the map on its own. Threads are what you have
  explained, cords what you have connected, contours what has stayed.
- **Session** (`/sessions/[id]`) — the resource (YouTube embeds inline), the
  writing sheet, and after an explanation the Reflect view: what you
  connected, what the map did, what you left out, and a capture field
  prefilled with the follow-up question.
- **Concept** (`/concepts/[slug]`) — a concept's story: explanations over
  time, recalls, connections, and a "say it out loud" prompt.
- **History** (`/sessions`) — every session, filterable. `/sessions/new` is the
  detailed add form for when a link is not enough.
- **Tracks** — `/learn-noesis` and `/arteris-101`, graded self-study
  curricula, reached from Learn (see `lib/curriculum/`).

The core loop: capture → start → learn from the source → explain in your
own words → see what the map did → keep or start the next question.

If `OPENAI_API_KEY` is missing or the model call fails, an explanation is
still saved and the session page offers "Read it now" to retry; concept
names fall back to the source title until the model is available.

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
