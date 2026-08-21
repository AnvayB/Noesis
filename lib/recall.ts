import { desc, eq, isNull } from "drizzle-orm";
import { ai } from "@/lib/ai";
import { getDb } from "@/lib/db";
import {
  concepts,
  explainBackConcepts,
  recallAttempts,
  type Concept,
  type ConceptAddressedStatus,
  type RecallAttempt,
} from "@/lib/db/schema";

function daysSince(iso: string) {
  const then = new Date(iso.replace(" ", "T") + "Z").getTime();
  return (Date.now() - then) / (1000 * 60 * 60 * 24);
}

function isToday(iso: string) {
  const then = new Date(iso.replace(" ", "T") + "Z");
  const now = new Date();
  return then.toDateString() === now.toDateString();
}

/** Simple heuristic per plan section 6 / H: prioritize concepts that
 * haven't been reviewed recently and concepts previously struggled with.
 * Only considers concepts that have actually been explained at least once —
 * quizzing on something merely "encountered" wouldn't be a fair recall. */
async function pickHeuristicConcept(): Promise<Concept | null> {
  const db = await getDb();
  const allConcepts = await db.select().from(concepts).all();
  const statusRows = await db
    .select({
      conceptId: explainBackConcepts.conceptId,
      status: explainBackConcepts.status,
    })
    .from(explainBackConcepts)
    .all();
  const outcomeRows = await db
    .select({
      conceptId: recallAttempts.conceptId,
      outcome: recallAttempts.outcome,
    })
    .from(recallAttempts)
    .all();

  const statusesByConcept = new Map<string, ConceptAddressedStatus[]>();
  for (const row of statusRows) {
    const list = statusesByConcept.get(row.conceptId) ?? [];
    list.push(row.status);
    statusesByConcept.set(row.conceptId, list);
  }

  const struggledConceptIds = new Set<string>();
  for (const [conceptId, statuses] of statusesByConcept) {
    if (statuses.some((s) => s !== "correct")) struggledConceptIds.add(conceptId);
  }
  for (const row of outcomeRows) {
    if (row.outcome === "forgot" || row.outcome === "partial") {
      struggledConceptIds.add(row.conceptId);
    }
  }

  const eligible = allConcepts.filter((c) => statusesByConcept.has(c.id));
  if (eligible.length === 0) return null;

  const scored = eligible.map((c) => {
    const lastTouched = c.lastReviewedAt ?? c.lastEncounteredAt;
    const recencyScore = daysSince(lastTouched);
    const struggleBonus = struggledConceptIds.has(c.id) ? 14 : 0;
    return { concept: c, score: recencyScore + struggleBonus };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].concept;
}

export interface PendingRecall {
  attempt: RecallAttempt;
  concept: Concept;
}

/**
 * Returns the current unanswered recall prompt, generating a fresh one via
 * the LLM at most once per day (never on every dashboard load — that would
 * be an unbounded LLM cost for a page visited constantly, see plan risk J).
 * Called directly from the dashboard server component; the one insert this
 * performs is idempotency-guarded by the "already one today" check.
 */
export async function getOrCreateDailyRecallPrompt(): Promise<PendingRecall | null> {
  const db = await getDb();
  const pending = await db
    .select()
    .from(recallAttempts)
    .where(isNull(recallAttempts.outcome))
    .orderBy(desc(recallAttempts.createdAt))
    .get();

  if (pending) {
    const concept = await db
      .select()
      .from(concepts)
      .where(eq(concepts.id, pending.conceptId))
      .get();
    return concept ? { attempt: pending, concept } : null;
  }

  const mostRecent = await db
    .select()
    .from(recallAttempts)
    .orderBy(desc(recallAttempts.createdAt))
    .get();
  if (mostRecent && isToday(mostRecent.createdAt)) return null;

  const concept = await pickHeuristicConcept();
  if (!concept) return null;

  const daysSinceReviewed = Math.round(
    daysSince(concept.lastReviewedAt ?? concept.lastEncounteredAt),
  );

  const generated = await ai.generateRecallQuestion({
    conceptName: concept.name,
    lastUnderstandingSummary: null,
    daysSinceReviewed,
  });

  const attemptId = crypto.randomUUID();
  await db
    .insert(recallAttempts)
    .values({
      id: attemptId,
      conceptId: concept.id,
      triggeredBy: "casual_quiz",
      prompt: generated.question,
      expectedKeyPoints: generated.expectedKeyPoints,
    })
    .run();

  const attempt = await db
    .select()
    .from(recallAttempts)
    .where(eq(recallAttempts.id, attemptId))
    .get();
  if (!attempt) return null;

  return { attempt, concept };
}
