"use server";

import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ai } from "@/lib/ai";
import { asUrl, fetchTitle, guessResourceType, hostOf } from "@/lib/capture";
import { findOrCreateConcept } from "@/lib/concepts";
import { getDb } from "@/lib/db";
import {
  curiosityItems,
  learningSessions,
  resources,
  sessionConcepts,
  type ResourceType,
} from "@/lib/db/schema";
import { listRecentConceptNames } from "@/lib/queries";

function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

function safeReturnTo(value: string): string {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

// The concept a piece of learning lands on. Asked of the model with the
// existing concept names so it reuses them; if the model is unavailable the
// title itself becomes the concept, which is honest and editable later.
async function suggestConcept(title: string): Promise<string> {
  try {
    const existingTopics = await listRecentConceptNames(null, 50);
    const { topic } = await ai.suggestTopic({ title, existingTopics });
    if (topic?.trim()) return topic.trim();
  } catch {
    // fall through
  }
  return fallbackTopic(title);
}

// Without the model, a page title is the best concept name available. Page
// titles carry site names and episode numbering after a separator; the
// first segment is usually the subject.
function fallbackTopic(title: string): string {
  const first = title.split(/\s+[|\u2013\u2014\-:]\s+|\s+\|\s*/)[0]?.trim() || title.trim();
  const cleaned = first.replace(/^(watch|read|video)\s*[:\-]\s*/i, "").trim();
  return cleaned.length > 60 ? cleaned.slice(0, 57).trimEnd() + "…" : cleaned;
}

async function createSession(opts: {
  title: string;
  topic: string;
  status: "pending" | "started";
  resource: { type: ResourceType; url: string; title: string } | null;
  curiosityItemId?: string | null;
}): Promise<string> {
  const db = await getDb();

  let resourceId: string | null = null;
  if (opts.resource) {
    resourceId = crypto.randomUUID();
    await db
      .insert(resources)
      .values({
        id: resourceId,
        type: opts.resource.type,
        url: opts.resource.url,
        title: opts.resource.title,
      })
      .run();
  }

  const concept = await findOrCreateConcept(opts.topic);
  const sessionId = crypto.randomUUID();
  await db
    .insert(learningSessions)
    .values({
      id: sessionId,
      title: opts.title,
      resourceId,
      // Not asked at capture time. Editable afterwards, defaulted honestly.
      environmentMode: "focus",
      activityMode: "consume",
      status: opts.status,
    })
    .run();
  await db
    .insert(sessionConcepts)
    .values({ sessionId, conceptId: concept.id, role: "primary" })
    .run();

  if (opts.curiosityItemId) {
    await db
      .update(curiosityItems)
      .set({ resolvedAt: sql`(current_timestamp)`, promotedToSessionId: sessionId })
      .where(eq(curiosityItems.id, opts.curiosityItemId))
      .run();
  }
  return sessionId;
}

/**
 * One field, everywhere. A link becomes a thing to learn; anything else
 * becomes a question. `intent` is "start" or "keep".
 */
export async function captureAction(formData: FormData) {
  const text = field(formData, "text");
  const intent = field(formData, "intent") === "start" ? "start" : "keep";
  const returnTo = safeReturnTo(field(formData, "returnTo") || "/");
  if (!text) redirect(returnTo);

  const url = asUrl(text);

  if (!url) {
    if (intent === "start") {
      const topic = await suggestConcept(text);
      const sessionId = await createSession({ title: text, topic, status: "started", resource: null });
      redirect(`/sessions/${sessionId}`);
    }
    const db = await getDb();
    await db.insert(curiosityItems).values({ id: crypto.randomUUID(), text }).run();
    revalidatePath("/");
    revalidatePath("/learn");
    redirect(returnTo);
  }

  const type = guessResourceType(url);
  const fetched = await fetchTitle(url);
  const title = fetched ?? hostOf(url);
  const topic = await suggestConcept(title);
  const sessionId = await createSession({
    title,
    topic,
    status: intent === "start" ? "started" : "pending",
    resource: { type, url, title },
  });

  revalidatePath("/");
  revalidatePath("/learn");
  if (intent === "start") redirect(`/sessions/${sessionId}`);
  redirect(returnTo);
}

/** Turn a question into a session and begin it. */
export async function startFromQuestionAction(formData: FormData) {
  const id = field(formData, "id");
  if (!id) return;
  const db = await getDb();
  const item = await db.select().from(curiosityItems).where(eq(curiosityItems.id, id)).get();
  if (!item) return;

  const topic = await suggestConcept(item.text);
  const sessionId = await createSession({
    title: item.text,
    topic,
    status: "started",
    resource: null,
    curiosityItemId: item.id,
  });
  revalidatePath("/");
  revalidatePath("/learn");
  redirect(`/sessions/${sessionId}`);
}
