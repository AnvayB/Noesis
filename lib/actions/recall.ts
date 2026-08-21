"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import {
  concepts,
  recallAttempts,
  recallOutcomeValues,
  type RecallOutcome,
} from "@/lib/db/schema";

export async function submitRecallAnswerAction(formData: FormData) {
  const attemptId = String(formData.get("attemptId") ?? "").trim();
  const response = String(formData.get("response") ?? "").trim() || null;
  const outcome = String(formData.get("outcome") ?? "").trim() as RecallOutcome;

  if (!attemptId || !recallOutcomeValues.includes(outcome)) {
    throw new Error("Missing or invalid recall answer fields.");
  }

  const db = await getDb();
  const attempt = await db
    .select()
    .from(recallAttempts)
    .where(eq(recallAttempts.id, attemptId))
    .get();
  if (!attempt) throw new Error("Recall attempt not found.");

  await db
    .update(recallAttempts)
    .set({ response, outcome, answeredAt: sql`(current_timestamp)` })
    .where(eq(recallAttempts.id, attemptId))
    .run();

  // Any self-reported outcome counts as "reviewed" — even a missed recall
  // means the concept was actively revisited, so it shouldn't visually fade
  // in Mindscape the way an untouched concept would.
  await db
    .update(concepts)
    .set({ lastReviewedAt: sql`(current_timestamp)` })
    .where(eq(concepts.id, attempt.conceptId))
    .run();

  revalidatePath("/");
}
