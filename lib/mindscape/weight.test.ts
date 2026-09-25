import { describe, expect, it } from "vitest";
import {
  aggregateDomainWeight,
  computeConceptWeight,
  computeRelationWeight,
  saturate,
  type ConceptWeightInput,
  type ExplanationEvidence,
} from "./weight";

function explanation(overrides: Partial<ExplanationEvidence> = {}): ExplanationEvidence {
  return { status: "correct", depth: "solid", clarity: "reasonable", level: 3, ...overrides };
}

function input(overrides: Partial<ConceptWeightInput> = {}): ConceptWeightInput {
  return {
    explanations: [],
    recalls: [],
    neighborCount: 0,
    relationWeights: [],
    sessionCount: 1,
    retained: false,
    ...overrides,
  };
}

describe("saturate", () => {
  it("is 0 at x=0 and approaches but never reaches 1", () => {
    expect(saturate(0, 3)).toBe(0);
    expect(saturate(1000, 3)).toBeLessThan(1);
    expect(saturate(1000, 3)).toBeGreaterThan(0.99);
  });

  it("doubling x does not double the result (diminishing returns)", () => {
    const a = saturate(1, 3);
    const b = saturate(2, 3);
    expect(b).toBeLessThan(a * 2);
  });
});

describe("computeConceptWeight — scenario coverage", () => {
  it("1. one quick question, no revisit: low weight, low confidence", () => {
    // A quick question kept/started but never explained — only the bare
    // capture (one session) exists.
    const r = computeConceptWeight(input({ sessionCount: 1 }));
    expect(r.weight).toBeLessThan(0.05);
    expect(r.confidence).toBe(0);
    expect(r.exceptional).toBe(false);
  });

  it("2. a quick question that later becomes deeply studied ends up high", () => {
    const seed = computeConceptWeight(input({ sessionCount: 1 }));
    const grown = computeConceptWeight(
      input({
        explanations: [
          explanation({ status: "partial", level: 2 }),
          explanation({ status: "correct", level: 4, clarity: "very_clear" }),
          explanation({ status: "correct", level: 5, clarity: "very_clear" }),
          explanation({ status: "correct", level: 5, clarity: "very_clear" }),
        ],
        recalls: [{ outcome: "remembered" }, { outcome: "remembered" }],
        neighborCount: 6,
        relationWeights: [
          computeRelationWeight("explained", 2, false),
          computeRelationWeight("explained", 1, true),
          computeRelationWeight("explained", 3, false),
        ],
        sessionCount: 5,
        retained: true,
      }),
    );
    expect(grown.weight).toBeGreaterThan(seed.weight);
    expect(grown.weight).toBeGreaterThan(0.7);
  });

  it("3. a long lecture (one session) with weak demonstrated understanding stays low", () => {
    // Duration/content-type never enters the formula — only status/level/clarity
    // do, and this "lecture" produced weak evidence: one explain-back, partial
    // status, low level, no recall.
    const r = computeConceptWeight(
      input({
        explanations: [explanation({ status: "partial", level: 2, clarity: "unclear" })],
        sessionCount: 1,
      }),
    );
    expect(r.weight).toBeLessThan(0.35);
  });

  it("4. a short explanation with strong demonstrated understanding scores high", () => {
    const r = computeConceptWeight(
      input({
        explanations: [explanation({ status: "correct", level: 5, clarity: "very_clear" })],
        recalls: [{ outcome: "remembered" }],
        sessionCount: 1,
        retained: true,
      }),
    );
    // One short, high-quality interaction should clearly beat the weak
    // "long lecture" case above, proving quality beats bulk.
    const lecture = computeConceptWeight(
      input({ explanations: [explanation({ status: "partial", level: 2, clarity: "unclear" })] }),
    );
    expect(r.weight).toBeGreaterThan(lecture.weight);
    expect(r.weight).toBeGreaterThan(0.5);
  });

  it("5. reinforcement saturates around the 3rd-4th revisit", () => {
    const withN = (n: number) =>
      computeConceptWeight(
        input({ explanations: Array.from({ length: n }, () => explanation()), sessionCount: n }),
      ).reinforcement;
    const r1 = withN(1);
    const r3 = withN(3);
    const r4 = withN(4);
    const r10 = withN(10);
    // Growth from 1->3 should be much bigger than growth from 4->10 — the
    // curve is already mostly flat by then.
    expect(r3 - r1).toBeGreaterThan(r10 - r4);
    expect(r10 - r4).toBeLessThan(0.15);
  });

  it("6. a cross-domain, deeply connected concept scores higher than an isolated one with identical depth/mastery", () => {
    const shared = { explanations: [explanation({ status: "correct", level: 4 })], sessionCount: 2, retained: false };
    const isolated = computeConceptWeight(input({ ...shared, neighborCount: 0, relationWeights: [] }));
    const connected = computeConceptWeight(
      input({
        ...shared,
        neighborCount: 5,
        relationWeights: [
          computeRelationWeight("explained", 1, true),
          computeRelationWeight("explained", 2, false),
          computeRelationWeight("llm_inferred", 1, false),
        ],
      }),
    );
    expect(connected.weight).toBeGreaterThan(isolated.weight);
    expect(connected.breadth).toBeGreaterThan(isolated.breadth);
    expect(connected.connectedness).toBeGreaterThan(isolated.connectedness);
  });

  it("7. many shallow concepts vs. fewer deeply developed ones: domain rollup favors depth", () => {
    const shallow = computeConceptWeight(input({ sessionCount: 1 })).weight; // a bare capture
    const deep = computeConceptWeight(
      input({
        explanations: [explanation({ status: "correct", level: 5, clarity: "very_clear" })],
        recalls: [{ outcome: "remembered" }],
        sessionCount: 3,
        retained: true,
      }),
    ).weight;

    const manyShallow = aggregateDomainWeight(Array.from({ length: 30 }, () => shallow));
    const fewDeep = aggregateDomainWeight([deep, deep]);
    expect(fewDeep).toBeGreaterThan(manyShallow);
  });

  it("8. content neutrality: identical evidence shapes score identically regardless of subject", () => {
    // `field`/subject name is never a parameter to any function in this
    // file — this test just makes that structural guarantee visible and
    // regression-proof by constructing two "concepts" from different
    // domains with identical evidence and checking they match exactly.
    const evidence: ConceptWeightInput = input({
      explanations: [explanation({ status: "correct", level: 4, clarity: "reasonable" })],
      recalls: [{ outcome: "partial" }],
      neighborCount: 2,
      relationWeights: [computeRelationWeight("explained", 1, false)],
      sessionCount: 2,
      retained: false,
    });
    // Same shape, two independent calls — nothing about "machine learning"
    // or "baking" ever enters computeConceptWeight, so results must match.
    const a = computeConceptWeight(evidence);
    const b = computeConceptWeight({ ...evidence });
    expect(a).toEqual(b);
  });
});

describe("computeConceptWeight — monotonicity and bounds", () => {
  it("never moves down: more/better evidence never decreases weight", () => {
    const base = computeConceptWeight(
      input({ explanations: [explanation({ status: "partial", level: 2 })], sessionCount: 1 }),
    );
    const more = computeConceptWeight(
      input({
        explanations: [explanation({ status: "partial", level: 2 }), explanation({ status: "correct", level: 4 })],
        sessionCount: 2,
      }),
    );
    expect(more.weight).toBeGreaterThanOrEqual(base.weight);
  });

  it("weight is always within [0, 1]", () => {
    const maxed = computeConceptWeight(
      input({
        explanations: Array.from({ length: 20 }, () => explanation({ status: "correct", level: 5, clarity: "very_clear" })),
        recalls: Array.from({ length: 20 }, () => ({ outcome: "remembered" as const })),
        neighborCount: 50,
        relationWeights: Array.from({ length: 50 }, () => computeRelationWeight("explained", 20, true)),
        sessionCount: 50,
        retained: true,
      }),
    );
    expect(maxed.weight).toBeLessThanOrEqual(1);
    expect(maxed.weight).toBeGreaterThan(0);
  });

  it("exceptional requires both a high weight and retained standing", () => {
    const highButNotRetained = computeConceptWeight(
      input({
        explanations: Array.from({ length: 10 }, () => explanation({ status: "correct", level: 5, clarity: "very_clear" })),
        recalls: Array.from({ length: 5 }, () => ({ outcome: "remembered" as const })),
        neighborCount: 10,
        relationWeights: Array.from({ length: 10 }, () => computeRelationWeight("explained", 5, true)),
        sessionCount: 10,
        retained: false,
      }),
    );
    expect(highButNotRetained.exceptional).toBe(false);
  });
});

describe("computeRelationWeight", () => {
  it("an explained connection outranks an inferred one", () => {
    expect(computeRelationWeight("explained", 1, false)).toBeGreaterThan(computeRelationWeight("llm_inferred", 1, false));
  });

  it("repeated re-assertion (strength) increases weight with diminishing returns", () => {
    // Compare equal-sized steps (not w2-w1 vs w10-w2, whose ranges differ in
    // width) so the per-unit rate of increase is what's actually tested.
    const w1 = computeRelationWeight("explained", 1, false);
    const w2 = computeRelationWeight("explained", 2, false);
    const w10 = computeRelationWeight("explained", 10, false);
    const w11 = computeRelationWeight("explained", 11, false);
    expect(w2).toBeGreaterThan(w1);
    expect(w10).toBeGreaterThan(w2);
    expect(w11 - w10).toBeLessThan(w2 - w1);
  });

  it("a cross-domain connection gets a bonus", () => {
    expect(computeRelationWeight("explained", 1, true)).toBeGreaterThan(computeRelationWeight("explained", 1, false));
  });
});

describe("aggregateDomainWeight", () => {
  it("is 0 for an empty domain", () => {
    expect(aggregateDomainWeight([])).toBe(0);
  });

  it("is bounded within [0, 1]", () => {
    expect(aggregateDomainWeight(Array.from({ length: 500 }, () => 1))).toBeLessThanOrEqual(1);
  });
});
