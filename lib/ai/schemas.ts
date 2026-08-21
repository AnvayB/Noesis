import { z } from "zod/v4";

// Zod schemas mirroring lib/ai/types.ts. These are the single source of
// truth for both the wire-format JSON schema sent to a provider and the
// runtime validation of what comes back — application code only ever sees
// the plain TS types from types.ts.

export const explainBackAnalysisSchema = z.object({
  conceptsAddressed: z.array(
    z.object({
      concept: z.string(),
      status: z.enum(["correct", "partial", "missing"]),
    }),
  ),
  misconceptions: z.array(
    z.object({
      description: z.string(),
      concept: z.string().nullable(),
    }),
  ),
  omissions: z.array(z.string()),
  depth: z.enum(["surface", "solid", "deep"]),
  clarity: z.enum(["unclear", "reasonable", "very_clear"]),
  connectionsMade: z.array(
    z.object({
      from: z.string(),
      to: z.string(),
      description: z.string(),
    }),
  ),
  followUpQuestion: z.string().nullable(),
});

export const recallQuestionSchema = z.object({
  question: z.string(),
  expectedKeyPoints: z.array(z.string()),
});

export const speakingPromptSchema = z.object({
  prompt: z.string(),
});

export const topicSuggestionSchema = z.object({
  topic: z.string(),
});

export const architectureResponseAnalysisSchema = z.object({
  verdict: z.enum(["solid", "partial", "off_track"]),
  whatYouGotRight: z.array(z.string()),
  misconceptions: z.array(
    z.object({ description: z.string(), correction: z.string() }),
  ),
  gaps: z.array(z.string()),
  followUpQuestion: z.string().nullable(),
});

export const projectSuggestionSchema = z.object({
  scope: z.enum(["improve_app", "standalone"]),
  title: z.string(),
  description: z.string(),
  estimatedDuration: z.enum(["10-15m", "30m", "1h", "1-2h", "larger"]),
  challengePrompt: z.string(),
  hints: z.object({
    hint: z.string(),
    biggerHint: z.string(),
    steps: z.array(z.string()),
    implementationHelpPrompt: z.string(),
  }),
});
