"use server";

import { and, eq, or, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "@/lib/revalidate";
import { ai } from "@/lib/ai";
import { findOrCreateConcept } from "@/lib/concepts";
import { getDb } from "@/lib/db";
import {
  concepts,
  conceptRelations,
  conceptUnderstandings,
  explainBackConcepts,
  explainBackInputModeValues,
  explainBackRelations,
  explainBacks,
  learningSessions,
  type ConceptRelationSource,
} from "@/lib/db/schema";
import { listKnownFields } from "@/lib/knowledge";
import { getSessionById, listRecentConceptNames } from "@/lib/queries";

function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

const EXCERPT_FOR_MODEL = 9000;

/**
 * The one call that costs real money and latency, and everything the map
 * does because of it. Separated from the form action so a failed model call
 * can be retried without losing the explanation, which is saved first.
 */
async function analyzeAndRecord(
  session: NonNullable<Awaited<ReturnType<typeof getSessionById>>>,
  explainBackId: string,
  explanationText: string,
) {
  const sessionConceptNames = session.conceptName ? [session.conceptName] : [];
  const [priorKnownConcepts, knownFields] = await Promise.all([
    listRecentConceptNames(session.conceptId ?? null, 40),
    listKnownFields(),
  ]);

  const analysis = await ai.analyzeExplainBack({
    sessionConcepts: sessionConceptNames,
    priorKnownConcepts,
    knownFields,
    explanationText,
    sourceTitle: session.resourceTitle ?? session.title,
    sourceExcerpt: session.resourceExcerpt ? session.resourceExcerpt.slice(0, EXCERPT_FOR_MODEL) : null,
    marks: session.notes ?? null,
  });

  const db = await getDb();

  await db
    .insert(conceptUnderstandings)
    .values({
      id: crypto.randomUUID(),
      explainBackId,
      depth: analysis.depth,
      clarity: analysis.clarity,
      omissions: analysis.omissions,
      misconceptions: analysis.misconceptions,
      connectionsMade: analysis.connectionsMade,
      followUpQuestion: analysis.followUpQuestion,
      gist: analysis.gist,
      level: analysis.level,
      nextStep: analysis.nextStep,
    })
    .run();

  // The session's own concept inherits the field of whatever the model filed
  // it under, when it had none.
  const sessionField = analysis.conceptsAddressed.find(
    (c) => session.conceptName && c.concept.trim().toLowerCase() === session.conceptName.toLowerCase(),
  )?.field ?? analysis.conceptsAddressed[0]?.field ?? null;
  if (session.conceptName && sessionField) {
    await findOrCreateConcept(session.conceptName, sessionField);
  }

  const addressedLower = new Set<string>();
  for (const item of analysis.conceptsAddressed) {
    const key = item.concept.trim().toLowerCase();
    if (addressedLower.has(key)) continue;
    addressedLower.add(key);
    const concept = await findOrCreateConcept(item.concept, item.field);
    await db
      .insert(explainBackConcepts)
      .values({ explainBackId, conceptId: concept.id, status: item.status })
      .run();

    if (item.status === "correct") {
      await db
        .update(concepts)
        .set({ lastReviewedAt: sql`(current_timestamp)` })
        .where(eq(concepts.id, concept.id))
        .run();
    }
  }

  // The model is instructed to only reference concept names that already
  // appear in conceptsAddressed/priorKnownConcepts, but it does not always
  // comply. Resolve names against everything on the map, and only accept a
  // short index-entry-shaped name as a new concept.
  const canonicalNameByLower = new Map<string, string>();
  for (const item of analysis.conceptsAddressed) {
    canonicalNameByLower.set(item.concept.trim().toLowerCase(), item.concept.trim());
  }
  const everyConcept = await db.select({ name: concepts.name }).from(concepts).all();
  for (const row of everyConcept) {
    const key = row.name.trim().toLowerCase();
    if (!canonicalNameByLower.has(key)) canonicalNameByLower.set(key, row.name.trim());
  }
  const resolveEndpoint = async (raw: string, allowNew: boolean): Promise<string | null> => {
    const trimmed = raw.trim();
    const known = canonicalNameByLower.get(trimmed.toLowerCase());
    if (known) return known;
    if (!allowNew) return null;
    const words = trimmed.split(/\s+/);
    const clauseLike = /\b(rationale|explanation|reason|idea|concept|process|how|why)\b/i.test(trimmed);
    if (words.length > 3 || clauseLike) return null;
    const created = await findOrCreateConcept(trimmed, sessionField);
    canonicalNameByLower.set(trimmed.toLowerCase(), trimmed);
    if (!addressedLower.has(trimmed.toLowerCase())) {
      addressedLower.add(trimmed.toLowerCase());
      await db
        .insert(explainBackConcepts)
        .values({ explainBackId, conceptId: created.id, status: "partial" })
        .run();
    }
    return trimmed;
  };

  const recordRelation = async (
    fromName: string,
    toName: string,
    source: ConceptRelationSource,
    description: string | null,
  ) => {
    const from = await findOrCreateConcept(fromName);
    const to = await findOrCreateConcept(toName);
    if (from.id === to.id) return;

    // "related" edges are undirected: A→B and B→A strengthen the same edge.
    const existing = await db
      .select({ id: conceptRelations.id, strength: conceptRelations.strength, source: conceptRelations.source })
      .from(conceptRelations)
      .where(
        or(
          and(eq(conceptRelations.fromConceptId, from.id), eq(conceptRelations.toConceptId, to.id)),
          and(eq(conceptRelations.fromConceptId, to.id), eq(conceptRelations.toConceptId, from.id)),
        ),
      )
      .get();

    if (existing) {
      // A connection the learner states in their own words outranks one the
      // model merely noticed: the cord fuses from then on.
      const promote = source === "explained" && existing.source !== "explained";
      await db
        .update(conceptRelations)
        .set({
          strength: existing.strength + 1,
          ...(promote ? { source: "explained" as const, description } : {}),
        })
        .where(eq(conceptRelations.id, existing.id))
        .run();
      if (source === "explained") {
        await db
          .insert(explainBackRelations)
          .values({ explainBackId, relationId: existing.id, kind: promote ? "new" : "strengthened" })
          .run();
      }
    } else {
      const relationId = crypto.randomUUID();
      await db
        .insert(conceptRelations)
        .values({
          id: relationId,
          fromConceptId: from.id,
          toConceptId: to.id,
          relationType: "related",
          source,
          description,
        })
        .run();
      if (source === "explained") {
        await db
          .insert(explainBackRelations)
          .values({ explainBackId, relationId, kind: "new" })
          .run();
      }
    }
  };

  for (const link of analysis.connectionsMade) {
    const fromName = await resolveEndpoint(link.from, true);
    const toName = await resolveEndpoint(link.to, true);
    if (!fromName || !toName) continue;
    await recordRelation(fromName, toName, "explained", link.description);
  }

  // What the material relates to, whether or not the learner said so. These
  // steer growth toward neighbours but never fuse.
  if (session.conceptName) {
    for (const name of analysis.relatedKnown) {
      const toName = await resolveEndpoint(name, false);
      if (!toName || toName.toLowerCase() === session.conceptName.toLowerCase()) continue;
      await recordRelation(session.conceptName, toName, "llm_inferred", null);
    }
  }

  // An explanation is the natural "done" signal for a session.
  await db
    .update(learningSessions)
    .set({ status: "completed", endedAt: sql`(current_timestamp)` })
    .where(eq(learningSessions.id, session.id))
    .run();
  revalidatePath("/");
  revalidatePath("/learn");
  revalidatePath("/mindscape");
}

export async function submitExplainBackAction(formData: FormData) {
  const sessionId = field(formData, "sessionId");
  const explanationText = field(formData, "explanationText");
  const inputModeRaw = field(formData, "inputMode");
  const inputMode = explainBackInputModeValues.includes(
    inputModeRaw as (typeof explainBackInputModeValues)[number],
  )
    ? (inputModeRaw as (typeof explainBackInputModeValues)[number])
    : "text";
  if (!sessionId || !explanationText) {
    throw new Error("Session and explanation text are required.");
  }

  const session = await getSessionById(sessionId);
  if (!session) throw new Error("Session not found.");

  // Save the words first. Whatever happens next, they are not lost.
  const db = await getDb();
  const explainBackId = crypto.randomUUID();
  await db
    .insert(explainBacks)
    .values({ id: explainBackId, sessionId, inputMode, rawText: explanationText })
    .run();

  let read = true;
  try {
    await analyzeAndRecord(session, explainBackId, explanationText);
  } catch (error) {
    console.error("explain-back analysis failed", error);
    read = false;
  }
  redirect(read ? `/sessions/${sessionId}?reveal=1` : `/sessions/${sessionId}?unread=1`);
}

/** Try reading a saved explanation again after the model call failed. */
export async function retryAnalysisAction(formData: FormData) {
  const explainBackId = field(formData, "explainBackId");
  if (!explainBackId) throw new Error("Explain-back id is required.");

  const db = await getDb();
  const back = await db
    .select()
    .from(explainBacks)
    .where(eq(explainBacks.id, explainBackId))
    .get();
  if (!back) throw new Error("Explanation not found.");
  const already = await db
    .select({ id: conceptUnderstandings.id })
    .from(conceptUnderstandings)
    .where(eq(conceptUnderstandings.explainBackId, explainBackId))
    .get();
  if (already) redirect(`/sessions/${back.sessionId}`);

  const session = await getSessionById(back.sessionId);
  if (!session) throw new Error("Session not found.");

  let read = true;
  try {
    await analyzeAndRecord(session, explainBackId, back.rawText);
  } catch (error) {
    console.error("explain-back analysis failed again", error);
    read = false;
  }
  redirect(read ? `/sessions/${back.sessionId}?reveal=1` : `/sessions/${back.sessionId}?unread=1`);
}

/** Marks made while watching or reading, saved as you go. Not a form action. */
export async function saveMarksAction(sessionId: string, marks: string): Promise<void> {
  if (!sessionId) return;
  const db = await getDb();
  await db
    .update(learningSessions)
    .set({ notes: marks.trim() || null })
    .where(eq(learningSessions.id, sessionId))
    .run();
}
