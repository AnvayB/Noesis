import type { CurriculumModule } from "../types";

export const knowledgeModelConceptGraph: CurriculumModule = {
  slug: "knowledge-model-concept-graph",
  track: "noesis",
  phase: "Phase 3 — Knowledge & Memory",
  title: "Knowledge Model & Concept Graph",
  summary:
    "How individual explain-backs accumulate into a graph of concepts and weighted relationships, and why understanding is derived rather than stored.",
  lesson: {
    diagramId: "concept-graph-excerpt",
    overview:
      "Every other feature so far (sessions, explain-back) produces one-off records. This module is about how those records accumulate into something bigger: a graph where nodes are Concepts and edges are ConceptRelations, built up incrementally from repeated LLM analyses rather than authored by hand.",
    sections: [
      {
        heading: "Nodes: Concept, derived not cached",
        body:
          "A Concept row (lib/db/schema.ts) stores identity (name, slug) and timestamps (firstEncounteredAt, lastEncounteredAt, lastReviewedAt) plus a cached layoutX/layoutY for the visualization — but notably no confidence score. Instead, deriveConceptStatusLabel in lib/queries.ts computes a status label ('Encountered' → 'Familiar' → 'Can Explain' → 'Retained') on every read, from the concept's explainBackConcepts statuses and recallAttempts outcomes. If the underlying evidence changes, the derived label changes automatically on the next read — there's no cached field that could go stale.",
      },
      {
        heading: "Edges: ConceptRelations and co-occurrence strength",
        body:
          "A conceptRelations row links two concepts with a relationType ('related', 'prerequisite', 'part_of'), a source ('llm_inferred' or 'manual'), and a strength integer. Strength isn't set once — lib/actions/explainBack.ts checks both directions of an existing pair (A→B or B→A; 'related' edges are treated as conceptually undirected) and increments strength on the existing row if found, or inserts strength: 1 if not. So an edge that gets re-asserted across several different explain-backs grows visibly stronger over time — Mindscape uses this directly to draw thicker lines for edges the model has independently reinforced multiple times.",
      },
      {
        heading: "The theory: incremental graph construction and denormalization risk",
        body:
          "This is a small instance of a common pattern in systems that extract structure from unstructured input (the same shape shows up in citation graphs, recommendation systems, or any pipeline turning documents into a knowledge graph): each new piece of unstructured input (a paragraph of free text) is run through an extractor (the LLM), and the extracted entities/relations are merged into a persistent graph rather than replacing it. The hard part is almost never the extraction — it's the merge step: deciding whether 'Query and Key vectors' from explain-back #7 is the same node as 'Query, Key, and Value vectors' from explain-back #12. Get that wrong and the graph fragments into near-duplicate nodes that all represent the same idea. Noesis's answer is deliberately conservative: findOrCreateConcept normalizes by a slugified name, and the canonical-name map in explainBack.ts refuses to create a new node for any connection the model proposes that doesn't already match a name from this call's concepts_addressed or the session's prior known concepts.",
      },
    ],
    sourceFiles: [
      "lib/db/schema.ts",
      "lib/concepts.ts",
      "lib/actions/explainBack.ts",
      "lib/queries.ts",
    ],
  },
  levels: {
    explain: {
      prompt:
        "Explain, in your own words, how a Concept's understanding status gets computed, and how a ConceptRelation's strength grows over time.",
      groundTruth:
        "Status is never stored — deriveConceptStatusLabel(statuses, recallOutcomes) in lib/queries.ts computes it fresh from every explainBackConcepts status and recallAttempts outcome tied to that concept ('Retained' if any recall outcome is 'remembered'; otherwise the best explain-back status seen, 'correct'→'Can Explain', 'partial'→'Familiar', else 'Encountered'). Relation strength starts at 1 when a pair of concepts is first connected by the LLM's connectionsMade output, and is incremented (not replaced) each time the same pair — checked in either direction — is asserted again by a later explain-back, via an update in lib/actions/explainBack.ts.",
    },
    trace: {
      prompt:
        "Trace what happens, from an explain-back analysis coming back from the LLM to a new or strengthened edge appearing in conceptRelations.",
      groundTruth:
        "After ai.analyzeExplainBack() returns, lib/actions/explainBack.ts builds a canonicalNameByLower map from the analysis's own conceptsAddressed plus the prior known concept names passed into the call. For each entry in analysis.connectionsMade, it looks up both 'from' and 'to' against that map (case-insensitive, trimmed) — if either fails to resolve, the connection is silently dropped. For a resolved pair, it calls findOrCreateConcept on both names (lib/concepts.ts, which slugifies and either finds an existing row or inserts a new one), skips if they resolved to the same concept, then queries conceptRelations for an existing row in either direction; if found it increments strength, otherwise it inserts a new row with strength: 1, relationType: 'related', source: 'llm_inferred'.",
    },
    modify: {
      prompt:
        "Suppose you wanted to support the 'prerequisite' relationType being set automatically (not just 'related'), based on the LLM's judgment that concept A must be understood before concept B. Describe what you'd change.",
      groundTruth:
        "Today ExplainBackAnalysis.connectionsMade only carries { from, to, description } — no direction/type signal — and lib/actions/explainBack.ts always hardcodes relationType: 'related' on insert. You'd need to: (1) extend the connectionsMade item shape in both lib/ai/types.ts and the matching zod schema in lib/ai/schemas.ts to include a relationType or isPrerequisite field, (2) update the system prompt in lib/ai/providers/openai.ts's analyzeExplainBack to ask the model to judge directionality, and (3) change the insert (and the strength-increment lookup, which currently treats the relation as undirected) in lib/actions/explainBack.ts to respect direction for prerequisite edges specifically, since 'A is a prerequisite of B' is not symmetric the way 'related' is.",
    },
    design: {
      prompt:
        "Propose one concrete improvement to how the concept graph is built or merged, and justify the tradeoff.",
      groundTruth:
        "Open-ended — evaluate for tradeoff-awareness. Reasonable directions: embedding-based fuzzy matching for near-duplicate concept names instead of exact-slug matching (buys robustness, costs an extra model call and a similarity-threshold tuning problem), a manual merge/rename UI for concepts the LLM fragmented despite the guard, or surfacing relation 'source' (llm_inferred vs manual) visually in Mindscape so inferred structure is distinguishable from anything hand-corrected.",
    },
  },
};
