import type { CurriculumModule } from "../types";

export const mindscapeVisualization: CurriculumModule = {
  slug: "mindscape-visualization",
  track: "noesis",
  phase: "Phase 3 — Knowledge & Memory",
  title: "Mindscape Visualization",
  summary:
    "The Settling Ground grammar: a deterministic, canvas-drawn landscape where explaining grows living threads and retention settles them into permanent ground — no force simulation, no node-edge graph.",
  lesson: {
    overview:
      "Mindscape used to be a d3-force node/link graph. It is now a from-scratch generative system, Settling Ground (docs/mindscape/visual-grammar.md): concepts are never drawn as circles, and relations are never drawn as lines. Instead, lib/mindscape/engine.ts (buildMindscape) turns a knowledge state into thread segments that space-colonize outward from each concept, fuse into cords where the learner made a connection, and settle into a contoured heightfield once a concept is retained. lib/mindscape/draw.ts renders that model onto a canvas 2D context, and components/Mindscape.tsx wires it to the DOM (pan, zoom, hover, the growth reveal after explaining).",
    sections: [
      {
        heading: "From knowledge state to a model, deterministically",
        body:
          "lib/knowledge.ts derives a KnowledgeState (concepts with their explanation history, recalls, misconceptions, open questions; relations with a source of explained/llm_inferred/manual) from the raw tables in one pass — the same standing rule (Encountered/Familiar/Can Explain/Retained) used to be scattered across lib/queries.ts and now lives in one function, deriveStanding. buildMindscape(state, seed) is a pure function with no randomness: every concept's position comes from hashing its id together with a personal seed (mulberry32), so adding a concept never moves the others, and every organic detail — branch curl, hill shape, contour relief — comes from a seeded value-noise field sampled at that fixed position. Two calls with the same input produce byte-identical output; this is checked directly (see the engine's own determinism check, not a UI test).",
      },
      {
        heading: "Growth, fusion, and settling",
        body:
          "A concept only ever encountered gets a four-segment spore and nothing else. Each explanation releases a growth budget proportional to its depth (surface/solid/deep) and status (correct/partial/missing); free tips space-colonize outward with branching that decays by generation, while tips launched toward a related concept steer via chemotropism and, only when the relation's source is 'explained' (the learner said it in their own words), fuse into a thickened cord with a bloom mark — llm_inferred relations steer growth but never fuse, so the rarest and most rewarding mark on the map is unforgeable. Once a concept's derived standing reaches Retained (a remembered recall, or two correct explanations two weeks apart), its threads fade toward the paper over ~4 weeks while a Gaussian deposit — anisotropic per-hill via noise, so no two hills are circles — raises a heightfield beneath it; cords between retained concepts become ridges, and a cross-field cord becomes a saddle pass. The heightfield is contoured by marching squares and only ever added to.",
      },
      {
        heading: "Rendering: two canvases, not SVG",
        body:
          "components/Mindscape.tsx keeps a still base canvas (ground image + contours + all settled/unsettled threads, repainted only when the model, theme, or view changes) and a live overlay canvas animated on requestAnimationFrame for exactly two things: the breathing glow on tips touched in the last fortnight, and the reveal animation after an explanation, which grows only the newly-touched concepts' threads in front of the reader over ~2 seconds by filtering segments on their recorded growth order. The ground is painted once into an offscreen canvas at low resolution (the model's internal grid, ~140²) and scaled up with image smoothing, which is why it reads as soft terrain rather than a heatmap. Pan/zoom is a plain 2D affine transform (scale, tx, ty) computed in JS, clamped in lib/mindscape/draw.ts so the view can never scale or pan into obvious empty space — no library, because the model is authored in world units already.",
      },
    ],
    sourceFiles: [
      "lib/mindscape/engine.ts",
      "lib/mindscape/draw.ts",
      "components/Mindscape.tsx",
      "lib/knowledge.ts",
      "docs/mindscape/visual-grammar.md",
      "docs/mindscape/semantic-mapping.md",
    ],
  },
  levels: {
    explain: {
      prompt:
        "Explain, in your own words, what determines whether an explanation's growth becomes a longer thread versus a thicker one, and what has to be true for two concepts' threads to fuse into a cord.",
      groundTruth:
        "The first explanation of a concept spends its budget on extension — new tips space-colonizing outward, more of them and living longer the deeper the explanation. Every later explanation of the same concept thickens the existing segments first (up to a cap) before spending any leftover budget on new growth, which is how depth outgrows breadth without a separate 'revisit' channel. Two concepts' threads fuse into a cord only when a tip was launched toward a relation whose source is 'explained' — meaning the learner stated the connection in their own words during an explain-back. A relation the model merely inferred (llm_inferred) still steers a tip's direction via chemotropism, so it shapes the grain of a region, but the tip is never marked to fuse and no bloom appears.",
    },
    trace: {
      prompt:
        "Trace what happens from submitting an explanation to seeing the Mindscape change on the session page, including how the grown concepts are singled out.",
      groundTruth:
        "submitExplainBackAction saves the raw text, then analyzeAndRecord (lib/actions/explainBack.ts) calls the model, writes a conceptUnderstandings row, finds-or-creates each addressed concept (with its field), and records connectionsMade as 'explained' relations and relatedKnown as 'llm_inferred' ones, each tagged in explain_back_relations as new/strengthened. The session page then calls getReflection (lib/queries.ts) to get the before/after standing per concept and the relations this explain-back touched, and getMindscapeData() to load the whole knowledge state. Both are handed to the same <Mindscape> component, with highlightIds/focusIds set to the touched concepts' ids and reveal set — which makes buildMindscape() produce the full model as always (positions never depend on what's highlighted), but the client component's overlay canvas animates only those concepts' segments growing in, filtered by each segment's recorded growth order.",
    },
    modify: {
      prompt:
        "Suppose you wanted the Applied state (building something from a concept, mentioned as unbuilt in visual-grammar.md) to get its own mark on the land once it exists in the data model. Describe what you'd change.",
      groundTruth:
        "You'd add the signal to KnowledgeConcept in lib/knowledge.ts (e.g. an `applied: boolean` derived from a new table or field) and thread it into MapConcept in lib/mindscape/engine.ts. The grammar reserves 'a structure on the land' for exactly this case, so the natural implementation is a small deterministic mark drawn in the ground pass of buildMindscape — positioned at the concept's settled (x, y), seeded off the same per-concept rng so it's stable, drawn only when settle is at or near 1 (a structure needs ground to stand on). It should get its own field on PlacedConcept (e.g. `applied: boolean`) so draw.ts can render it as a distinct primitive rather than overloading an existing channel — the semantic-mapping doc's channel-budget table would need a new row, and the 'one channel per property' rule means nothing else may reuse that mark.",
    },
    design: {
      prompt:
        "Propose one concrete improvement to the Mindscape's visualization or performance, and justify the tradeoff.",
      groundTruth:
        "Open-ended — evaluate for tradeoff-awareness against the grammar's own constraints (docs/mindscape/visual-grammar.md): the free-growth budget already scales down with concept count (the `budget` factor in buildMindscape) to keep large maps legible and fast, so a good answer engages with that rather than proposing an unrelated feature. Reasonable directions: semantic positioning from real embeddings instead of hash-based placement within a field (the doc flags this as unresolved), level-of-detail culling of fine branch segments when zoomed out rather than relying only on budget scaling, or a persisted 'reveal watermark' so a user who never opens a session's reflect view still eventually sees that growth on the main map without an explicit trigger.",
    },
  },
};
