// Provider-neutral input/output types for every LLM contract the app uses.
// Adapters (lib/ai/providers/*) translate these to/from a specific vendor's
// API shape — application code only ever imports from here and from
// lib/ai/index.ts, never from a provider SDK directly.

export interface ExplainBackInput {
  /** Concepts the session was primarily about, e.g. ["Mixture of Experts"] */
  sessionConcepts: string[];
  /** Names of concepts already known from prior sessions, for connection-spotting */
  priorKnownConcepts: string[];
  /** The user's own explanation, verbatim */
  explanationText: string;
  /** Fields already on the map, so new concepts are filed with their neighbours. */
  knownFields: string[];
  /** The readable body of the source, when it was an article, so omissions
   * are judged against what the material actually said. Trimmed. */
  sourceExcerpt: string | null;
  /** The learner's own marks made while watching or reading, if any. */
  marks: string | null;
  /** Title of the source, for context. */
  sourceTitle: string | null;
}

export type ConceptAddressedStatus = "correct" | "partial" | "missing";

export interface ExplainBackAnalysis {
  conceptsAddressed: { concept: string; field: string; status: ConceptAddressedStatus }[];
  misconceptions: { description: string; concept: string | null }[];
  omissions: string[];
  depth: "surface" | "solid" | "deep";
  clarity: "unclear" | "reasonable" | "very_clear";
  connectionsMade: { from: string; to: string; description: string }[];
  /** Prior known concepts the material plainly relates to, whether or not
   * the learner said so. Steers growth on the map; never fuses. */
  relatedKnown: string[];
  followUpQuestion: string | null;
  /** One sentence, in the learner's terms, of what the explanation amounted to. */
  gist: string;
  /** 1 heard of it, 2 can follow it, 3 can explain the main idea, 4 can
   * explain it with its edges and reasons, 5 could teach it and apply it. */
  level: 1 | 2 | 3 | 4 | 5;
  /** What would move the learner one step up the ladder, concretely. */
  nextStep: string;
}

export interface RecallContext {
  conceptName: string;
  /** The field it belongs to, so the question is about the right thing. */
  field: string | null;
  lastUnderstandingSummary: string | null;
  daysSinceReviewed: number;
}

export interface RecallQuestion {
  question: string;
  expectedKeyPoints: string[];
}

export type ProjectScope = "improve_app" | "standalone";
export type ProjectDuration = "10-15m" | "30m" | "1h" | "1-2h" | "larger";

export interface ProjectContext {
  conceptName: string;
  demonstratedUnderstanding: "surface" | "solid" | "deep";
  candidateDurations: ProjectDuration[];
}

export interface ProjectSuggestion {
  scope: ProjectScope;
  title: string;
  description: string;
  estimatedDuration: ProjectDuration;
  challengePrompt: string;
  hints: {
    hint: string;
    biggerHint: string;
    steps: string[];
    implementationHelpPrompt: string;
  };
}

export interface SpeakingPromptContext {
  conceptName: string;
}

export interface SpeakingPromptSuggestion {
  prompt: string;
}

export interface TopicSuggestionContext {
  title: string;
  /** Fields already on the map, most recently used first. Reuse one when it fits. */
  existingFields: string[];
  /** Names of concepts already in the knowledge landscape, most recently
   * encountered first — reuse one of these verbatim when it's a real match,
   * so similar sessions collapse onto the same Concept instead of spawning
   * near-duplicates. */
  existingTopics: string[];
}

export interface TopicSuggestion {
  topic: string;
  /** The broad field the topic belongs to, e.g. "Machine learning". */
  field: string;
}

// Learn Noesis — grading for the four response-based curriculum levels
// (Understand has no response, so it never reaches this call).
export type ArchitectureResponseLevel = "explain" | "trace" | "modify" | "design";

export interface ArchitectureResponseInput {
  moduleTitle: string;
  level: ArchitectureResponseLevel;
  /** module.summary only, not the full lesson — keeps token cost flat
   * across the up-to-4 calls a single module can generate. */
  lessonSummary: string;
  /** Developer-authored description of the actual implementation for this
   * level — server-only, never forwarded to a client component. */
  groundTruth: string;
  userResponse: string;
}

export type ArchitectureUnderstandingVerdict = "solid" | "partial" | "off_track";

export interface ArchitectureResponseAnalysis {
  verdict: ArchitectureUnderstandingVerdict;
  whatYouGotRight: string[];
  misconceptions: { description: string; correction: string }[];
  gaps: string[];
  followUpQuestion: string | null;
}

export interface AIProvider {
  analyzeExplainBack(input: ExplainBackInput): Promise<ExplainBackAnalysis>;
  generateRecallQuestion(input: RecallContext): Promise<RecallQuestion>;
  // Spec section 14 — "From My Knowledge" speaking prompts, e.g. "Explain
  // RAG to a nontechnical person."
  generateSpeakingPrompt(
    input: SpeakingPromptContext,
  ): Promise<SpeakingPromptSuggestion>;
  // Add learning material form — infers a topic from the title, reusing an
  // existing concept name when the title matches one already in the
  // knowledge landscape.
  suggestTopic(input: TopicSuggestionContext): Promise<TopicSuggestion>;
  // Architect For — not called by any Phase 1-4 code path yet, but part of
  // the interface so adding the Project feature later doesn't touch adapters.
  generateProjectSuggestion(input: ProjectContext): Promise<ProjectSuggestion>;
  // Learn Noesis — grades a user's explain/trace/modify/design response
  // against developer-authored ground truth for a curriculum module.
  analyzeArchitectureResponse(
    input: ArchitectureResponseInput,
  ): Promise<ArchitectureResponseAnalysis>;
}
