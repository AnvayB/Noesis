import { and, desc, eq, isNull, ne, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { normalizeText, normalizeUrl, weekStartOf } from "@/lib/capture";
import { deriveStanding, loadKnowledgeState, type KnowledgeState } from "@/lib/knowledge";
import { getDb } from "./db";
import {
  conceptRelations,
  conceptUnderstandings,
  concepts,
  curiosityItems,
  explainBackConcepts,
  explainBackRelations,
  explainBacks,
  learningSessions,
  recallAttempts,
  resources,
  sessionConcepts,
  weeklyFocus,
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
      conceptField: concepts.field,
      resourceUrl: resources.url,
      resourceTitle: resources.title,
      resourceType: resources.type,
      notes: learningSessions.notes,
    })
    .from(learningSessions)
    .leftJoin(
      sessionConcepts,
      and(
        eq(sessionConcepts.sessionId, learningSessions.id),
        eq(sessionConcepts.role, "primary"),
      ),
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

// --- Duplicate detection -----------------------------------------------
// A capture is a duplicate of an open (not-yet-completed) session when it
// points at the same resource, or — for a plain question — reads as the
// same text. Completed sessions are excluded: finishing something and
// coming back to redo it deliberately isn't a duplicate.

/** The open session already tracking this link, if any. */
export async function findOpenSessionByUrl(url: string) {
  const db = await getDb();
  const key = normalizeUrl(url);
  const rows = await db
    .select({ id: learningSessions.id, status: learningSessions.status, url: resources.url })
    .from(learningSessions)
    .innerJoin(resources, eq(resources.id, learningSessions.resourceId))
    .where(ne(learningSessions.status, "completed"))
    .all();
  return rows.find((r) => r.url && normalizeUrl(r.url) === key) ?? null;
}

/** The open session already tracking this exact question/title, if any. */
export async function findOpenSessionByTitle(title: string) {
  const db = await getDb();
  const key = normalizeText(title);
  const rows = await db
    .select({ id: learningSessions.id, status: learningSessions.status, title: learningSessions.title })
    .from(learningSessions)
    .where(ne(learningSessions.status, "completed"))
    .all();
  return rows.find((r) => normalizeText(r.title) === key) ?? null;
}

/** The open curiosity item already holding this exact question, if any. */
export async function findOpenCuriosityItemByText(text: string) {
  const db = await getDb();
  const key = normalizeText(text);
  const rows = await db
    .select({ id: curiosityItems.id, text: curiosityItems.text })
    .from(curiosityItems)
    .where(isNull(curiosityItems.resolvedAt))
    .all();
  return rows.find((r) => normalizeText(r.text) === key) ?? null;
}

export interface DuplicateSessionGroup {
  key: string;
  sessions: { id: string; title: string; status: LearningSessionStatus; startedAt: string }[];
}

/** Open sessions grouped by same-resource-or-same-title, for groups with
 * more than one member — the sessions a cleanup would fold together. */
export async function listDuplicateSessionGroups(): Promise<DuplicateSessionGroup[]> {
  const db = await getDb();
  const rows = await db
    .select({
      id: learningSessions.id,
      title: learningSessions.title,
      status: learningSessions.status,
      startedAt: learningSessions.startedAt,
      resourceUrl: resources.url,
    })
    .from(learningSessions)
    .leftJoin(resources, eq(resources.id, learningSessions.resourceId))
    .where(ne(learningSessions.status, "completed"))
    .all();

  const groups = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = row.resourceUrl ? `url:${normalizeUrl(row.resourceUrl)}` : `title:${normalizeText(row.title)}`;
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  return [...groups.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([key, sessions]) => ({
      key,
      sessions: sessions.map(({ id, title, status, startedAt }) => ({ id, title, status, startedAt })),
    }));
}

/** Open curiosity items grouped by same text, for groups with more than
 * one member. */
export async function listDuplicateCuriosityGroups() {
  const db = await getDb();
  const rows = await db
    .select({ id: curiosityItems.id, text: curiosityItems.text, createdAt: curiosityItems.createdAt })
    .from(curiosityItems)
    .where(isNull(curiosityItems.resolvedAt))
    .all();

  const groups = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = normalizeText(row.text);
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  return [...groups.entries()].filter(([, list]) => list.length > 1).map(([key, items]) => ({ key, items }));
}

/** Count of extra rows a cleanup would remove — sessions and questions. */
export async function countDuplicates() {
  const [sessionGroups, curiosityGroups] = await Promise.all([
    listDuplicateSessionGroups(),
    listDuplicateCuriosityGroups(),
  ]);
  const sessions = sessionGroups.reduce((n, g) => n + g.sessions.length - 1, 0);
  const questions = curiosityGroups.reduce((n, g) => n + g.items.length - 1, 0);
  return sessions + questions;
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
      conceptField: concepts.field,
      resourceId: resources.id,
      resourceType: resources.type,
      resourceUrl: resources.url,
      resourceTitle: resources.title,
      resourceByline: resources.byline,
      resourceExcerpt: resources.excerpt,
      resourceWordCount: resources.wordCount,
    })
    .from(learningSessions)
    .leftJoin(
      sessionConcepts,
      and(
        eq(sessionConcepts.sessionId, learningSessions.id),
        eq(sessionConcepts.role, "primary"),
      ),
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

/** Transparent standing from explain-back + recall history. See lib/knowledge.ts. */
export function deriveConceptStatusLabel(
  explanations: { at: string; status: ConceptAddressedStatus }[],
  recalls: { at: string; outcome: RecallOutcome }[] = [],
) {
  return deriveStanding(explanations, recalls).standing;
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
      gist: conceptUnderstandings.gist,
      level: conceptUnderstandings.level,
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

/** Everything the map needs, in one call. */
export async function getMindscapeData(): Promise<KnowledgeState> {
  return loadKnowledgeState();
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

// --- The week, the inbox, and what an explanation did -----------------------


/** This week's one thing, if one was chosen. */
export async function getWeeklyFocus() {
  const db = await getDb();
  const row = await db
    .select({
      weekStart: weeklyFocus.weekStart,
      id: learningSessions.id,
      title: learningSessions.title,
      status: learningSessions.status,
      startedAt: learningSessions.startedAt,
      conceptName: concepts.name,
      conceptSlug: concepts.slug,
    })
    .from(weeklyFocus)
    .innerJoin(learningSessions, eq(learningSessions.id, weeklyFocus.sessionId))
    .leftJoin(
      sessionConcepts,
      and(
        eq(sessionConcepts.sessionId, learningSessions.id),
        eq(sessionConcepts.role, "primary"),
      ),
    )
    .leftJoin(concepts, eq(concepts.id, sessionConcepts.conceptId))
    .where(eq(weeklyFocus.weekStart, weekStartOf()))
    .get();
  return row ?? null;
}

export interface ReflectionConcept {
  conceptId: string;
  conceptName: string;
  conceptSlug: string;
  conceptField: string | null;
  status: ConceptAddressedStatus;
  before: string;
  after: string;
  isNew: boolean;
}

export interface ReflectionRelation {
  kind: "new" | "strengthened";
  fromName: string;
  fromSlug: string;
  fromField: string | null;
  toName: string;
  toSlug: string;
  toField: string | null;
  description: string | null;
}

/**
 * What the map did because of this session's explanation: each concept's
 * standing before and after, whether it was met for the first time, and the
 * cords that were drawn or thickened. Null when nothing has been explained.
 */
export async function getReflection(sessionId: string) {
  const db = await getDb();
  const back = await db
    .select({ id: explainBacks.id, createdAt: explainBacks.createdAt })
    .from(explainBacks)
    .where(eq(explainBacks.sessionId, sessionId))
    .orderBy(desc(explainBacks.createdAt))
    .get();
  if (!back) return null;

  const addressed = await db
    .select({
      conceptId: concepts.id,
      conceptName: concepts.name,
      conceptSlug: concepts.slug,
      conceptField: concepts.field,
      firstEncounteredAt: concepts.firstEncounteredAt,
      status: explainBackConcepts.status,
    })
    .from(explainBackConcepts)
    .innerJoin(concepts, eq(concepts.id, explainBackConcepts.conceptId))
    .where(eq(explainBackConcepts.explainBackId, back.id))
    .all();

  const reflectionConcepts: ReflectionConcept[] = [];
  for (const c of addressed) {
    const history = await db
      .select({
        status: explainBackConcepts.status,
        explainBackId: explainBackConcepts.explainBackId,
        createdAt: explainBacks.createdAt,
      })
      .from(explainBackConcepts)
      .innerJoin(explainBacks, eq(explainBacks.id, explainBackConcepts.explainBackId))
      .where(eq(explainBackConcepts.conceptId, c.conceptId))
      .orderBy(explainBacks.createdAt)
      .all();
    const recalls = await db
      .select({ outcome: recallAttempts.outcome, at: recallAttempts.answeredAt })
      .from(recallAttempts)
      .where(eq(recallAttempts.conceptId, c.conceptId))
      .all();
    const outcomes = recalls
      .filter((r): r is { outcome: RecallOutcome; at: string } => r.outcome !== null && r.at !== null);
    const earlier = history.filter((h) => h.explainBackId !== back.id && h.createdAt < back.createdAt);
    reflectionConcepts.push({
      conceptId: c.conceptId,
      conceptName: c.conceptName,
      conceptSlug: c.conceptSlug,
      conceptField: c.conceptField,
      status: c.status,
      before: deriveConceptStatusLabel(earlier.map((h) => ({ at: h.createdAt, status: h.status })), outcomes),
      after: deriveConceptStatusLabel(history.map((h) => ({ at: h.createdAt, status: h.status })), outcomes),
      // Created by this explanation, not merely captured earlier as a spore.
      isNew: c.firstEncounteredAt >= back.createdAt,
    });
  }

  const fromConcepts = alias(concepts, "from_concepts");
  const toConcepts = alias(concepts, "to_concepts");
  const relations = await db
    .select({
      kind: explainBackRelations.kind,
      fromName: fromConcepts.name,
      fromSlug: fromConcepts.slug,
      fromField: fromConcepts.field,
      toName: toConcepts.name,
      toSlug: toConcepts.slug,
      toField: toConcepts.field,
      description: conceptRelations.description,
    })
    .from(explainBackRelations)
    .innerJoin(conceptRelations, eq(conceptRelations.id, explainBackRelations.relationId))
    .innerJoin(fromConcepts, eq(fromConcepts.id, conceptRelations.fromConceptId))
    .innerJoin(toConcepts, eq(toConcepts.id, conceptRelations.toConceptId))
    .where(eq(explainBackRelations.explainBackId, back.id))
    .all();

  return {
    explainBackId: back.id,
    concepts: reflectionConcepts,
    relations: relations as ReflectionRelation[],
  };
}

/** How much is waiting in the inbox, for the one line on Now that points at Learn. */
export async function countInbox() {
  const db = await getDb();
  const kept = await db
    .select({ n: sql<number>`count(*)` })
    .from(learningSessions)
    .where(eq(learningSessions.status, "pending"))
    .get();
  const questions = await db
    .select({ n: sql<number>`count(*)` })
    .from(curiosityItems)
    .where(isNull(curiosityItems.resolvedAt))
    .get();
  return { kept: Number(kept?.n ?? 0), questions: Number(questions?.n ?? 0) };
}

/** What was explained lately, as the learner's own gists, newest first. */
export async function listRecentGists(limit = 5) {
  const db = await getDb();
  return db
    .select({
      sessionId: learningSessions.id,
      sessionTitle: learningSessions.title,
      gist: conceptUnderstandings.gist,
      level: conceptUnderstandings.level,
      followUpQuestion: conceptUnderstandings.followUpQuestion,
      at: explainBacks.createdAt,
      conceptName: concepts.name,
      conceptSlug: concepts.slug,
    })
    .from(conceptUnderstandings)
    .innerJoin(explainBacks, eq(explainBacks.id, conceptUnderstandings.explainBackId))
    .innerJoin(learningSessions, eq(learningSessions.id, explainBacks.sessionId))
    .leftJoin(
      sessionConcepts,
      and(eq(sessionConcepts.sessionId, learningSessions.id), eq(sessionConcepts.role, "primary")),
    )
    .leftJoin(concepts, eq(concepts.id, sessionConcepts.conceptId))
    .orderBy(desc(explainBacks.createdAt))
    .limit(limit)
    .all();
}
