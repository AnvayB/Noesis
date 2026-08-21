import type {
  ActivityMode,
  EnvironmentMode,
  LearningSessionStatus,
  ResourceType,
} from "@/lib/db/schema";

// Shared color language for the small categorical pills used across
// Sessions/Concepts pages, so the same value always reads the same color
// no matter where it shows up.

export const SESSION_STATUS_STYLE: Record<LearningSessionStatus, string> = {
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  started: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
};

export const SESSION_STATUS_LABEL: Record<LearningSessionStatus, string> = {
  pending: "Pending",
  started: "Started",
  completed: "Completed",
};

export const ENVIRONMENT_MODE_STYLE: Record<EnvironmentMode, string> = {
  listen: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
  focus: "bg-teal-500/10 text-teal-700 dark:text-teal-400",
};

export const ACTIVITY_MODE_STYLE: Record<ActivityMode, string> = {
  consume: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
  practice: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
};

export const RESOURCE_TYPE_STYLE: Record<ResourceType, string> = {
  youtube: "bg-red-500/10 text-red-700 dark:text-red-400",
  article: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  podcast: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  webinar: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  notebooklm: "bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-400",
  paper: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  doc: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
  book: "bg-lime-600/10 text-lime-700 dark:text-lime-400",
  other: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
};

export const CONCEPT_TAG_STYLE =
  "bg-violet-500/10 text-violet-700 dark:text-violet-400";

// Matches Mindscape.tsx's nodeClassName color choices for the same labels,
// so a concept's mastery color means the same thing everywhere it appears.
export const CONCEPT_STATUS_LABEL_STYLE: Record<string, string> = {
  Retained: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  "Can Explain": "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  Familiar: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  Encountered: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
};

export const EXPLAIN_BACK_STATUS_STYLE: Record<string, string> = {
  correct: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  partial: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  missing: "bg-zinc-500/10 text-zinc-500 dark:text-zinc-400",
};

export const UNDERSTANDING_DEPTH_STYLE: Record<string, string> = {
  surface: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
  solid: "bg-teal-500/10 text-teal-700 dark:text-teal-400",
  deep: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
};

export const UNDERSTANDING_CLARITY_STYLE: Record<string, string> = {
  unclear: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
  reasonable: "bg-teal-500/10 text-teal-700 dark:text-teal-400",
  very_clear: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
};

export const RECALL_OUTCOME_STYLE: Record<string, string> = {
  remembered: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  partial: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  forgot: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
};
