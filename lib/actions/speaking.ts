"use server";

import { eq } from "drizzle-orm";
import { ai } from "@/lib/ai";
import { getDb } from "@/lib/db";
import { concepts } from "@/lib/db/schema";

export type SpeakingPromptResult =
  | { prompt: string; conceptName: string }
  | { error: string };

// Not a form action (no side effect to persist — these prompts are meant to
// be ephemeral/exploratory, spec section 14) — called directly from the
// client component and its return value used in local state. Given a
// concept id it asks about that concept; otherwise it picks one you know.
export async function generateSpeakingPromptAction(
  conceptId?: string,
): Promise<SpeakingPromptResult> {
  const db = await getDb();
  let concept = conceptId
    ? await db.select().from(concepts).where(eq(concepts.id, conceptId)).get()
    : undefined;
  if (!concept) {
    const allConcepts = await db.select().from(concepts).all();
    if (allConcepts.length === 0) {
      return { error: "Nothing learned yet to build a prompt from." };
    }
    concept = allConcepts[Math.floor(Math.random() * allConcepts.length)];
  }

  try {
    const result = await ai.generateSpeakingPrompt({ conceptName: concept.name });
    return { prompt: result.prompt, conceptName: concept.name };
  } catch {
    return { error: "Couldn't think of one just now. Try again in a moment." };
  }
}
