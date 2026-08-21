import type { CurriculumModule } from "../types";

export const databaseLayerTursoMigration: CurriculumModule = {
  slug: "database-layer-turso-migration",
  track: "noesis",
  phase: "Phase 7 — Infrastructure & Deployment",
  title: "Database Layer & the Turso/Vercel Migration",
  summary:
    "Why better-sqlite3 couldn't run on Vercel, what switching to libSQL/Turso actually changed, and why one driver swap rippled into an async rewrite of nearly every database-touching function in the app.",
  lesson: {
    overview:
      "This module documents a real migration performed on this codebase: replacing better-sqlite3 with @libsql/client so the app could deploy to Vercel. The interesting part isn't the destination platform — it's why the fix couldn't be a config change, and why one driver swap touched roughly a dozen files instead of one.",
    sections: [
      {
        heading: "Why reconfiguring Vercel wasn't an option",
        body:
          "Vercel's serverless functions run on an ephemeral, often read-only filesystem — there's no persistent disk for noesis.db to live on between invocations, so a local SQLite file simply isn't a durable place to write data in that environment, no matter how it's configured. Separately, better-sqlite3 is a native Node binding (compiled C++ calling into SQLite directly) — native bindings are generally fragile across serverless build/runtime environments regardless of the filesystem issue. Both problems point at the same root cause: better-sqlite3's whole design assumes a long-lived process with a writable local disk, which a serverless function is not. The fix had to be a different database layer, not a deployment setting.",
      },
      {
        heading: "Same SQL, hosted instead of local: libSQL and Turso",
        body:
          "libSQL is a SQLite-compatible fork; @libsql/client can point at either an embedded local file (file:./noesis.db, used in dev) or a hosted Turso database (libsql://... plus an auth token, used in production) through the exact same client API and the exact same Drizzle schema. lib/db/index.ts's resolveUrl() is the only place that branches on environment — TURSO_DATABASE_URL set means production/Turso, unset falls back to a local file path — and drizzle.config.ts mirrors that same branch for drizzle-kit's own commands. Everything downstream of that one URL resolution, including all 340+ lines of lib/queries.ts, is unaware of which mode it's running in. That's the direct payoff of picking a SQLite-compatible hosted service instead of jumping straight to Postgres: the schema and nearly all query code carried over unchanged, where a Postgres migration would have meant rewriting Drizzle's dialect-specific parts too.",
      },
      {
        heading: "The theory: sync-to-async ripple, and runtime vs. deploy-time migrations",
        body:
          "better-sqlite3 is synchronous — .all()/.get()/.run() block and return values directly, because it's calling straight into a C library in the same process. libSQL is a network-capable client (even against a local file, it's built to also talk to a remote server), so those same terminal query methods now return Promises. That's not a lib/db/index.ts-only change: it meant every function that ever called db.select()...get() synchronously — lib/queries.ts, lib/concepts.ts, lib/recall.ts, every file in lib/actions/ — had to become async and be awaited by its own callers, all the way up to the Server Components that render pages. getDb() itself changed shape to match: instead of a Proxy handing back an already-created client synchronously, it now returns a cached Promise<Db>, so every call site starts with const db = await getDb().\n\nSeparately, lib/db/index.ts still runs migrate() on every cold start, same convenience as local dev always had — safe, because Drizzle tracks which migrations already ran and re-applying an already-applied migration is a no-op, but it's a real, named tradeoff: checking/re-running that against a remote database on every cold start adds latency, and at real traffic, redundant work across instances that happen to cold-start concurrently. The general lesson: 'convenient for one solo developer running `npm run dev`' and 'correct for a production deployment under real traffic' are not automatically the same choice, and the honest move is picking the convenient one deliberately and writing down the documented upgrade path (a `db:migrate` deploy step, dropping the runtime call) rather than pretending the tradeoff doesn't exist.",
      },
    ],
    sourceFiles: [
      "lib/db/index.ts",
      "drizzle.config.ts",
      "lib/queries.ts",
      "app/api/export/route.ts",
      "README.md",
    ],
  },
  levels: {
    explain: {
      prompt:
        "Explain, in your own words, why better-sqlite3 had to be replaced entirely (not just reconfigured) to deploy this app to Vercel, and what concretely changed about how every database-touching function in the app is written as a result.",
      groundTruth:
        "Vercel's serverless functions have an ephemeral/often-read-only filesystem (no durable place for a local SQLite file) and better-sqlite3 is a native binding that's separately fragile in serverless build environments — both stem from better-sqlite3 assuming a long-lived process with local disk, which serverless isn't, so no Vercel setting could fix it. The concrete code-level change: libSQL is a network-capable, inherently async driver, so every terminal query call (.all()/.get()/.run()) now returns a Promise instead of a value — every function that touched the database (across lib/queries.ts, lib/concepts.ts, lib/recall.ts, and every lib/actions/*.ts file) had to become async with awaited calls, and getDb() now returns a cached Promise<Db> instead of a synchronously-ready client.",
    },
    trace: {
      prompt:
        "Trace what happens from a cold serverless function start to the first successful database query, under the Turso (hosted) configuration.",
      groundTruth:
        "The first call to getDb() (lib/db/index.ts) finds globalThis.__noesisDb unset, so it calls createDb(): resolveUrl() checks TURSO_DATABASE_URL — set, so that's used as-is (authToken from TURSO_AUTH_TOKEN) rather than falling back to a local file: path — createClient({ url, authToken }) opens the libSQL connection, drizzle(client, { schema }) wraps it, and await migrate(db, { migrationsFolder: ... }) applies any not-yet-applied migrations before the function resolves. The resulting Promise<Db> is cached on globalThis.__noesisDb; the calling function's const db = await getDb() then has a ready client to run its actual query against. Any other function invoked in the same warm instance reuses that same cached promise — no reconnect, no re-migrate.",
    },
    modify: {
      prompt:
        "Suppose `db:migrate` (drizzle-kit migrate) is wired up as a real Vercel deploy step, and you want to stop re-running migrate() at runtime in production while keeping the current auto-migrate convenience for local dev. Describe the change.",
      groundTruth:
        "Branch the migrate() call in createDb() (lib/db/index.ts) on the same signal resolveUrl() already checks — whether TURSO_DATABASE_URL is set. Something like: only call `await migrate(db, { migrationsFolder: ... })` when TURSO_DATABASE_URL is unset (i.e. running against the local embedded file in dev); when it is set, trust that the `db:migrate` deploy step already brought the Turso database's schema up to date, and skip the runtime call entirely. This keeps local dev exactly as convenient as before while removing the redundant per-cold-start migration check in production.",
    },
    design: {
      prompt:
        "Propose one concrete improvement to the database layer or its deployment setup, and justify the tradeoff.",
      groundTruth:
        "Open-ended — evaluate for tradeoff-awareness. Reasonable directions: implementing the runtime-vs-deploy-time migration split from the Modify prompt as the actual default rather than a documented-but-unapplied option; adding a lightweight startup health check that verifies the Turso connection independent of waiting for a real page load to fail; or building a proper JSON-based /api/export that works against a remote Turso database (querying every table and serializing to JSON) instead of the current 501 fallback, at the cost of needing to keep that export logic in sync with schema changes by hand.",
    },
  },
};
