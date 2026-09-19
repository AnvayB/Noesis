"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "@/lib/revalidate";
import { weekStartOf } from "@/lib/capture";
import { getDb } from "@/lib/db";
import { weeklyFocus } from "@/lib/db/schema";

function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

/** Make a session this week's one thing. Replaces any earlier choice. */
export async function setWeeklyFocusAction(formData: FormData) {
  const sessionId = field(formData, "sessionId");
  if (!sessionId) return;
  const db = await getDb();
  const weekStart = weekStartOf();
  await db.delete(weeklyFocus).where(eq(weeklyFocus.weekStart, weekStart)).run();
  await db.insert(weeklyFocus).values({ id: crypto.randomUUID(), sessionId, weekStart }).run();
  revalidatePath("/");
  revalidatePath("/learn");
}

export async function clearWeeklyFocusAction() {
  const db = await getDb();
  await db.delete(weeklyFocus).where(eq(weeklyFocus.weekStart, weekStartOf())).run();
  revalidatePath("/");
  revalidatePath("/learn");
}
