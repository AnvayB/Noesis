import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// --- Resource -------------------------------------------------------------

export const resourceTypeValues = [
  "youtube",
  "article",
  "podcast",
  "webinar",
  "notebooklm",
  "paper",
  "doc",
  "book",
  "other",
] as const;
export type ResourceType = (typeof resourceTypeValues)[number];

export const resourceTypeLabels: Record<ResourceType, string> = {
  youtube: "YouTube",
  article: "Article",
  podcast: "Podcast",
  webinar: "Webinar",
  notebooklm: "NotebookLM",
  paper: "Paper",
  doc: "Doc",
  book: "Book",
  other: "Other",
};

export const resources = sqliteTable("resources", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  type: text("type").$type<ResourceType>().notNull(),
  url: text("url"),
  title: text("title").notNull(),
  notes: text("notes"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

// --- LearningSession --------------------------------------------------------

export const environmentModeValues = ["listen", "focus"] as const;
export type EnvironmentMode = (typeof environmentModeValues)[number];

export const activityModeValues = ["consume", "practice"] as const;
export type ActivityMode = (typeof activityModeValues)[number];

// pending: added to the backlog, not yet begun — reference is saved but
// nothing about it has been "logged" yet. started: actively learning
// (explain-back is available). completed: either an explain-back was
// submitted or the user manually marked it done.
export const learningSessionStatusValues = [
  "pending",
  "started",
  "completed",
] as const;
export type LearningSessionStatus = (typeof learningSessionStatusValues)[number];

export const learningSessions = sqliteTable("learning_sessions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  resourceId: text("resource_id").references(() => resources.id, {
    onDelete: "set null",
  }),
  environmentMode: text("environment_mode")
    .$type<EnvironmentMode>()
    .notNull(),
  activityMode: text("activity_mode").$type<ActivityMode>().notNull(),
  status: text("status")
    .$type<LearningSessionStatus>()
    .notNull()
    .default("started"),
  startedAt: text("started_at")
    .notNull()
    .default(sql`(current_timestamp)`),
  endedAt: text("ended_at"),
  durationMinutes: integer("duration_minutes"),
  notes: text("notes"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

// --- Concept ------------------------------------------------------------
// confidenceEstimate is deliberately not stored — Mindscape (Phase 3)
// derives it at read time from status/recency instead of caching a score.

export const concepts = sqliteTable("concepts", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  firstEncounteredAt: text("first_encountered_at")
    .notNull()
    .default(sql`(current_timestamp)`),
  lastEncounteredAt: text("last_encountered_at")
    .notNull()
    .default(sql`(current_timestamp)`),
  lastReviewedAt: text("last_reviewed_at"),
  // Cached force-simulation position, so Mindscape doesn't re-scramble on
  // every visit — written back once a simulation settles (see Mindscape.tsx).
  layoutX: real("layout_x"),
  layoutY: real("layout_y"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export type Concept = typeof concepts.$inferSelect;

// --- SessionConcept (join) --------------------------------------------------

export const sessionConceptRoleValues = ["primary", "mentioned"] as const;
export type SessionConceptRole = (typeof sessionConceptRoleValues)[number];

export const sessionConcepts = sqliteTable("session_concepts", {
  sessionId: text("session_id")
    .notNull()
    .references(() => learningSessions.id, { onDelete: "cascade" }),
  conceptId: text("concept_id")
    .notNull()
    .references(() => concepts.id, { onDelete: "cascade" }),
  role: text("role").$type<SessionConceptRole>().notNull().default("primary"),
});

// --- CuriosityItem -----------------------------------------------------------

export const curiosityItems = sqliteTable("curiosity_items", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  text: text("text").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
  resolvedAt: text("resolved_at"),
  promotedToSessionId: text("promoted_to_session_id").references(
    () => learningSessions.id,
    { onDelete: "set null" },
  ),
});

// --- ExplainBack --------------------------------------------------------

export const explainBackInputModeValues = ["text", "voice"] as const;
export type ExplainBackInputMode = (typeof explainBackInputModeValues)[number];

export const explainBacks = sqliteTable("explain_backs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  sessionId: text("session_id")
    .notNull()
    .references(() => learningSessions.id, { onDelete: "cascade" }),
  inputMode: text("input_mode").$type<ExplainBackInputMode>().notNull(),
  rawText: text("raw_text").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

// --- ConceptUnderstanding -------------------------------------------------
// One row per explain-back: the holistic LLM analysis (F.1). Per-concept
// status lives in explainBackConcepts below, since the LLM reports
// omissions/misconceptions/depth/clarity at the explain-back level, not
// broken down per concept.

export const understandingDepthValues = ["surface", "solid", "deep"] as const;
export type UnderstandingDepth = (typeof understandingDepthValues)[number];

export const understandingClarityValues = [
  "unclear",
  "reasonable",
  "very_clear",
] as const;
export type UnderstandingClarity = (typeof understandingClarityValues)[number];

export interface Misconception {
  description: string;
  concept: string | null;
}

export interface ConceptConnection {
  from: string;
  to: string;
  description: string;
}

export const conceptUnderstandings = sqliteTable("concept_understandings", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  explainBackId: text("explain_back_id")
    .notNull()
    .unique()
    .references(() => explainBacks.id, { onDelete: "cascade" }),
  depth: text("depth").$type<UnderstandingDepth>().notNull(),
  clarity: text("clarity").$type<UnderstandingClarity>().notNull(),
  omissions: text("omissions", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'`),
  misconceptions: text("misconceptions", { mode: "json" })
    .$type<Misconception[]>()
    .notNull()
    .default(sql`'[]'`),
  connectionsMade: text("connections_made", { mode: "json" })
    .$type<ConceptConnection[]>()
    .notNull()
    .default(sql`'[]'`),
  followUpQuestion: text("follow_up_question"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

// --- ExplainBackConcept (per-concept status within one explain-back) ------

export const conceptAddressedStatusValues = [
  "correct",
  "partial",
  "missing",
] as const;
export type ConceptAddressedStatus =
  (typeof conceptAddressedStatusValues)[number];

export const explainBackConcepts = sqliteTable("explain_back_concepts", {
  explainBackId: text("explain_back_id")
    .notNull()
    .references(() => explainBacks.id, { onDelete: "cascade" }),
  conceptId: text("concept_id")
    .notNull()
    .references(() => concepts.id, { onDelete: "cascade" }),
  status: text("status").$type<ConceptAddressedStatus>().notNull(),
});

// --- ConceptRelation ------------------------------------------------------

export const conceptRelationTypeValues = [
  "related",
  "prerequisite",
  "part_of",
] as const;
export type ConceptRelationType = (typeof conceptRelationTypeValues)[number];

export const conceptRelationSourceValues = ["llm_inferred", "manual"] as const;
export type ConceptRelationSource =
  (typeof conceptRelationSourceValues)[number];

export const conceptRelations = sqliteTable("concept_relations", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  fromConceptId: text("from_concept_id")
    .notNull()
    .references(() => concepts.id, { onDelete: "cascade" }),
  toConceptId: text("to_concept_id")
    .notNull()
    .references(() => concepts.id, { onDelete: "cascade" }),
  relationType: text("relation_type").$type<ConceptRelationType>().notNull(),
  source: text("source").$type<ConceptRelationSource>().notNull(),
  description: text("description"),
  // Incremented each time the same pair is re-asserted by a later
  // explain-back — drives Mindscape edge thickness (co-occurrence).
  strength: integer("strength").notNull().default(1),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

// --- RecallAttempt --------------------------------------------------------
// A row is created when a casual recall question is generated (prompt +
// expectedKeyPoints filled in) and updated once the learner self-reports how
// it went — response/outcome/answeredAt stay null in between.

export const recallTriggerValues = ["casual_quiz", "revisit"] as const;
export type RecallTrigger = (typeof recallTriggerValues)[number];

export const recallOutcomeValues = ["remembered", "partial", "forgot"] as const;
export type RecallOutcome = (typeof recallOutcomeValues)[number];

export const recallAttempts = sqliteTable("recall_attempts", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  conceptId: text("concept_id")
    .notNull()
    .references(() => concepts.id, { onDelete: "cascade" }),
  triggeredBy: text("triggered_by").$type<RecallTrigger>().notNull(),
  prompt: text("prompt").notNull(),
  expectedKeyPoints: text("expected_key_points", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'`),
  response: text("response"),
  outcome: text("outcome").$type<RecallOutcome>(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
  answeredAt: text("answered_at"),
});

export type RecallAttempt = typeof recallAttempts.$inferSelect;

// --- CurriculumAttempt -----------------------------------------------------
// "Learn Noesis" — module/level content and ground truth live in code
// (lib/curriculum/), not the DB, so this table only records what the user
// actually did against them. moduleSlug is a plain string, not a FK: there's
// no curriculum_modules table, so module content can be added/reordered in
// code without a migration. Retries are allowed — this is a full attempt
// history, not one row per (module, level); "furthest level reached" is
// derived at read time (lib/curriculum/queries.ts), same pattern as
// Concept.confidenceEstimate above.

export const curriculumLevelValues = [
  "understand",
  "explain",
  "trace",
  "modify",
  "design",
] as const;
export type CurriculumLevel = (typeof curriculumLevelValues)[number];

export const curriculumVerdictValues = ["solid", "partial", "off_track"] as const;
export type CurriculumVerdict = (typeof curriculumVerdictValues)[number];

export interface CurriculumMisconception {
  description: string;
  correction: string;
}

export const curriculumAttempts = sqliteTable("curriculum_attempts", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  moduleSlug: text("module_slug").notNull(),
  level: text("level").$type<CurriculumLevel>().notNull(),
  // Null for the "understand" level (nothing to grade).
  userResponse: text("user_response"),
  verdict: text("verdict").$type<CurriculumVerdict>(),
  whatYouGotRight: text("what_you_got_right", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'`),
  misconceptions: text("misconceptions", { mode: "json" })
    .$type<CurriculumMisconception[]>()
    .notNull()
    .default(sql`'[]'`),
  gaps: text("gaps", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'`),
  followUpQuestion: text("follow_up_question"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export type CurriculumAttempt = typeof curriculumAttempts.$inferSelect;
