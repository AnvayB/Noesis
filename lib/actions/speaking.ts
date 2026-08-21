"use server";

import { ai } from "@/lib/ai";
import { getDb } from "@/lib/db";
import { concepts } from "@/lib/db/schema";

export type SpeakingPromptResult =
  | { prompt: string; conceptName: string }
  | { error: string };

// Not a form action (no side effect to persist — these prompts are meant to
// be ephemeral/exploratory, spec section 14) — called directly from the
// client component and its return value used in local state.
export async function generateSpeakingPromptAction(): Promise<SpeakingPromptResult> {
  const db = await getDb();
  const allConcepts = await db.select().from(concepts).all();
  if (allConcepts.length === 0) {
    return { error: "Nothing learned yet to build a prompt from." };
  }

  const concept = allConcepts[Math.floor(Math.random() * allConcepts.length)];
  const result = await ai.generateSpeakingPrompt({ conceptName: concept.name });
  return { prompt: result.prompt, conceptName: concept.name };
}
