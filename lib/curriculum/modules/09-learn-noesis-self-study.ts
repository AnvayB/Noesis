import type { CurriculumModule } from "../types";

export const learnNoesisSelfStudy: CurriculumModule = {
  slug: "learn-noesis-self-study",
  track: "noesis",
  phase: "Phase 6 — Self-Study System",
  title: "Learn Noesis Itself: Curriculum, Grading & Self-Documentation",
  summary:
    "How the module you're reading right now works — content-as-code, four graded levels, and why this system is deliberately decoupled from the Concept/Mindscape graph it superficially resembles.",
  lesson: {
    overview:
      "This is the reflexive module: lib/curriculum/ is the system currently presenting this exact lesson to you. It reuses the same explain-and-grade shape as explain-back (free response in, LLM-graded structured feedback out) but points it at the app's own source code instead of external material you bring — and it's deliberately kept out of the Concept/Mindscape graph, on purpose, not by oversight.",
    sections: [
      {
        heading: "Content as code, attempts as data",
        body:
          "A CurriculumModule (this one included) is a plain TypeScript object in lib/curriculum/modules/*.ts — not a database row. The comment at the top of lib/curriculum/types.ts states the reason directly: modules document the real implementation, so they should be editable in the same PR/commit as the architecture change they describe, which a DB-authored module never could be. Only curriculumAttempts is persisted (lib/db/schema.ts), and moduleSlug there is a plain string, not a foreign key — there is no curriculum_modules table to reference, deliberately, so that adding, reordering, or rewriting a module is a code change with no migration. The tradeoff named nowhere but worth stating: renaming or deleting a slug silently orphans whatever attempt history was recorded against the old name, since nothing enforces that link at the database level.",
      },
      {
        heading: "Four levels, one soft gate",
        body:
          "understand needs no AI call — it's a single 'mark as read' button (markUnderstandCompleteAction) that just inserts a curriculumAttempts row with level: \"understand\" and no verdict. explain/trace/modify/design are each graded by ai.analyzeArchitectureResponse against a hand-authored groundTruth string, using a level-specific rubric (ARCHITECTURE_LEVEL_RUBRIC in providers/openai.ts — e.g. trace is graded on correctly sequencing the actual files/functions touched, modify on identifying a plausible mechanism, not necessarily the one true approach). Retries are unlimited by design: curriculumAttempts is a full attempt history, not one row per (module, level), and nextIncompleteLevel (lib/curriculum/queries.ts) derives 'where to land when reopening a module' from the furthest level with ANY attempt at all — not requiring a 'solid' verdict. That's a soft gate on purpose, consistent with the rest of the app's explicit no-scores philosophy: attempting a level is enough to have reached it.",
      },
      {
        heading: "The theory: same UI pattern, deliberately separate data model",
        body:
          "A comment in lib/curriculum/queries.ts says it outright: curriculum is 'intentionally decoupled from the concepts/Mindscape domain..., not joined against it.' It would be easy to notice 'this is graded free-response feedback, just like explain-back' and reach for the same Concept/ConceptRelation tables — but concepts you learn about the world (Mixture of Experts, attention) and modules you complete about this app's own architecture are two different kinds of knowledge with two different lifecycles: your understanding of attention doesn't change when this codebase changes, but a curriculum module absolutely should be rewritten (as this one just was) the moment the code it documents changes. The general skill this teaches: sharing a UI pattern and a grading mechanism with an existing feature is not, by itself, a reason to share its data model — the right question is always whether the underlying entities have the same lifecycle and meaning, not just whether the interaction shape looks similar.",
      },
    ],
    sourceFiles: [
      "lib/curriculum/types.ts",
      "lib/curriculum/index.ts",
      "lib/curriculum/queries.ts",
      "lib/actions/curriculum.ts",
      "lib/db/schema.ts",
    ],
  },
  levels: {
    explain: {
      prompt:
        "Explain, in your own words, why curriculum modules are authored as code rather than database rows, and why the curriculum system is kept decoupled from the Concept/Mindscape graph despite using a very similar grading pattern.",
      groundTruth:
        "Modules are code because they document the real implementation and need to be editable in the same commit/PR as the architecture change they describe — a DB-authored module can't be reviewed alongside the code diff it's about. curriculumAttempts.moduleSlug is a plain string with no foreign key to enforce, on purpose, so adding/renaming/reordering modules never needs a migration (at the cost of silently orphaning history if a slug is renamed/deleted). Curriculum stays out of the Concept/Mindscape domain because concepts-about-the-world and modules-about-this-app's-own-code are different kinds of knowledge with different lifecycles — the shared grading UI pattern isn't a reason to share the underlying data model.",
    },
    trace: {
      prompt:
        "Trace what happens from clicking 'Mark as read' on the understand level of a module, through to landing on the explain level — and separately, what happens when you submit a response for a gradeable level.",
      groundTruth:
        "markUnderstandCompleteAction (lib/actions/curriculum.ts) reads moduleSlug from the form, inserts a curriculumAttempts row with level: \"understand\" and no verdict, and redirects to /learn-noesis/[moduleSlug]?level=explain. For a gradeable level, submitCurriculumResponseAction validates the level is one of the GRADEABLE_LEVELS, looks up the module's levelContent for its groundTruth, calls ai.analyzeArchitectureResponse({ moduleTitle, level, lessonSummary, groundTruth, userResponse }) — which resolves to OpenAIProvider.analyzeArchitectureResponse, using ARCHITECTURE_LEVEL_RUBRIC[level] as extra grading instruction — inserts a curriculumAttempts row with the returned verdict/whatYouGotRight/misconceptions/gaps/followUpQuestion, and redirects back to the same module at the same level so the new attempt renders in the history list.",
    },
    modify: {
      prompt:
        "Suppose furthestLevelReached (lib/curriculum/queries.ts) were changed to require a 'solid' verdict, not just any attempt, before counting a level as reached. What would that change about the app's behavior, and what code would need to change?",
      groundTruth:
        "This is a real philosophy change, not just a code tweak: today attempting a level (any verdict, even off_track) is enough for nextIncompleteLevel to advance you past it on your next visit — requiring 'solid' would mean a partial/off_track attempt keeps you gated at that level until you retry successfully, which is a meaningfully stricter, more score-like gate than the app's current stated no-scores philosophy. Mechanically: furthestLevelReached currently just checks latestByLevel.has(level) for each level in order; it would need to check latestByLevel.get(level)?.verdict === \"solid\" instead — and since it only looks at the LATEST attempt per level, a learner would need their most recent (not just any) attempt at a level to be solid.",
    },
    design: {
      prompt:
        "Propose one concrete improvement to the curriculum/self-study system, and justify the tradeoff.",
      groundTruth:
        "Open-ended — evaluate for tradeoff-awareness. Reasonable directions: a lightweight registry/lint step that catches a curriculumAttempts row referencing a moduleSlug that no longer exists in CURRICULUM_MODULES (addressing the orphaning risk named in the lesson), surfacing verdict trends across retries for a level (e.g. 'you went off_track → partial → solid over 3 attempts'), or a 'suggest a new module' flow that proposes a module + source files after a substantial code change (formalizing the very process used to create this module).",
    },
  },
};
