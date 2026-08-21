"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { curiosityItems } from "@/lib/db/schema";

export async function addCuriosityItemAction(formData: FormData) {
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return;

  const db = await getDb();
  await db.insert(curiosityItems).values({ id: crypto.randomUUID(), text }).run();
  revalidatePath("/");
}

export async function resolveCuriosityItemAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const db = await getDb();
  await db
    .update(curiosityItems)
    .set({ resolvedAt: sql`(current_timestamp)` })
    .where(eq(curiosityItems.id, id))
    .run();
  revalidatePath("/");
}
