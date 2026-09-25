/**
 * Knowledge weighting: how developed is a concept, really — across depth,
 * mastery, breadth, connectedness, reinforcement, and engagement — as one
 * centralized, renderer-independent, content-neutral score.
 *
 * Pure functions only. No DB, no React, no knowledge of Ground/Grove/Sky.
 * `lib/knowledge.ts` calls this once per concept at read time (nothing here
 * is ever cached — same philosophy as the rest of the knowledge model: see
 * `concepts.field`'s comment on confidenceEstimate). The three Mindscape
 * renderers then just read the result instead of each computing their own
 * version of "how big should this be," which is what they did before.
 *
 * Every tunable constant lives in KNOWLEDGE_WEIGHT_CONFIG. Nothing is
 * hard-coded anywhere else. The subject of a concept (its `field`) is never
 * an input to any function in this file — that's what makes content
 * neutrality a structural guarantee rather than a promise.
 */

import type {
  ConceptAddressedStatus,
  ConceptRelationSource,
  RecallOutcome,
  UnderstandingClarity,
  UnderstandingDepth,
} from "@/lib/db/schema";

// --- Config -----------------------------------------------------------------

export const KNOWLEDGE_WEIGHT_CONFIG = {
  depth: {
    // Indexed by the explain-back's 1-5 "could explain / could teach it"
    // ladder (conceptUnderstandings.level). Index 0 is unused (level is
    // never 0) but kept so the array reads positionally.
    levelScore: [0, 0.15, 0.35, 0.6, 0.8, 1.0],
    // Rows written before `level` existed (or where the model call failed)
    // fall back to the coarser 3-tier depth enum, at roughly the same scale
    // the app used before this system existed.
    enumFallback: { surface: 0.32, solid: 0.6, deep: 0.92 } as Record<UnderstandingDepth, number>,
    clarityBonus: { unclear: 0, reasonable: 0.08, very_clear: 0.15 } as Record<UnderstandingClarity, number>,
  },
  mastery: {
    statusScore: { correct: 1, partial: 0.5, missing: 0.15 } as Record<ConceptAddressedStatus, number>,
    recallScore: { remembered: 1, partial: 0.5, forgot: 0.1 } as Record<RecallOutcome, number>,
    // How much a recall attempt can push mastery beyond the best explain-back
    // status, scaled by remaining headroom — recall evidence can confirm
    // understanding but a single explanation already at "correct" isn't
    // pushed any higher by it.
    recallWeight: 0.5,
  },
  breadth: {
    // Saturation constant for distinct connected-concept count.
    k: 3,
  },
  connectedness: {
    source: { explained: 1, manual: 0.6, llm_inferred: 0.3 } as Record<ConceptRelationSource, number>,
    // How much repeated re-assertion of the same relation (conceptRelations
    // .strength) can add on top of the base source weight, saturating.
    strengthK: 2,
    crossDomainBonus: 0.25,
    k: 2.5,
  },
  reinforcement: {
    // Saturation constant for revisit count (explanations + partial credit
    // for recall attempts) — tuned so the curve is already mostly full by
    // the 3rd-4th return, matching the "thickness saturates around the
    // third or fourth return" rule in docs/mindscape/semantic-mapping.md.
    k: 1.5,
    recallCreditPerAttempt: 0.5,
  },
  engagement: {
    // Saturation constant for distinct session/capture count. Deliberately
    // NOT duration-based — session length never enters this file at all.
    k: 4,
  },
  confidence: {
    // Small — confidence is meant to gate "captured but never articulated"
    // (stays 0 with zero explanations/recalls) from "we have real evidence"
    // (already mostly there after just one explain-back or recall), not to
    // generically discount a single strong data point the way reinforcement
    // does. A quick, correct, later-recalled explanation should read as
    // trustworthy evidence, not as barely-confirmed.
    explanationK: 0.2,
    recallK: 0.2,
    explanationBlend: 0.6,
    recallBlend: 0.4,
  },
  // How the six dimensions combine into one composite. Sums to 1 — depth and
  // mastery dominate, engagement (raw exposure) deliberately gets the least
  // say, since the project's own design principles reject rewarding content
  // consumption/collecting on its own.
  composite: {
    depth: 0.3,
    mastery: 0.3,
    breadth: 0.14,
    connectedness: 0.14,
    reinforcement: 0.1,
    engagement: 0.06,
  },
  // A concept is "exceptional" — the rare, meaningful high-development
  // state — only above this weight AND once it has settled (retained).
  exceptionalThreshold: 0.82,
  domain: {
    // Saturation constant for field/domain-level rollups of member weights.
    k: 3,
  },
} as const;

// --- Primitives ---------------------------------------------------------

/** The one diminishing-returns curve, reused for every dimension: bounded
 * in [0, 1), smooth, and cheap. Doubling `x` never doubles the result. */
export function saturate(x: number, k: number): number {
  if (x <= 0) return 0;
  return x / (x + k);
}

export function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

// --- Concept weight -------------------------------------------------------

export interface ExplanationEvidence {
  status: ConceptAddressedStatus;
  depth: UnderstandingDepth;
  clarity: UnderstandingClarity | null;
  level: number | null;
}

export interface ConceptWeightInput {
  explanations: ExplanationEvidence[];
  recalls: { outcome: RecallOutcome }[];
  /** Distinct other concepts this one has any relation to. */
  neighborCount: number;
  /** Per-relation quality weight — see computeRelationWeight. */
  relationWeights: number[];
  /** Distinct sessions/captures that touched this concept. */
  sessionCount: number;
  /** Has this concept settled into permanent ground (Standing === "Retained")? */
  retained: boolean;
}

export interface ConceptWeightResult {
  depth: number;
  mastery: number;
  breadth: number;
  connectedness: number;
  reinforcement: number;
  engagement: number;
  /** How much evidence backs this score — never surfaced in the UI, only
   * used internally to damp depth/mastery when exposure outruns evidence. */
  confidence: number;
  /** The composite, bounded [0, 1] — what every renderer should read for
   * "how developed is this." */
  weight: number;
  /** Rare, meaningful high-development state. Same threshold everywhere. */
  exceptional: boolean;
}

function explanationDepthScore(e: ExplanationEvidence): number {
  const cfg = KNOWLEDGE_WEIGHT_CONFIG.depth;
  const base = e.level != null && e.level >= 1 && e.level <= 5 ? cfg.levelScore[e.level] : cfg.enumFallback[e.depth];
  const bonus = e.clarity ? cfg.clarityBonus[e.clarity] : 0;
  return clamp01(base + bonus);
}

export function computeConceptWeight(input: ConceptWeightInput): ConceptWeightResult {
  const cfg = KNOWLEDGE_WEIGHT_CONFIG;

  // Depth: the best understanding ever demonstrated, not an average —
  // nothing here erodes.
  const depth = input.explanations.reduce((max, e) => Math.max(max, explanationDepthScore(e)), 0);

  // Mastery: best explain-back status, with recall evidence able to push it
  // further (proportional to remaining headroom) but never lower.
  const bestStatus = input.explanations.reduce(
    (max, e) => Math.max(max, cfg.mastery.statusScore[e.status]),
    0,
  );
  const bestRecall = input.recalls.reduce((max, r) => Math.max(max, cfg.mastery.recallScore[r.outcome]), 0);
  const mastery = clamp01(bestStatus + cfg.mastery.recallWeight * bestRecall * (1 - bestStatus));

  const breadth = saturate(input.neighborCount, cfg.breadth.k);

  const connectedness = saturate(
    input.relationWeights.reduce((s, w) => s + w, 0),
    cfg.connectedness.k,
  );

  const reinforcement = saturate(
    input.explanations.length + cfg.reinforcement.recallCreditPerAttempt * input.recalls.length,
    cfg.reinforcement.k,
  );

  const engagement = saturate(input.sessionCount, cfg.engagement.k);

  // Confidence: how much evidence backs the score at all — high exposure
  // with no explain-back/recall evidence stays low. Damps depth and mastery
  // below rather than being drawn as its own channel.
  const confidence = clamp01(
    cfg.confidence.explanationBlend * saturate(input.explanations.length, cfg.confidence.explanationK) +
      cfg.confidence.recallBlend * saturate(input.recalls.length, cfg.confidence.recallK),
  );

  const weight = clamp01(
    cfg.composite.depth * depth * confidence +
      cfg.composite.mastery * mastery * confidence +
      cfg.composite.breadth * breadth +
      cfg.composite.connectedness * connectedness +
      cfg.composite.reinforcement * reinforcement +
      cfg.composite.engagement * engagement,
  );

  const exceptional = weight >= cfg.exceptionalThreshold && input.retained;

  return { depth, mastery, breadth, connectedness, reinforcement, engagement, confidence, weight, exceptional };
}

// --- Relation weight ------------------------------------------------------

/**
 * How much one relation contributes to connectedness, and how thick it
 * should draw. A connection the learner stated in their own words
 * (`explained`) outranks one the model merely inferred; repeated
 * re-assertion (`strength`) adds more with diminishing returns; a
 * cross-domain tie gets a bonus, mirroring the existing "bridge" concept.
 * Not clamped to [0,1] — individual relations can exceed 1 (an explained,
 * repeated, cross-domain tie); callers that need a bounded value (e.g. an
 * aggregate) saturate the sum themselves.
 */
export function computeRelationWeight(source: ConceptRelationSource, strength: number, crossDomain: boolean): number {
  const cfg = KNOWLEDGE_WEIGHT_CONFIG.connectedness;
  const base = cfg.source[source];
  const strengthBoost = saturate(Math.max(0, strength - 1), cfg.strengthK);
  const cross = crossDomain ? cfg.crossDomainBonus : 0;
  return base * (1 + strengthBoost) + cross;
}

// --- Domain/field aggregation -----------------------------------------------

/**
 * Rolls up member concept weights into one domain-level number, with
 * diminishing returns — many trivial concepts can't outweigh a few deeply
 * developed ones, because the sum is saturated exactly like every other
 * dimension in this file, not summed and merely capped.
 */
export function aggregateDomainWeight(memberWeights: number[]): number {
  const sum = memberWeights.reduce((s, w) => s + clamp01(w), 0);
  return saturate(sum, KNOWLEDGE_WEIGHT_CONFIG.domain.k);
}
