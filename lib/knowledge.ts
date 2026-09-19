import { desc, eq, isNull } from "drizzle-orm";
import { getDb } from "./db";
import {
  conceptRelations,
  conceptUnderstandings,
  concepts,
  curiosityItems,
  explainBackConcepts,
  explainBacks,
  recallAttempts,
  type ConceptAddressedStatus,
  type ConceptRelationSource,
  type RecallOutcome,
  type UnderstandingDepth,
} from "./db/schema";

/**
 * The knowledge state: everything the Mindscape and the reflect moment need,
 * derived from the acts recorded in the database. Nothing here is a score.
 * Each field is a fact about what the learner did, and the derived standing
 * is a transparent rule over those facts.
 */

export type Standing = "Encountered" | "Familiar" | "Can Explain" | "Retained";

export interface ExplanationEvent {
  at: string; // ISO-ish "YYYY-MM-DD HH:MM:SS"
  status: ConceptAddressedStatus;
  depth: UnderstandingDepth;
  sessionId: string;
}

export interface KnowledgeConcept {
  id: string;
  name: string;
  slug: string;
  field: string | null;
  firstEncounteredAt: string;
  lastTouchedAt: string;
  explanations: ExplanationEvent[];
  recalls: { at: string; outcome: RecallOutcome }[];
  misconceptions: number;
  openQuestion: boolean;
  standing: Standing;
  /** When the concept settled into ground, if it has. */
  retainedAt: string | null;
}

export interface KnowledgeRelation {
  id: string;
  fromId: string;
  toId: string;
  source: ConceptRelationSource;
  strength: number;
  createdAt: string;
  description: string | null;
}

export interface KnowledgeState {
  concepts: KnowledgeConcept[];
  relations: KnowledgeRelation[];
}

const DAY = 1000 * 60 * 60 * 24;

export function parseWhen(iso: string): number {
  return new Date(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z").getTime();
}

const STATUS_RANK: Record<ConceptAddressedStatus, number> = { missing: 0, partial: 1, correct: 2 };

/**
 * The standing rule, in words. A concept is Retained when it held after time
 * passed: a recall that came back, or a correct explanation at least two
 * weeks after an earlier correct one. It can explain when any explanation
 * got it right. Familiar when partly. Encountered otherwise. Nothing ever
 * moves a concept down: land does not erode.
 */
export function deriveStanding(
  explanations: { at: string; status: ConceptAddressedStatus }[],
  recalls: { at: string; outcome: RecallOutcome }[],
): { standing: Standing; retainedAt: string | null } {
  const remembered = recalls.filter((r) => r.outcome === "remembered").sort((a, b) => parseWhen(a.at) - parseWhen(b.at));
  if (remembered.length > 0) return { standing: "Retained", retainedAt: remembered[0].at };

  const correct = explanations
    .filter((e) => e.status === "correct")
    .sort((a, b) => parseWhen(a.at) - parseWhen(b.at));
  if (correct.length >= 2) {
    const first = parseWhen(correct[0].at);
    const later = correct.find((e) => parseWhen(e.at) - first >= 14 * DAY);
    if (later) return { standing: "Retained", retainedAt: later.at };
  }

  if (explanations.length === 0) return { standing: "Encountered", retainedAt: null };
  const best = explanations.reduce(
    (max, e) => (STATUS_RANK[e.status] > STATUS_RANK[max] ? e.status : max),
    explanations[0].status,
  );
  if (best === "correct") return { standing: "Can Explain", retainedAt: null };
  if (best === "partial") return { standing: "Familiar", retainedAt: null };
  return { standing: "Encountered", retainedAt: null };
}

/** Whole-map knowledge state in a handful of queries, not one per concept. */
export async function loadKnowledgeState(): Promise<KnowledgeState> {
  const db = await getDb();
  const [conceptRows, explanationRows, recallRows, relationRows, questionRows, understandingRows] =
    await Promise.all([
      db.select().from(concepts).all(),
      db
        .select({
          conceptId: explainBackConcepts.conceptId,
          status: explainBackConcepts.status,
          depth: conceptUnderstandings.depth,
          at: explainBacks.createdAt,
          sessionId: explainBacks.sessionId,
        })
        .from(explainBackConcepts)
        .innerJoin(explainBacks, eq(explainBacks.id, explainBackConcepts.explainBackId))
        .innerJoin(conceptUnderstandings, eq(conceptUnderstandings.explainBackId, explainBacks.id))
        .all(),
      db
        .select({
          conceptId: recallAttempts.conceptId,
          outcome: recallAttempts.outcome,
          at: recallAttempts.answeredAt,
        })
        .from(recallAttempts)
        .all(),
      db.select().from(conceptRelations).all(),
      db
        .select({ text: curiosityItems.text })
        .from(curiosityItems)
        .where(isNull(curiosityItems.resolvedAt))
        .all(),
      db
        .select({ misconceptions: conceptUnderstandings.misconceptions })
        .from(conceptUnderstandings)
        .all(),
    ]);

  const explanationsBy = new Map<string, ExplanationEvent[]>();
  for (const row of explanationRows) {
    const list = explanationsBy.get(row.conceptId) ?? [];
    list.push({ at: row.at, status: row.status, depth: row.depth, sessionId: row.sessionId });
    explanationsBy.set(row.conceptId, list);
  }
  const recallsBy = new Map<string, { at: string; outcome: RecallOutcome }[]>();
  for (const row of recallRows) {
    if (!row.outcome || !row.at) continue;
    const list = recallsBy.get(row.conceptId) ?? [];
    list.push({ at: row.at, outcome: row.outcome });
    recallsBy.set(row.conceptId, list);
  }

  // Misconceptions are recorded against a concept by name.
  const misconceptionsByName = new Map<string, number>();
  for (const row of understandingRows) {
    for (const m of row.misconceptions) {
      if (!m.concept) continue;
      const key = m.concept.trim().toLowerCase();
      misconceptionsByName.set(key, (misconceptionsByName.get(key) ?? 0) + 1);
    }
  }
  // An open question belongs to a concept when it names it.
  const questionText = questionRows.map((q) => q.text.toLowerCase());

  const out: KnowledgeConcept[] = conceptRows.map((c) => {
    const explanations = (explanationsBy.get(c.id) ?? []).sort((a, b) => parseWhen(a.at) - parseWhen(b.at));
    const recalls = recallsBy.get(c.id) ?? [];
    const { standing, retainedAt } = deriveStanding(explanations, recalls);
    const nameLower = c.name.toLowerCase();
    const touched = [c.lastEncounteredAt, c.lastReviewedAt, ...explanations.map((e) => e.at), ...recalls.map((r) => r.at)]
      .filter((x): x is string => !!x)
      .sort((a, b) => parseWhen(b) - parseWhen(a))[0];
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      field: c.field,
      firstEncounteredAt: c.firstEncounteredAt,
      lastTouchedAt: touched ?? c.lastEncounteredAt,
      explanations,
      recalls,
      misconceptions: misconceptionsByName.get(nameLower) ?? 0,
      openQuestion: nameLower.length > 3 && questionText.some((q) => q.includes(nameLower)),
      standing,
      retainedAt,
    };
  });

  return {
    concepts: out,
    relations: relationRows.map((r) => ({
      id: r.id,
      fromId: r.fromConceptId,
      toId: r.toConceptId,
      source: r.source,
      strength: r.strength,
      createdAt: r.createdAt,
      description: r.description,
    })),
  };
}

/** Fields already on the map, most recently used first. Passed to the model so it reuses them. */
export async function listKnownFields(limit = 24): Promise<string[]> {
  const db = await getDb();
  const rows = await db
    .select({ field: concepts.field, at: concepts.lastEncounteredAt })
    .from(concepts)
    .orderBy(desc(concepts.lastEncounteredAt))
    .all();
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of rows) {
    const f = r.field?.trim();
    if (!f || seen.has(f)) continue;
    seen.add(f);
    out.push(f);
    if (out.length >= limit) break;
  }
  return out;
}

/** What changed recently: concepts explained and cords made in the last `days`. */
export function recentGrowth(state: KnowledgeState, days = 14) {
  const since = Date.now() - days * DAY;
  const explained = state.concepts.filter((c) => c.explanations.some((e) => parseWhen(e.at) >= since));
  const relations = state.relations.filter((r) => parseWhen(r.createdAt) >= since && r.source === "explained");
  const byId = new Map(state.concepts.map((c) => [c.id, c]));
  const bridges = relations.filter((r) => {
    const a = byId.get(r.fromId), b = byId.get(r.toId);
    return a && b && a.field && b.field && a.field !== b.field;
  });
  return { explained, relations, bridges };
}
