// Learn Noesis — content types. Modules are authored as code (not DB rows)
// since they document the real implementation and should be edited in the
// same PR as the architecture changes they describe. See lib/curriculum/
// modules/*.ts for the content and lib/db/schema.ts's curriculumAttempts
// table for what gets persisted (attempts, not content).

export interface CurriculumLevelContent {
  /** The task shown to the user for this level. */
  prompt: string;
  /** Developer-authored ground truth — server-side only, read inside the
   * server action, never passed as a prop into a client component. */
  groundTruth: string;
}

export interface CurriculumLessonSection {
  heading: string;
  /** Paragraphs separated by "\n\n", rendered with whitespace-pre-wrap. */
  body: string;
}

export interface CurriculumModule {
  slug: string;
  /** Display grouping label, e.g. "Phase 1 — Foundations". */
  phase: string;
  title: string;
  /** One-liner used on the index page and as AI grading context. */
  summary: string;
  lesson: {
    overview: string;
    /** Each module should include at least one section that zooms out to
     * the general software/AI concept at play (e.g. structured outputs,
     * provider abstraction, heuristic vs. learned ranking) — not just a
     * tour of Noesis's specific files. That's what makes this a lesson,
     * not documentation. */
    sections: CurriculumLessonSection[];
    /** Real repo paths this module covers — shown as reference labels for
     * the learner to go read, not fetched/rendered in-app. */
    sourceFiles?: string[];
  };
  levels: {
    explain: CurriculumLevelContent;
    trace: CurriculumLevelContent;
    modify: CurriculumLevelContent;
    design: CurriculumLevelContent;
  };
}
