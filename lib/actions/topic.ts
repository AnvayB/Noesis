"use server";

import { ai } from "@/lib/ai";
import { listRecentConceptNames } from "@/lib/queries";

export type TopicSuggestionResult = { topic: string } | { error: string };

// Not a form action — called directly from the client Topic field on title
// blur, same pattern as generateSpeakingPromptAction.
export async function suggestTopicAction(
  title: string,
): Promise<TopicSuggestionResult> {
  if (!title.trim()) return { error: "Title is empty" };

  const existingTopics = await listRecentConceptNames(null, 50);
  const { topic } = await ai.suggestTopic({ title, existingTopics });
  return { topic };
}
