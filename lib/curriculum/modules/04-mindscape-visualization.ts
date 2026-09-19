import type { CurriculumModule } from "../types";

export const mindscapeVisualization: CurriculumModule = {
  slug: "mindscape-visualization",
  track: "noesis",
  phase: "Phase 3 — Knowledge & Memory",
  title: "Mindscape Visualization",
  summary:
    "Three climates — Microcosm, Grove, Nebula — rendering the same knowledge state from one shared, deterministic layout, and the history of two earlier designs it replaced.",
  lesson: {
    overview:
      "Mindscape has been three different things. It started as a d3-force node/link graph. That was replaced with Settling Ground, a single from-scratch generative grammar where explaining grew living threads that settled into permanent land — no circles, no lines, one climate. Settling Ground was itself then replaced, not extended: its ~440 lines of thread-growth and heightfield code were deleted outright, and the Mindscape became three distinct renderings of the same data — Microcosm (a microscopic ecosystem, lib/mindscape/ground.ts), Grove (a line of trees, lib/mindscape/grove.ts), and Nebula (a night sky, lib/mindscape/sky.ts) — switchable at will, all three built on one shared layout engine.",
    sections: [
      {
        heading: "One shared layout, three renderers",
        body:
          "placeMindscape() in lib/mindscape/engine.ts is the one function all three climates call. It hashes each concept's id together with a personal seed to get a stable (x, y) — the same identity-is-hashed rule Settling Ground used — and every organic variation (a branch's curl, a cell's rotation, a star's dust) comes from seeded noise sampled at that fixed position, never from Math.random(). Each climate then does its own thing with those positions: ground.ts turns a field into a colony and a concept into a cell; grove.ts ignores placeMindscape's scattered field positions for trunk placement (it lays trees out along its own horizontal ground line instead) but still reuses the per-concept rng it returns; sky.ts uses the positions directly as star coordinates. Switching climates in the UI never reshuffles anything within a climate — a person's map is recognizably theirs every time they open it.",
      },
      {
        heading: "Semantic marks vs. ambient decoration",
        body:
          "Every climate's model separates two kinds of thing. Semantic marks — a cell, a branch, a star — come from a real concept, carry its id, and are listed in the model's points array, which is what makes them hoverable, clickable, and included in view-fitting. Ambient decoration — background dust, drifting pollen, distant galaxies, orbital arcs, the soft membranes and haze behind everything — is generated once per seed from its own rng stream, never carries an id, is never in points, and is never clickable. This split exists because an early density pass added a lot of atmosphere and it would have been easy to let some of it quietly become semantic (a 'nice-looking' extra star that's actually clickable, say) — the rule is enforced structurally: nothing without an id can ever be reached by pointer hit-testing, because Mindscape.tsx's nearest() function only ever iterates points.",
      },
      {
        heading: "The theory: fitting a viewport to weighted content, not geometric bounds",
        body:
          "fitView() and clampView() in lib/mindscape/draw.ts solve two different problems that are easy to conflate. The first is 'where should the camera start': fitView computes a density-weighted centroid and spread over the real concept points (not the full drawn geometry, which ambient decoration can drag arbitrarily wide) — a field with many concepts naturally has many points close together and pulls the frame toward it, while one lone sapling or star barely moves the average, so the default view gravitates to whichever part of the map is actually developed. The second is 'what's allowed once the user is panning or zooming': clampView implements proper cover semantics, the same idea CSS's background-size: cover or object-fit: cover names — the world's scale is never allowed to drop below max(viewportWidth / worldWidth, viewportHeight / worldHeight), and pan is clamped so the world's rendered edge can never enter the visible frame. The two are independent: a focused view (fitting to a session's just-explained concepts) skips the weighting entirely and fits tightly to exactly those points, but clampView's cover rule still applies to it. Get the distinction wrong — say, clamp pan without also flooring the scale — and zooming out far enough reveals a seam where the drawn world ends and blank canvas begins, which is exactly the bug this fixed.",
      },
    ],
    sourceFiles: [
      "lib/mindscape/engine.ts",
      "lib/mindscape/ground.ts",
      "lib/mindscape/grove.ts",
      "lib/mindscape/sky.ts",
      "lib/mindscape/draw.ts",
      "components/Mindscape.tsx",
      "lib/knowledge.ts",
    ],
  },
  levels: {
    explain: {
      prompt:
        "Explain, in your own words, what all three Mindscape climates share, and how the app enforces that ambient decoration can never be clicked or accidentally treated as a real concept.",
      groundTruth:
        "All three call placeMindscape() (lib/mindscape/engine.ts) for deterministic, hash-seeded positions and per-concept noise, so the same knowledge state always produces the same picture in a given climate. The semantic/ambient split is enforced structurally, not by convention: each climate's model exposes a points array of only the marks that come from a real concept (with an id), and Mindscape.tsx's pointer handling (nearest(), used for both hover and click) only ever searches points — ambient dust, pollen, haze, and arcs are generated separately, carry no id, and are simply never in that array, so there's no code path that could make one of them clickable by accident.",
    },
    trace: {
      prompt:
        "Trace what happens from submitting an explanation to seeing the change reflected correctly no matter which climate the viewer currently has selected.",
      groundTruth:
        "submitExplainBackAction (lib/actions/explainBack.ts) records the explanation, finds-or-creates the addressed concepts with their field, and writes relations tagged explained or llm_inferred. The session page then loads the whole knowledge state via getMindscapeData() (lib/queries.ts, backed by lib/knowledge.ts) and passes the same concepts/relations plus the touched concepts' ids into <Mindscape climate=... highlightIds=... reveal>. Because climate is just a prop, buildGroundEcosystem/buildGrove/buildSky (whichever is active) all derive their model from that same data independently — there's no shared cache to invalidate and no climate-specific write path, so the change is correct in whichever climate the viewer has open, including ones they haven't looked at yet. The generic reveal in Mindscape.tsx then fades the highlighted marks in on the overlay canvas, using drawGenericGlow, which works identically for all three since it only needs points and ids.",
    },
    modify: {
      prompt:
        "Suppose you wanted to add a fourth climate. Describe what you'd build and what you'd get for free.",
      groundTruth:
        "You'd add a new lib/mindscape/<name>.ts exporting a build<Name>(input) that calls placeMindscape() for positions and returns a model implementing the shared Viewable shape (width, height, bounds, points), plus whatever semantic and ambient arrays the new metaphor needs; a matching draw<Name>() in lib/mindscape/draw.ts; a new entry in the CLIMATES array and a climate === branches in components/Mindscape.tsx's model-selection and draw effects. Because fitView, clampView, drawGenericGlow, pan, zoom, and hover all operate on the generic Viewable/points interface rather than any one climate's internals, none of that needs to change — the new climate gets density-weighted default framing, cover-clamped pan/zoom, hover naming, and click-to-open for free the moment it returns a valid points array.",
    },
    design: {
      prompt:
        "Propose one concrete improvement to the Mindscape system as it stands today, and justify the tradeoff.",
      groundTruth:
        "Open-ended — evaluate for engagement with the current architecture rather than a generic answer. Reasonable directions: GroveModel still carries a fields array (passed straight through from placeMindscape) that drawGrove never actually reads — it draws each tree's label at the trunk's own position instead, since Grove abandoned placeMindscape's field-scatter layout for a horizontal ground line — dead weight worth trimming or repurposing. Semantic positioning from real embeddings instead of hash-based placement (flagged as unresolved since the original Settling Ground design docs and still true today). Level-of-detail culling for very large maps: the ambient dust/haze counts scale with world area, which itself grows with concept count, so it's worth checking whether that holds up well past the 140-concept/10-field synthetic test this session verified (all three climates stayed under 150ms there, but that's not 'hundreds'). A persisted 'seen this growth' watermark so a user who never opens a session's reflect view still eventually sees new marks on the main map without an explicit reveal trigger.",
    },
  },
};
