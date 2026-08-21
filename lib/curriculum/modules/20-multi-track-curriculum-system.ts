import type { CurriculumModule } from "../types";

export const multiTrackCurriculumSystem: CurriculumModule = {
  slug: "multi-track-curriculum-system",
  track: "noesis",
  phase: "Phase 8 — Multi-Track Curriculum",
  title: "Multi-Track Curriculum: How Arteris 101 Reuses Learn Noesis's Grading Engine",
  summary:
    "Learn Noesis was originally hardcoded to one track — its own architecture. Adding Arteris 101 (an external product-knowledge curriculum) required generalizing the module type and grading prompt to be track-aware, while reusing everything else unchanged.",
  lesson: {
    diagramId: "multi-track-hub",
    overview:
      "Arteris 101 (/arteris-101) is a second curriculum track, teaching external domain knowledge (semiconductor/SoC/interconnect fundamentals, then Arteris's product lineup) rather than Noesis's own codebase. Before this change, the entire curriculum system assumed there was only ever one track pointed at one thing: this app's own architecture — that assumption was baked into the module type, the redirect paths, and even the AI grading system prompt itself.",
    sections: [
      {
        heading: "Adding a track field instead of a second system",
        body:
          "The tempting-but-wrong move would have been to build a parallel curriculum system for Arteris content — a second types file, a second queries module, a second set of actions. Instead, CurriculumModule (lib/curriculum/types.ts) gained a single track: \"noesis\" | \"arteris\" field, plus a small CURRICULUM_TRACKS registry mapping each track to a nav label and a URL base path. Every existing query and action that used to assume /learn-noesis now looks up the module's own track to decide where to redirect or what to filter by — the same soft-gating, attempt-history, and grading machinery serves both tracks unmodified. The UI itself also stayed one implementation: the bodies of the old app/learn-noesis/page.tsx and app/learn-noesis/[moduleSlug]/page.tsx were extracted into components/CurriculumTrackIndex.tsx and components/CurriculumModuleView.tsx, parameterized by track — both app/learn-noesis/* and the new app/arteris-101/* are now thin wrappers passing a different track prop into the same components.",
      },
      {
        heading: "Why the level set had to become partial, not just the track",
        body:
          "The deeper problem wasn't routing — it was that Learn Noesis's explain/trace/modify/design levels are meaningful specifically because there's a real implementation to trace through and modify. Arteris 101 teaches conceptual product knowledge with no underlying code to inspect, so 'trace what happens in the code' or 'what would you modify' don't map to anything real for that content. Rather than forcing all four levels onto content they don't fit, CurriculumModule.levels became a partial map (Partial<Record<explain/trace/modify/design, CurriculumLevelContent>>) — Learn Noesis modules still supply all four, Arteris modules supply only explain. lib/curriculum/queries.ts gained an availableLevels(module) helper that both furthestLevelReached and nextIncompleteLevel now use instead of the old hardcoded curriculumLevelValues list, so the soft-gating logic (and the level tabs UI) naturally shows only the levels a given module actually offers.",
      },
      {
        heading: "The grading prompt had to stop assuming Noesis",
        body:
          "lib/ai/providers/openai.ts's analyzeArchitectureResponse system prompt used to say outright: 'You evaluate a learner's response about the architecture of Noesis, the very app they're building.' That sentence is simply false when grading an Arteris 101 explain response. The fix generalizes the prompt to build its specificity from the module's own moduleTitle and lessonSummary (both already passed into every call) instead of a fixed Noesis-flavored sentence — a strict generalization, since Learn Noesis's existing modules still supply plenty of specific title/summary context to ground the grading, they just no longer rely on a hardcoded assumption baked into the prompt itself.",
      },
    ],
    sourceFiles: [
      "lib/curriculum/types.ts",
      "lib/curriculum/queries.ts",
      "lib/actions/curriculum.ts",
      "lib/ai/providers/openai.ts",
      "components/CurriculumTrackIndex.tsx",
      "components/CurriculumModuleView.tsx",
    ],
  },
  levels: {
    explain: {
      prompt:
        "Explain, in your own words, why the curriculum system was generalized with a 'track' field and a partial levels map instead of building a second, separate system for Arteris 101.",
      groundTruth:
        "Learn Noesis's soft-gating, attempt-history, grading action, and UI were already domain-agnostic in everything except two places: the hardcoded /learn-noesis redirect paths and the assumption that every module offers all four gradeable levels. Adding a track field (with a CURRICULUM_TRACKS registry for label/basePath) fixed the routing assumption without touching any of the actually-reusable logic. Making CurriculumModule.levels a partial map fixed the deeper assumption — Arteris 101's conceptual product content has no real implementation to trace/modify, so those levels don't apply, and forcing all four onto every track would mean either faking meaningless trace/modify/design content or leaving the type dishonest about what a module actually offers. Building a second parallel system would have duplicated the entire soft-gating/attempt-history/grading machinery for no benefit, since none of that logic actually depended on being Noesis-specific.",
    },
    trace: {
      prompt:
        "Trace what happens differently now when a learner submits an 'explain' response on an Arteris 101 module compared to a Learn Noesis module, from form submission through to the redirect.",
      groundTruth:
        "Both go through the same submitCurriculumResponseAction (lib/actions/curriculum.ts). It looks up the module via getCurriculumModule(moduleSlug) — for an Arteris 101 module, curriculumModule.track is \"arteris\". The action validates the submitted level against curriculumModule.levels directly (levelRaw in curriculumModule.levels) rather than a fixed global list, so an Arteris module would reject a \"trace\" submission since it only defines \"explain\". It then calls ai.analyzeArchitectureResponse with the module's own title/summary/groundTruth — resolving to OpenAIProvider.analyzeArchitectureResponse, whose system prompt now builds its specificity from those passed-in fields instead of a hardcoded Noesis sentence, so the grading framing is correct either way. After inserting the curriculumAttempts row (identical for both tracks — moduleSlug is just a string, not tied to a track at the DB level), the action looks up CURRICULUM_TRACKS[curriculumModule.track].basePath and redirects to `${basePath}/${moduleSlug}?level=${level}` — \"/arteris-101/...\" for an Arteris module, \"/learn-noesis/...\" for a Noesis module, using the exact same code path.",
    },
    modify: {
      prompt:
        "Suppose you wanted to add a third curriculum track — say, a 'System Design Patterns' track that also only needs understand+explain, like Arteris 101. What would actually need to change?",
      groundTruth:
        "Mechanically small: add a new key to CurriculumTrack (lib/curriculum/types.ts) and a matching entry in CURRICULUM_TRACKS with its label and basePath; add a NAV_ITEMS entry in components/NavHeader.tsx; author module files tagged track: \"the-new-track\" with only an explain level, same as Arteris 101's modules; and add two thin wrapper pages (an index and a [moduleSlug] page) that pass the new track into CurriculumTrackIndex/CurriculumModuleView, mirroring app/arteris-101/*. Nothing in lib/curriculum/queries.ts, lib/actions/curriculum.ts, or the shared UI components would need to change at all — that's the actual test of whether the track generalization was done right: a third track should be pure addition, not another round of touching already-generalized code.",
    },
    design: {
      prompt:
        "Propose one concrete improvement to the multi-track curriculum system, and justify the tradeoff.",
      groundTruth:
        "Open-ended — evaluate for tradeoff-awareness. Reasonable directions: a lint/test step that asserts every module's track is a valid CURRICULUM_TRACKS key and that Arteris-track modules never define trace/modify/design (catching an accidental full-level module on a track meant to stay understanding-only); a lightweight per-track 'about this track' description field on CURRICULUM_TRACKS instead of hardcoding description strings separately in each wrapper page component; or, if a future track ever does need trace/modify/design-shaped grading but for external content, generalizing ARCHITECTURE_LEVEL_RUBRIC's wording (currently still code/file-flavored for trace/modify) at that point rather than preemptively now, since YAGNI applied correctly here — no track needs that yet.",
    },
  },
};
