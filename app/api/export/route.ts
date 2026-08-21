import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

// Simple personal-backup path (see plan risk J: a single local SQLite file
// is the only copy of a genuinely valuable history). Not a sync solution —
// just makes "download a copy" one click away. Only works against the
// embedded local libSQL file (no TURSO_DATABASE_URL set) — there's no local
// file to read once the app points at a hosted Turso database; use Turso's
// own backup/replication for that case instead.
export async function GET() {
  if (process.env.TURSO_DATABASE_URL) {
    return new NextResponse(
      "This deployment uses a hosted Turso database, so there's no local file to download. Use `turso db shell`/Turso's backup features instead.",
      { status: 501 },
    );
  }

  // Env-controlled, not user input — safe to opt out of Turbopack's
  // whole-project trace-on-dynamic-fs-access warning.
  const dbPath = path.resolve(
    /*turbopackIgnore: true*/ process.cwd(),
    process.env.DATABASE_PATH ?? "./noesis.db",
  );
  const file = fs.readFileSync(dbPath);
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="noesis-backup-${date}.db"`,
    },
  });
}
