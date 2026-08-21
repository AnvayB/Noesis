# Noesis

A personal learning app where explaining what you've learned gradually grows an
evolving knowledge landscape — not streaks, XP, or a progress bar. See
`prompt.md` for the full product spec and `.claude/plans/` history for the
architecture plan this was built from.

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

## Scripts

- `npm run dev` — start the dev server
- `npm run lint` — eslint
- `npm run db:generate` — generate a new migration from schema changes
- `npm run db:migrate` — apply pending migrations directly (deploy step)
- `npm run db:studio` — browse the database
