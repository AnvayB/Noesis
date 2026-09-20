"use server";

import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "@/lib/revalidate";
import { ai } from "@/lib/ai";
import { asUrl, fetchTitle, guessResourceType, hostOf } from "@/lib/capture";
import { findOrCreateConcept } from "@/lib/concepts";
import { getDb } from "@/lib/db";
import {
  curiosityItems,
  learningSessions,
  resources,
  sessionConcepts,
  type ActivityMode,
  type EnvironmentMode,
  type ResourceType,
} from "@/lib/db/schema";
import { fetchArticle } from "@/lib/extract";
import { listKnownFields } from "@/lib/knowledge";
import {
  findOpenCuriosityItemByText,
  findOpenSessionByTitle,
  findOpenSessionByUrl,
  listRecentConceptNames,
} from "@/lib/queries";

function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

function safeReturnTo(value: string): string {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export interface ConceptSuggestion {
  topic: string;
  field: string | null;
}

// The concept a piece of learning lands on, and the field it belongs to.
// Asked of the model with the existing names so it reuses them; if the
// model is unavailable the title itself becomes the concept, which is
// honest and editable later.
export async function suggestConcept(title: string): Promise<ConceptSuggestion> {
  try {
    const [existingTopics, existingFields] = await Promise.all([
      listRecentConceptNames(null, 50),
      listKnownFields(),
    ]);
    const { topic, field } = await ai.suggestTopic({ title, existingTopics, existingFields });
    if (topic?.trim()) return { topic: topic.trim(), field: field?.trim() || null };
  } catch {
    // fall through
  }
  return { topic: fallbackTopic(title), field: null };
}

// Without the model, a page title is the best concept name available. Page
// titles carry site names and episode numbering after a separator; the
// first segment is usually the subject.
function fallbackTopic(title: string): string {
  const first = title.split(/\s+[|–—\-:]\s+|\s+\|\s*/)[0]?.trim() || title.trim();
  const cleaned = first.replace(/^(watch|read|video)\s*[:\-]\s*/i, "").trim();
  return cleaned.length > 60 ? cleaned.slice(0, 57).trimEnd() + "…" : cleaned;
}

export interface ResourceInput {
  type: ResourceType;
  url: string | null;
  title: string;
  byline?: string | null;
  excerpt?: string | null;
  wordCount?: number | null;
}

/**
 * Reads what a link points at: its title, and for an article, its text.
 * Never throws; a link that cannot be read is still a fine resource.
 */
export async function describeLink(url: string): Promise<ResourceInput> {
  const type = guessResourceType(url);
  if (type === "youtube") {
    const title = (await fetchTitle(url)) ?? hostOf(url);
    let byline: string | null = null;
    try {
      const res = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
        { signal: AbortSignal.timeout(5000) },
      );
      if (res.ok) byline = ((await res.json()) as { author_name?: string }).author_name ?? null;
    } catch {
      // no byline
    }
    return { type, url, title, byline };
  }
  const article = await fetchArticle(url);
  if (article) {
    return {
      type,
      url,
      title: article.title ?? hostOf(url),
      byline: article.byline ?? article.siteName ?? hostOf(url),
      excerpt: article.text || null,
      wordCount: article.wordCount || null,
    };
  }
  const title = (await fetchTitle(url)) ?? hostOf(url);
  return { type, url, title, byline: hostOf(url) };
}

export async function createSession(opts: {
  title: string;
  topic: string;
  field: string | null;
  status: "pending" | "started";
  resource: ResourceInput | null;
  curiosityItemId?: string | null;
  environmentMode?: EnvironmentMode;
  activityMode?: ActivityMode;
  durationMinutes?: number | null;
  notes?: string | null;
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
        byline: opts.resource.byline ?? null,
        excerpt: opts.resource.excerpt ?? null,
        wordCount: opts.resource.wordCount ?? null,
      })
      .run();
  }

  const concept = await findOrCreateConcept(opts.topic, opts.field);
  const sessionId = crypto.randomUUID();
  await db
    .insert(learningSessions)
    .values({
      id: sessionId,
      title: opts.title,
      resourceId,
      environmentMode: opts.environmentMode ?? "focus",
      activityMode: opts.activityMode ?? "consume",
      status: opts.status,
      durationMinutes: opts.durationMinutes ?? null,
      notes: opts.notes ?? null,
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
  revalidatePath("/");
  revalidatePath("/learn");
  return sessionId;
}

/** Moves an already-kept session into progress in place, instead of
 * spawning a second row for the same thing. */
async function markSessionStarted(sessionId: string) {
  const db = await getDb();
  await db
    .update(learningSessions)
    .set({ status: "started", startedAt: sql`(current_timestamp)` })
    .where(eq(learningSessions.id, sessionId))
    .run();
  revalidatePath("/");
  revalidatePath("/learn");
}

/** Turn a curiosity item into a session and begin it. */
async function promoteCuriosityItemToSession(item: { id: string; text: string }): Promise<string> {
  const { topic, field: fieldName } = await suggestConcept(item.text);
  return createSession({
    title: item.text,
    topic,
    field: fieldName,
    status: "started",
    resource: null,
    curiosityItemId: item.id,
  });
}

/**
 * One field, everywhere. A link becomes a thing to learn; anything else
 * becomes a question. `intent` is "start" or "keep". A capture that reads
 * as the same link or the same question as something already open (kept or
 * in progress) folds into that existing session/question instead of
 * spawning a duplicate.
 */
export async function captureAction(formData: FormData) {
  const text = field(formData, "text");
  const intent = field(formData, "intent") === "start" ? "start" : "keep";
  const returnTo = safeReturnTo(field(formData, "returnTo") || "/");
  if (!text) redirect(returnTo);

  const url = asUrl(text);

  if (!url) {
    const dupeSession = await findOpenSessionByTitle(text);
    if (dupeSession) {
      if (intent === "start") {
        if (dupeSession.status === "pending") await markSessionStarted(dupeSession.id);
        redirect(`/sessions/${dupeSession.id}`);
      }
      redirect(returnTo);
    }

    const dupeQuestion = await findOpenCuriosityItemByText(text);
    if (intent === "start") {
      let sessionId: string;
      if (dupeQuestion) {
        sessionId = await promoteCuriosityItemToSession(dupeQuestion);
      } else {
        const { topic, field: fieldName } = await suggestConcept(text);
        sessionId = await createSession({ title: text, topic, field: fieldName, status: "started", resource: null });
      }
      redirect(`/sessions/${sessionId}`);
    }
    if (!dupeQuestion) {
      const db = await getDb();
      await db.insert(curiosityItems).values({ id: crypto.randomUUID(), text }).run();
      revalidatePath("/");
      revalidatePath("/learn");
    }
    redirect(returnTo);
  }

  const dupeSession = await findOpenSessionByUrl(url);
  if (dupeSession) {
    if (intent === "start") {
      if (dupeSession.status === "pending") await markSessionStarted(dupeSession.id);
      redirect(`/sessions/${dupeSession.id}`);
    }
    redirect(returnTo);
  }

  const resource = await describeLink(url);
  const { topic, field: fieldName } = await suggestConcept(resource.title);
  const sessionId = await createSession({
    title: resource.title,
    topic,
    field: fieldName,
    status: intent === "start" ? "started" : "pending",
    resource,
  });

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

  const sessionId = await promoteCuriosityItemToSession(item);
  redirect(`/sessions/${sessionId}`);
}
