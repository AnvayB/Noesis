"use server";

import { and, eq, or, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
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
} from "@/lib/db/schema";
import { getSessionById, listRecentConceptNames } from "@/lib/queries";

function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

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
  const priorKnownConcepts = await listRecentConceptNames(session.conceptId ?? null);

  const analysis = await ai.analyzeExplainBack({
    sessionConcepts: sessionConceptNames,
    priorKnownConcepts,
    explanationText,
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
    })
    .run();

  for (const item of analysis.conceptsAddressed) {
    const concept = await findOrCreateConcept(item.concept);
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
  // appear in conceptsAddressed/priorKnownConcepts, but LLMs don't always
  // comply — this guard stops connections_made from silently spawning
  // near-duplicate concepts that would fragment the graph.
  const canonicalNameByLower = new Map<string, string>();
  for (const item of analysis.conceptsAddressed) {
    canonicalNameByLower.set(item.concept.trim().toLowerCase(), item.concept.trim());
  }
  for (const name of priorKnownConcepts) {
    const key = name.trim().toLowerCase();
    if (!canonicalNameByLower.has(key)) canonicalNameByLower.set(key, name.trim());
  }

  // Names the model used that are not canonical: resolve against everything
  // already on the map (case-insensitive), and failing that accept a short,
  // index-entry-shaped name as a new concept the explanation touched. Long
  // clause-like names are dropped rather than allowed to fragment the map.
  const everyConcept = await db.select({ name: concepts.name }).from(concepts).all();
  for (const row of everyConcept) {
    const key = row.name.trim().toLowerCase();
    if (!canonicalNameByLower.has(key)) canonicalNameByLower.set(key, row.name.trim());
  }
  const addressedLower = new Set(
    analysis.conceptsAddressed.map((item) => item.concept.trim().toLowerCase()),
  );
  const resolveEndpoint = async (raw: string): Promise<string | null> => {
    const trimmed = raw.trim();
    const known = canonicalNameByLower.get(trimmed.toLowerCase());
    if (known) return known;
    const words = trimmed.split(/\s+/);
    const clauseLike = /\b(rationale|explanation|reason|idea|concept|process|how|why)\b/i.test(trimmed);
    if (words.length > 3 || clauseLike) return null;
    const created = await findOrCreateConcept(trimmed);
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

  for (const link of analysis.connectionsMade) {
    const fromName = await resolveEndpoint(link.from);
    const toName = await resolveEndpoint(link.to);
    if (!fromName || !toName) continue;

    const from = await findOrCreateConcept(fromName);
    const to = await findOrCreateConcept(toName);
    if (from.id === to.id) continue;

    // "related" edges are conceptually undirected: A→B and B→A strengthen
    // the same edge rather than creating two.
    const existing = await db
      .select({ id: conceptRelations.id, strength: conceptRelations.strength })
      .from(conceptRelations)
      .where(
        or(
          and(
            eq(conceptRelations.fromConceptId, from.id),
            eq(conceptRelations.toConceptId, to.id),
          ),
          and(
            eq(conceptRelations.fromConceptId, to.id),
            eq(conceptRelations.toConceptId, from.id),
          ),
        ),
      )
      .get();

    if (existing) {
      await db
        .update(conceptRelations)
        .set({ strength: existing.strength + 1 })
        .where(eq(conceptRelations.id, existing.id))
        .run();
      await db
        .insert(explainBackRelations)
        .values({ explainBackId, relationId: existing.id, kind: "strengthened" })
        .run();
    } else {
      const relationId = crypto.randomUUID();
      await db
        .insert(conceptRelations)
        .values({
          id: relationId,
          fromConceptId: from.id,
          toConceptId: to.id,
          relationType: "related",
          source: "llm_inferred",
          description: link.description,
        })
        .run();
      await db
        .insert(explainBackRelations)
        .values({ explainBackId, relationId, kind: "new" })
        .run();
    }
  }

  // An explanation is the natural "done" signal for a session.
  await db
    .update(learningSessions)
    .set({ status: "completed", endedAt: sql`(current_timestamp)` })
    .where(eq(learningSessions.id, session.id))
    .run();
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
  redirect(read ? `/sessions/${sessionId}` : `/sessions/${sessionId}?unread=1`);
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
  redirect(read ? `/sessions/${back.sessionId}` : `/sessions/${back.sessionId}?unread=1`);
}
