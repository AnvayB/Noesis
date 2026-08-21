import { eq, sql } from "drizzle-orm";
import { getDb } from "./db";
import { concepts } from "./db/schema";

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Phase 1: sessions tag a single free-text topic, which becomes (or reuses) a
 * Concept row keyed by slug. Understanding/confidence fields on Concept are
 * populated starting in Phase 2 (explain-back analysis) — this just tracks
 * that the concept was encountered.
 */
export async function findOrCreateConcept(name: string): Promise<{ id: string }> {
  const db = await getDb();
  const slug = slugify(name);

  const existing = await db
    .select({ id: concepts.id })
    .from(concepts)
    .where(eq(concepts.slug, slug))
    .get();

  if (existing) {
    await db
      .update(concepts)
      .set({ lastEncounteredAt: sql`(current_timestamp)` })
      .where(eq(concepts.id, existing.id))
      .run();
    return existing;
  }

  const id = crypto.randomUUID();
  await db.insert(concepts).values({ id, name, slug }).run();
  return { id };
}
