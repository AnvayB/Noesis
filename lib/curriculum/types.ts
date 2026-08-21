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

/** Which curriculum track a module belongs to — each track gets its own nav
 * item, index page, and URL namespace (see CURRICULUM_TRACKS below), but
 * shares all the same grading/attempt machinery. */
export type CurriculumTrack = "noesis" | "arteris";

export interface CurriculumTrackInfo {
  label: string;
  /** URL prefix for this track's index + module pages, e.g. "/learn-noesis". */
  basePath: string;
}

export const CURRICULUM_TRACKS = {
  noesis: { label: "Learn Noesis", basePath: "/learn-noesis" },
  arteris: { label: "Arteris 101", basePath: "/arteris-101" },
} as const satisfies Record<CurriculumTrack, CurriculumTrackInfo>;

export type GradeableCurriculumLevel = "explain" | "trace" | "modify" | "design";

export interface CurriculumModule {
  slug: string;
  track: CurriculumTrack;
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
    /** Real repo paths this module covers, OR — for non-Noesis tracks —
     * external reference URLs. Shown as reference labels for the learner to
     * go read, not fetched/rendered in-app. */
    sourceFiles?: string[];
    /** Key into CURRICULUM_DIAGRAMS (components/curriculum/diagrams) — an
     * original inline-SVG diagram rendered under the overview. Optional:
     * only the most diagram-worthy modules get one, not every module. */
    diagramId?: string;
    /** Real, verified external videos (not fabricated) that support this
     * module's general-knowledge content. Left empty for modules with no
     * genuine external match — e.g. Noesis's own architecture, or an
     * individual Arteris product with no independent public video. */
    videos?: { title: string; url: string }[];
  };
  /** Which gradeable levels this module offers, beyond the always-available
   * "understand". Noesis modules document a real implementation, so they
   * supply all four. Tracks with no underlying implementation to trace or
   * modify (e.g. Arteris 101, which teaches external product knowledge)
   * should only supply "explain" — see feedback_curriculum_track_levels. */
  levels: Partial<Record<GradeableCurriculumLevel, CurriculumLevelContent>>;
}
