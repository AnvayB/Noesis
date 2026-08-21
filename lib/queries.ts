import { and, desc, eq, isNull, ne, or } from "drizzle-orm";
import { getDb } from "./db";
import {
  conceptRelations,
  conceptUnderstandings,
  concepts,
  curiosityItems,
  explainBackConcepts,
  explainBacks,
  learningSessions,
  recallAttempts,
  resources,
  sessionConcepts,
  type ActivityMode,
  type ConceptAddressedStatus,
  type EnvironmentMode,
  type LearningSessionStatus,
  type RecallOutcome,
} from "./db/schema";

export interface SessionFilters {
  environmentMode?: EnvironmentMode;
  activityMode?: ActivityMode;
  status?: LearningSessionStatus;
  excludeStatus?: LearningSessionStatus;
}

// Phase 1 only ever links one primary concept per session, so this join
// can't fan out into duplicate rows yet. Revisit if/when a session can carry
// multiple concepts.
export async function listRecentSessions(limit = 5, filters: SessionFilters = {}) {
  const db = await getDb();
  const conditions = [
    filters.environmentMode
      ? eq(learningSessions.environmentMode, filters.environmentMode)
      : undefined,
    filters.activityMode
      ? eq(learningSessions.activityMode, filters.activityMode)
      : undefined,
    filters.status ? eq(learningSessions.status, filters.status) : undefined,
    filters.excludeStatus
      ? ne(learningSessions.status, filters.excludeStatus)
      : undefined,
  ].filter((c) => c !== undefined);

  return db
    .select({
      id: learningSessions.id,
      title: learningSessions.title,
      environmentMode: learningSessions.environmentMode,
      activityMode: learningSessions.activityMode,
      status: learningSessions.status,
      startedAt: learningSessions.startedAt,
      durationMinutes: learningSessions.durationMinutes,
      conceptId: concepts.id,
      conceptName: concepts.name,
      conceptSlug: concepts.slug,
      resourceUrl: resources.url,
      resourceTitle: resources.title,
    })
    .from(learningSessions)
    .leftJoin(
      sessionConcepts,
      eq(sessionConcepts.sessionId, learningSessions.id),
    )
    .leftJoin(concepts, eq(concepts.id, sessionConcepts.conceptId))
    .leftJoin(resources, eq(resources.id, learningSessions.resourceId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(learningSessions.startedAt))
    .limit(limit)
    .all();
}

export function listAllSessions(filters: SessionFilters = {}) {
  return listRecentSessions(1000, filters);
}

export async function listOpenCuriosityItems() {
  const db = await getDb();
  return db
    .select()
    .from(curiosityItems)
    .where(isNull(curiosityItems.resolvedAt))
    .orderBy(desc(curiosityItems.createdAt))
    .all();
}

export async function getSessionById(id: string) {
  const db = await getDb();
  return db
    .select({
      id: learningSessions.id,
      title: learningSessions.title,
      environmentMode: learningSessions.environmentMode,
      activityMode: learningSessions.activityMode,
      status: learningSessions.status,
      startedAt: learningSessions.startedAt,
      endedAt: learningSessions.endedAt,
      durationMinutes: learningSessions.durationMinutes,
      notes: learningSessions.notes,
      conceptId: concepts.id,
      conceptName: concepts.name,
      conceptSlug: concepts.slug,
      resourceId: resources.id,
      resourceType: resources.type,
      resourceUrl: resources.url,
      resourceTitle: resources.title,
    })
    .from(learningSessions)
    .leftJoin(
      sessionConcepts,
      eq(sessionConcepts.sessionId, learningSessions.id),
    )
    .leftJoin(concepts, eq(concepts.id, sessionConcepts.conceptId))
    .leftJoin(resources, eq(resources.id, learningSessions.resourceId))
    .where(eq(learningSessions.id, id))
    .get();
}

/** All prior-known concept names, most recently encountered first — used to
 * give the explain-back LLM call context for spotting connections, without
 * dumping the whole knowledge base into the prompt. */
export async function listRecentConceptNames(
  excludeConceptId: string | null,
  limit = 20,
) {
  const db = await getDb();
  const rows = await db
    .select({ id: concepts.id, name: concepts.name })
    .from(concepts)
    .orderBy(desc(concepts.lastEncounteredAt))
    .limit(limit + 1)
    .all();
  return rows
    .filter((c) => c.id !== excludeConceptId)
    .slice(0, limit)
    .map((c) => c.name);
}

export async function getExplainBackForSession(sessionId: string) {
  const db = await getDb();
  const explainBack = await db
    .select()
    .from(explainBacks)
    .where(eq(explainBacks.sessionId, sessionId))
    .get();
  if (!explainBack) return null;

  const analysis = await db
    .select()
    .from(conceptUnderstandings)
    .where(eq(conceptUnderstandings.explainBackId, explainBack.id))
    .get();

  const conceptStatuses = await db
    .select({
      conceptId: explainBackConcepts.conceptId,
      status: explainBackConcepts.status,
      conceptName: concepts.name,
      conceptSlug: concepts.slug,
    })
    .from(explainBackConcepts)
    .innerJoin(concepts, eq(concepts.id, explainBackConcepts.conceptId))
    .where(eq(explainBackConcepts.explainBackId, explainBack.id))
    .all();

  return { explainBack, analysis, conceptStatuses };
}

const STATUS_RANK: Record<ConceptAddressedStatus, number> = {
  missing: 0,
  partial: 1,
  correct: 2,
};

/** Simple, transparent status derivation from explain-back + recall history
 * — no hidden scoring. "Applied" requires Project data (Architect For, not
 * built yet) so it's still unreachable in V1. */
export function deriveConceptStatusLabel(
  statuses: ConceptAddressedStatus[],
  recallOutcomes: RecallOutcome[] = [],
) {
  if (recallOutcomes.includes("remembered")) return "Retained";
  if (statuses.length === 0) return "Encountered";
  const best = statuses.reduce(
    (max, s) => (STATUS_RANK[s] > STATUS_RANK[max] ? s : max),
    statuses[0],
  );
  if (best === "correct") return "Can Explain";
  if (best === "partial") return "Familiar";
  return "Encountered";
}

export async function getConceptBySlug(slug: string) {
  const db = await getDb();
  return db.select().from(concepts).where(eq(concepts.slug, slug)).get();
}

export async function getConceptUnderstandingHistory(conceptId: string) {
  const db = await getDb();
  return db
    .select({
      status: explainBackConcepts.status,
      depth: conceptUnderstandings.depth,
      clarity: conceptUnderstandings.clarity,
      omissions: conceptUnderstandings.omissions,
      misconceptions: conceptUnderstandings.misconceptions,
      followUpQuestion: conceptUnderstandings.followUpQuestion,
      createdAt: explainBacks.createdAt,
      sessionId: explainBacks.sessionId,
      sessionTitle: learningSessions.title,
    })
    .from(explainBackConcepts)
    .innerJoin(
      explainBacks,
      eq(explainBacks.id, explainBackConcepts.explainBackId),
    )
    .innerJoin(
      conceptUnderstandings,
      eq(conceptUnderstandings.explainBackId, explainBacks.id),
    )
    .innerJoin(learningSessions, eq(learningSessions.id, explainBacks.sessionId))
    .where(eq(explainBackConcepts.conceptId, conceptId))
    .orderBy(desc(explainBacks.createdAt))
    .all();
}

export async function getRelatedConcepts(conceptId: string) {
  const db = await getDb();
  const rows = await db
    .select({
      relationType: conceptRelations.relationType,
      description: conceptRelations.description,
      fromConceptId: conceptRelations.fromConceptId,
      toConceptId: conceptRelations.toConceptId,
    })
    .from(conceptRelations)
    .where(
      or(
        eq(conceptRelations.fromConceptId, conceptId),
        eq(conceptRelations.toConceptId, conceptId),
      ),
    )
    .all();

  return Promise.all(
    rows.map(async (r) => {
      const otherId = r.fromConceptId === conceptId ? r.toConceptId : r.fromConceptId;
      const other = await db
        .select({ name: concepts.name, slug: concepts.slug })
        .from(concepts)
        .where(eq(concepts.id, otherId))
        .get();
      return {
        relationType: r.relationType,
        description: r.description,
        conceptName: other?.name ?? "Unknown",
        conceptSlug: other?.slug ?? null,
      };
    }),
  );
}

export interface MindscapeConcept {
  id: string;
  name: string;
  slug: string;
  statusLabel: string;
  lastEncounteredAt: string;
  lastReviewedAt: string | null;
  layoutX: number | null;
  layoutY: number | null;
}

export async function listMindscapeConcepts(): Promise<MindscapeConcept[]> {
  const db = await getDb();
  const allConcepts = await db.select().from(concepts).all();
  const statusRows = await db
    .select({
      conceptId: explainBackConcepts.conceptId,
      status: explainBackConcepts.status,
    })
    .from(explainBackConcepts)
    .all();

  const statusesByConcept = new Map<string, ConceptAddressedStatus[]>();
  for (const row of statusRows) {
    const list = statusesByConcept.get(row.conceptId) ?? [];
    list.push(row.status);
    statusesByConcept.set(row.conceptId, list);
  }

  const outcomeRows = await db
    .select({
      conceptId: recallAttempts.conceptId,
      outcome: recallAttempts.outcome,
    })
    .from(recallAttempts)
    .all();
  const outcomesByConcept = new Map<string, RecallOutcome[]>();
  for (const row of outcomeRows) {
    if (!row.outcome) continue;
    const list = outcomesByConcept.get(row.conceptId) ?? [];
    list.push(row.outcome);
    outcomesByConcept.set(row.conceptId, list);
  }

  return allConcepts.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    statusLabel: deriveConceptStatusLabel(
      statusesByConcept.get(c.id) ?? [],
      outcomesByConcept.get(c.id) ?? [],
    ),
    lastEncounteredAt: c.lastEncounteredAt,
    lastReviewedAt: c.lastReviewedAt,
    layoutX: c.layoutX,
    layoutY: c.layoutY,
  }));
}

export async function listMindscapeRelations() {
  const db = await getDb();
  return db
    .select({
      fromConceptId: conceptRelations.fromConceptId,
      toConceptId: conceptRelations.toConceptId,
      strength: conceptRelations.strength,
    })
    .from(conceptRelations)
    .all();
}

export async function getRecallHistoryForConcept(conceptId: string) {
  const db = await getDb();
  return db
    .select({
      prompt: recallAttempts.prompt,
      response: recallAttempts.response,
      outcome: recallAttempts.outcome,
      createdAt: recallAttempts.createdAt,
      answeredAt: recallAttempts.answeredAt,
    })
    .from(recallAttempts)
    .where(eq(recallAttempts.conceptId, conceptId))
    .orderBy(desc(recallAttempts.createdAt))
    .all();
}

export async function getSessionsForConcept(conceptId: string) {
  const db = await getDb();
  return db
    .select({
      id: learningSessions.id,
      title: learningSessions.title,
      startedAt: learningSessions.startedAt,
    })
    .from(sessionConcepts)
    .innerJoin(
      learningSessions,
      eq(learningSessions.id, sessionConcepts.sessionId),
    )
    .where(
      and(
        eq(sessionConcepts.conceptId, conceptId),
        eq(sessionConcepts.role, "primary"),
      ),
    )
    .orderBy(desc(learningSessions.startedAt))
    .all();
}
