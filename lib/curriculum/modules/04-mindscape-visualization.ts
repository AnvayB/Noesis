import type { CurriculumModule } from "../types";

export const mindscapeVisualization: CurriculumModule = {
  slug: "mindscape-visualization",
  track: "noesis",
  phase: "Phase 3 — Knowledge & Memory",
  title: "Mindscape Visualization",
  summary:
    "How the concept graph becomes a force-directed SVG 'landscape' that stays visually stable across visits, and the physics behind it.",
  lesson: {
    overview:
      "Mindscape (components/Mindscape.tsx) turns the concepts/conceptRelations tables into an SVG force-directed graph: node size and color encode understanding depth, opacity encodes recency, edge thickness encodes relation strength. It's the one place in the app where a fairly deep piece of applied physics (force simulation) is doing real product work — communicating the shape of what you know at a glance.",
    sections: [
      {
        heading: "From query rows to a settled layout",
        body:
          "app/mindscape/page.tsx calls listMindscapeConcepts() and listMindscapeRelations() (lib/queries.ts) — the same status-derivation logic from the Knowledge Model module, reused here rather than duplicated. Mindscape.tsx turns those into d3-force node/link objects inside a useMemo, seeds any concept without a saved layoutX/layoutY at a pseudo-random position near center, then runs forceSimulation(...).stop() followed by simulation.tick(200) — advancing the physics synchronously to a settled state in one shot, rather than animating tick-by-tick in the browser. That's a deliberate choice: a live, jittering simulation reads as 'busy'; a graph that's already settled when it appears reads as a calm, stable landscape.",
      },
      {
        heading: "Encoding understanding visually",
        body:
          "radiusFor and nodeClassName map a concept's derived statusLabel to size and fill/stroke color (bigger and more saturated the deeper the understanding — 'Retained' concepts get both the largest radius and a distinctly thicker stroke). opacityFor maps days-since-last-review to fade: Math.max(0.35, 1 - days / 60), so untouched knowledge visibly fades but never disappears. Edge stroke width is Math.min(1 + strength * 0.6, 4) — capped, so one extremely reinforced relation doesn't visually dominate the whole graph. None of this is computed by an LLM; it's pure deterministic mapping from the derived status/recency data covered in the previous module.",
      },
      {
        heading: "The theory: force-directed layout, and SSR determinism",
        body:
          "d3-force is a general-purpose physics simulator, not graph-specific: forceManyBody applies a charge (here, negative — repulsion, so nodes spread apart), forceLink acts like springs pulling connected nodes together at a target distance, forceCenter pulls everything toward a center point so the whole thing doesn't drift off-screen, and forceCollide prevents circles from overlapping. Running these forces together and letting them settle is exactly how most 'network graph' visualizations you've seen elsewhere are built (this is the same technique behind tools like Obsidian's graph view). \n\n" +
          "Separately, there's a subtler general lesson in pseudoRandom() and the rounding in opacityFor: Next.js renders once on the server and again on the client during hydration, and if any value used in JSX differs between those two passes (e.g. real Math.random(), or an un-rounded Date.now()-based float), React throws a hydration mismatch. The fixes here — a deterministic hash-based pseudo-random seeded by concept id, and rounding opacity to two decimal places — are a general pattern for keeping any 'looks random but must render identically twice' value SSR-safe.",
      },
    ],
    sourceFiles: [
      "components/Mindscape.tsx",
      "app/mindscape/page.tsx",
      "lib/queries.ts",
      "lib/actions/mindscape.ts",
    ],
  },
  levels: {
    explain: {
      prompt:
        "Explain, in your own words, what visual properties encode what data in Mindscape, and why the simulation is advanced synchronously instead of animated live.",
      groundTruth:
        "Node radius and fill/stroke color encode the derived understanding status label (bigger/more saturated = deeper, e.g. 'Retained' is largest with a thick stroke); node opacity encodes recency (fades toward 0.35 as days since last review/encounter grows, via opacityFor); edge stroke width encodes conceptRelations.strength, capped at 4. The simulation calls .stop() then .tick(200) synchronously rather than letting the browser animate it frame-by-frame, so the graph appears already settled — a calm 'landscape' feel rather than a bouncy live physics demo.",
    },
    trace: {
      prompt:
        "Trace what happens from visiting /mindscape to seeing settled node positions on screen, including how those positions get remembered for next time.",
      groundTruth:
        "app/mindscape/page.tsx (a Server Component) calls listMindscapeConcepts() and listMindscapeRelations() from lib/queries.ts, passing the results as props into the client component <Mindscape>. Inside Mindscape.tsx, a useMemo builds Node/Link objects (seeding x/y from saved layoutX/layoutY if present, otherwise a pseudo-random scatter), runs forceSimulation(...).tick(200), and returns the settled {nodes, links}. A separate useEffect fires after that memo changes, calling saveConceptLayoutAction (lib/actions/mindscape.ts) with each node's final x/y — a best-effort write (errors are swallowed) that persists layoutX/layoutY back onto the concepts table, so next visit starts from the same settled positions instead of re-scattering.",
    },
    modify: {
      prompt:
        "Suppose you wanted 'prerequisite' edges (once they exist — see the Knowledge Model module's Modify prompt) to visually pull the prerequisite concept above the dependent one, rather than just being an undirected line. Describe what you'd change.",
      groundTruth:
        "You'd need a directional force, which plain forceLink doesn't provide (it treats links as undirected springs). The straightforward approach is adding a custom force function (d3-force supports arbitrary custom forces, not just the four built-in ones) that, for links where relationType === 'prerequisite', nudges the 'to' node's y velocity upward and the 'from' node's y velocity downward each tick — layered alongside the existing charge/link/center/collide forces in the .force(...) chain in Mindscape.tsx. You'd also want relationType threaded through from listMindscapeRelations() into the LinkDatum type, since it currently only carries fromConceptId/toConceptId/strength.",
    },
    design: {
      prompt:
        "Propose one concrete improvement to Mindscape's visualization or performance, and justify the tradeoff.",
      groundTruth:
        "Open-ended — evaluate for tradeoff-awareness. Reasonable directions: clustering/zooming for large graphs (the current WIDTH=800 fixed viewBox and O(n²) forceManyBody don't scale indefinitely), incremental re-layout that only re-settles newly added nodes instead of the whole graph on every visit, or exposing relation 'source' (llm_inferred vs manual) as a visual distinction.",
    },
  },
};
