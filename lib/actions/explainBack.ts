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
  explainBacks,
  learningSessions,
} from "@/lib/db/schema";
import { getSessionById, listRecentConceptNames } from "@/lib/queries";

export async function submitExplainBackAction(formData: FormData) {
  const sessionId = String(formData.get("sessionId") ?? "").trim();
  const explanationText = String(formData.get("explanationText") ?? "").trim();
  const inputModeRaw = String(formData.get("inputMode") ?? "").trim();
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

  const sessionConceptNames = session.conceptName ? [session.conceptName] : [];
  const priorKnownConcepts = await listRecentConceptNames(session.conceptId ?? null);

  // The one call that costs real money/latency in this flow — everything
  // else here is local database writes.
  const analysis = await ai.analyzeExplainBack({
    sessionConcepts: sessionConceptNames,
    priorKnownConcepts,
    explanationText,
  });

  const db = await getDb();

  const explainBackId = crypto.randomUUID();
  await db
    .insert(explainBacks)
    .values({
      id: explainBackId,
      sessionId,
      inputMode,
      rawText: explanationText,
    })
    .run();

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
  // near-duplicate concepts (seen in testing: "Query and Key vectors" vs.
  // "Query, Key, and Value vectors") that would fragment the graph.
  const canonicalNameByLower = new Map<string, string>();
  for (const item of analysis.conceptsAddressed) {
    canonicalNameByLower.set(item.concept.trim().toLowerCase(), item.concept.trim());
  }
  for (const name of priorKnownConcepts) {
    const key = name.trim().toLowerCase();
    if (!canonicalNameByLower.has(key)) canonicalNameByLower.set(key, name.trim());
  }

  for (const link of analysis.connectionsMade) {
    const fromName = canonicalNameByLower.get(link.from.trim().toLowerCase());
    const toName = canonicalNameByLower.get(link.to.trim().toLowerCase());
    if (!fromName || !toName) continue;

    const from = await findOrCreateConcept(fromName);
    const to = await findOrCreateConcept(toName);
    if (from.id === to.id) continue;

    // Check both directions — "related" edges are conceptually undirected,
    // so A→B and B→A should strengthen the same edge, not create two.
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
    } else {
      await db
        .insert(conceptRelations)
        .values({
          id: crypto.randomUUID(),
          fromConceptId: from.id,
          toConceptId: to.id,
          relationType: "related",
          source: "llm_inferred",
          description: link.description,
        })
        .run();
    }
  }

  // Submitting an explanation is the natural "I'm done with this" signal —
  // completes the session even if it was still "started" or (defensively)
  // somehow still "pending".
  await db
    .update(learningSessions)
    .set({ status: "completed", endedAt: sql`(current_timestamp)` })
    .where(eq(learningSessions.id, sessionId))
    .run();

  redirect(`/sessions/${sessionId}`);
}
