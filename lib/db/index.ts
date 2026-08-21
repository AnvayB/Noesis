import path from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

declare global {
  var __noesisDb: Promise<Db> | undefined;
}

function resolveUrl(): string {
  // Production: point at a Turso (hosted libSQL) database. Local dev: fall
  // back to an embedded libSQL file — same client, same driver, just a
  // different url, so nothing else in the app needs to branch on this.
  if (process.env.TURSO_DATABASE_URL) return process.env.TURSO_DATABASE_URL;
  const dbPath = process.env.DATABASE_PATH ?? "./noesis.db";
  // Env-controlled, not user input — safe to opt out of Turbopack's
  // whole-project trace-on-dynamic-fs-access warning (see .env.local.example).
  return `file:${path.resolve(/*turbopackIgnore: true*/ process.cwd(), dbPath)}`;
}

async function createDb(): Promise<Db> {
  const client = createClient({
    url: resolveUrl(),
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  const db = drizzle(client, { schema });
  // Convenient for local dev (embedded file, effectively instant). In
  // production this re-runs on every cold start against Turso — harmless
  // since each migration is idempotent/tracked, but for a busier deployment
  // prefer running `drizzle-kit migrate` as a deploy step instead and
  // dropping this call.
  await migrate(db, { migrationsFolder: path.resolve(process.cwd(), "drizzle") });
  return db;
}

// Lazy on purpose: opening the connection and running migrations must NOT
// happen as a module-import side effect. Next's build "collect page data"
// step imports every route module (even force-dynamic ones) from parallel
// workers — if that import eagerly opened+migrated the same local db file,
// those workers race and the build fails. Deferring to first real query
// means importing this module is always side-effect-free.
//
// libSQL is a network-capable driver, so every query is async now (unlike
// the old synchronous better-sqlite3 setup) — callers do
// `const db = await getDb();` rather than importing a ready-made `db`.
export function getDb(): Promise<Db> {
  if (!globalThis.__noesisDb) {
    globalThis.__noesisDb = createDb();
  }
  return globalThis.__noesisDb;
}
