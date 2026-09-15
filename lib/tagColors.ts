import type {
  ActivityMode,
  EnvironmentMode,
  LearningSessionStatus,
  ResourceType,
} from "@/lib/db/schema";

// In the Survey design language, state is a word, not a colored chip.
// Color belongs to the Mindscape's field hues and to nothing administrative.
// These maps are kept so every screen phrases the same value the same way;
// the styles are deliberately quiet and identical.

const QUIET = "text-ink-soft";

export const SESSION_STATUS_STYLE: Record<LearningSessionStatus, string> = {
  pending: QUIET,
  started: "text-ink",
  completed: QUIET,
};

export const SESSION_STATUS_LABEL: Record<LearningSessionStatus, string> = {
  pending: "Kept for later",
  started: "In progress",
  completed: "Explained",
};

export const ENVIRONMENT_MODE_LABEL: Record<EnvironmentMode, string> = {
  listen: "listening",
  focus: "focused",
};

export const ACTIVITY_MODE_LABEL: Record<ActivityMode, string> = {
  consume: "taking in",
  practice: "practising",
};

export const ENVIRONMENT_MODE_STYLE: Record<EnvironmentMode, string> = {
  listen: QUIET,
  focus: QUIET,
};

export const ACTIVITY_MODE_STYLE: Record<ActivityMode, string> = {
  consume: QUIET,
  practice: QUIET,
};

export const RESOURCE_TYPE_STYLE: Record<ResourceType, string> = {
  youtube: QUIET,
  article: QUIET,
  podcast: QUIET,
  webinar: QUIET,
  notebooklm: QUIET,
  chatgpt: QUIET,
  paper: QUIET,
  doc: QUIET,
  book: QUIET,
  website: QUIET,
  other: QUIET,
};

export const CONCEPT_TAG_STYLE = "text-ink";

export const CONCEPT_STATUS_LABEL_STYLE: Record<string, string> = {
  Retained: "text-ink",
  "Can Explain": "text-ink",
  Familiar: QUIET,
  Encountered: QUIET,
};

export const EXPLAIN_BACK_STATUS_STYLE: Record<string, string> = {
  correct: "text-ink",
  partial: QUIET,
  missing: QUIET,
};

export const EXPLAIN_BACK_STATUS_LABEL: Record<string, string> = {
  correct: "explained",
  partial: "partly explained",
  missing: "left out",
};

export const UNDERSTANDING_DEPTH_STYLE: Record<string, string> = {
  surface: QUIET,
  solid: QUIET,
  deep: QUIET,
};

export const UNDERSTANDING_CLARITY_STYLE: Record<string, string> = {
  unclear: QUIET,
  reasonable: QUIET,
  very_clear: QUIET,
};

export const RECALL_OUTCOME_STYLE: Record<string, string> = {
  remembered: "text-ink",
  partial: QUIET,
  forgot: QUIET,
};

export const RECALL_OUTCOME_LABEL: Record<string, string> = {
  remembered: "remembered",
  partial: "half remembered",
  forgot: "drew a blank",
};
