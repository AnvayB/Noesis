import { eq, sql } from "drizzle-orm";
import { getDb } from "./db";
import { concepts } from "./db/schema";

export function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * A concept is keyed by the slug of its name. Meeting it again touches
 * lastEncounteredAt. A field is recorded the first time one is offered and
 * kept for life after that, so a concept never moves on the map.
 */
export async function findOrCreateConcept(
  name: string,
  field?: string | null,
): Promise<{ id: string; created: boolean }> {
  const db = await getDb();
  const slug = slugify(name);
  const cleanField = field?.trim() || null;

  const existing = await db
    .select({ id: concepts.id, field: concepts.field })
    .from(concepts)
    .where(eq(concepts.slug, slug))
    .get();

  if (existing) {
    await db
      .update(concepts)
      .set({
        lastEncounteredAt: sql`(current_timestamp)`,
        ...(existing.field || !cleanField ? {} : { field: cleanField }),
      })
      .where(eq(concepts.id, existing.id))
      .run();
    return { id: existing.id, created: false };
  }

  const id = crypto.randomUUID();
  await db.insert(concepts).values({ id, name: name.trim(), slug, field: cleanField }).run();
  return { id, created: true };
}
