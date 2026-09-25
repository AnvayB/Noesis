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
  sessionConcepts,
  type ConceptAddressedStatus,
  type ConceptRelationSource,
  type RecallOutcome,
  type UnderstandingClarity,
  type UnderstandingDepth,
} from "./db/schema";
import { computeConceptWeight, computeRelationWeight, type ConceptWeightResult } from "./mindscape/weight";

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
  clarity: UnderstandingClarity;
  /** The five-step ladder (1 heard of it .. 5 could teach it), when the
   * explain-back was analyzed after this field existed. */
  level: number | null;
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
  /** How developed this concept's understanding is, 0-1 — see
   * lib/mindscape/weight.ts. Flattened onto the concept (rather than only
   * nested under `weight`) because MapConcept expects it as a plain field —
   * KnowledgeState flows into the Mindscape renderers by structural typing,
   * with no separate adapter function. */
  knowledgeWeight: number;
  /** The revisit sub-score alone, 0-1 — see MapConcept. */
  reinforcement: number;
  /** Rare, meaningful high-development state — see MapConcept. */
  exceptional: boolean;
  /** The full dimensional breakdown behind knowledgeWeight, for anything
   * that wants more than the composite (a future debug view, mainly). */
  weight: ConceptWeightResult;
}

export interface KnowledgeRelation {
  id: string;
  fromId: string;
  toId: string;
  source: ConceptRelationSource;
  strength: number;
  createdAt: string;
  description: string | null;
  /** How much this relation contributes to connectedness/edge thickness. */
  weight: number;
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
  const [conceptRows, explanationRows, recallRows, relationRows, questionRows, understandingRows, sessionRows] =
    await Promise.all([
      db.select().from(concepts).all(),
      db
        .select({
          conceptId: explainBackConcepts.conceptId,
          status: explainBackConcepts.status,
          depth: conceptUnderstandings.depth,
          clarity: conceptUnderstandings.clarity,
          level: conceptUnderstandings.level,
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
      db.select({ conceptId: sessionConcepts.conceptId }).from(sessionConcepts).all(),
    ]);

  const explanationsBy = new Map<string, ExplanationEvent[]>();
  for (const row of explanationRows) {
    const list = explanationsBy.get(row.conceptId) ?? [];
    list.push({ at: row.at, status: row.status, depth: row.depth, clarity: row.clarity, level: row.level, sessionId: row.sessionId });
    explanationsBy.set(row.conceptId, list);
  }
  const recallsBy = new Map<string, { at: string; outcome: RecallOutcome }[]>();
  for (const row of recallRows) {
    if (!row.outcome || !row.at) continue;
    const list = recallsBy.get(row.conceptId) ?? [];
    list.push({ at: row.at, outcome: row.outcome });
    recallsBy.set(row.conceptId, list);
  }
  const sessionCountBy = new Map<string, number>();
  for (const row of sessionRows) {
    sessionCountBy.set(row.conceptId, (sessionCountBy.get(row.conceptId) ?? 0) + 1);
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

  // Relation weights: computed once here (source + strength + cross-domain),
  // reused both for each endpoint's connectedness/breadth and for the
  // relation's own visual weight (edge thickness).
  const fieldById = new Map(conceptRows.map((c) => [c.id, c.field]));
  const relationWeightById = new Map<string, number>();
  const neighborsByConceptId = new Map<string, Set<string>>();
  const relationWeightsByConceptId = new Map<string, number[]>();
  const touchNeighbor = (conceptId: string, neighborId: string, weight: number) => {
    const neighbors = neighborsByConceptId.get(conceptId) ?? new Set<string>();
    neighbors.add(neighborId);
    neighborsByConceptId.set(conceptId, neighbors);
    const weights = relationWeightsByConceptId.get(conceptId) ?? [];
    weights.push(weight);
    relationWeightsByConceptId.set(conceptId, weights);
  };
  for (const r of relationRows) {
    const fromField = fieldById.get(r.fromConceptId);
    const toField = fieldById.get(r.toConceptId);
    const crossDomain = !!fromField && !!toField && fromField !== toField;
    const weight = computeRelationWeight(r.source, r.strength, crossDomain);
    relationWeightById.set(r.id, weight);
    touchNeighbor(r.fromConceptId, r.toConceptId, weight);
    touchNeighbor(r.toConceptId, r.fromConceptId, weight);
  }

  const out: KnowledgeConcept[] = conceptRows.map((c) => {
    const explanations = (explanationsBy.get(c.id) ?? []).sort((a, b) => parseWhen(a.at) - parseWhen(b.at));
    const recalls = recallsBy.get(c.id) ?? [];
    const { standing, retainedAt } = deriveStanding(explanations, recalls);
    const nameLower = c.name.toLowerCase();
    const touched = [c.lastEncounteredAt, c.lastReviewedAt, ...explanations.map((e) => e.at), ...recalls.map((r) => r.at)]
      .filter((x): x is string => !!x)
      .sort((a, b) => parseWhen(b) - parseWhen(a))[0];
    const weight = computeConceptWeight({
      explanations,
      recalls,
      neighborCount: neighborsByConceptId.get(c.id)?.size ?? 0,
      relationWeights: relationWeightsByConceptId.get(c.id) ?? [],
      sessionCount: sessionCountBy.get(c.id) ?? 0,
      retained: standing === "Retained",
    });
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
      knowledgeWeight: weight.weight,
      reinforcement: weight.reinforcement,
      exceptional: weight.exceptional,
      weight,
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
      weight: relationWeightById.get(r.id) ?? 0,
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
