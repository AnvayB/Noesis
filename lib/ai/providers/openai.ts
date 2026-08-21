import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import type {
  AIProvider,
  ArchitectureResponseAnalysis,
  ArchitectureResponseInput,
  ArchitectureResponseLevel,
  ExplainBackAnalysis,
  ExplainBackInput,
  ProjectContext,
  ProjectSuggestion,
  RecallContext,
  RecallQuestion,
  SpeakingPromptContext,
  SpeakingPromptSuggestion,
  TopicSuggestion,
  TopicSuggestionContext,
} from "../types";
import {
  architectureResponseAnalysisSchema,
  explainBackAnalysisSchema,
  projectSuggestionSchema,
  recallQuestionSchema,
  speakingPromptSchema,
  topicSuggestionSchema,
} from "../schemas";

const ARCHITECTURE_LEVEL_RUBRIC: Record<ArchitectureResponseLevel, string> = {
  explain:
    "Check whether they correctly restate the concept in their own words — real understanding, not memorized phrasing.",
  trace:
    "Check whether they correctly identify the sequence of files/functions/data touched for the given flow, in the right order.",
  modify:
    "Check whether they identify the right place(s) in the code to change and a plausible mechanism — not necessarily the only valid approach.",
  design:
    "Check whether their proposal is architecturally sound and shows awareness of tradeoffs, even if it differs from the ground truth given.",
};

const DEFAULT_MODEL = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";

export class OpenAIProvider implements AIProvider {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async analyzeExplainBack(
    input: ExplainBackInput,
  ): Promise<ExplainBackAnalysis> {
    const completion = await this.client.chat.completions.parse({
      model: DEFAULT_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You evaluate a learner's own explanation of concepts they just studied. " +
            "Be specific and evidence-based. Never produce a single numeric score — " +
            "report structured qualitative findings only.\n\n" +
            "concepts_addressed is the canonical list of concept names for this " +
            "explanation — keep it short (the handful of real concepts actually " +
            "discussed, not every noun phrase). For connections_made, the 'from' and " +
            "'to' values MUST each exactly match a name already used in " +
            "concepts_addressed, or one of the given prior known concepts — never " +
            "invent a new sub-concept name there. This feeds a persistent concept " +
            "graph, so consistent naming across calls matters more than precision.",
        },
        {
          role: "user",
          content: JSON.stringify({
            sessionConcepts: input.sessionConcepts,
            priorKnownConcepts: input.priorKnownConcepts,
            explanation: input.explanationText,
          }),
        },
      ],
      response_format: zodResponseFormat(
        explainBackAnalysisSchema,
        "explain_back_analysis",
      ),
    });

    const parsed = completion.choices[0]?.message.parsed;
    if (!parsed) throw new Error("OpenAI returned no parsed explain-back analysis");
    return parsed;
  }

  async generateRecallQuestion(
    input: RecallContext,
  ): Promise<RecallQuestion> {
    const completion = await this.client.chat.completions.parse({
      model: DEFAULT_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You write a single casual, low-stakes recall question about a concept the " +
            "learner studied a while ago. Tone: 'quick one — do you remember why...', " +
            "never a formal quiz. Keep it to one sentence.",
        },
        {
          role: "user",
          content: JSON.stringify({
            concept: input.conceptName,
            lastUnderstandingSummary: input.lastUnderstandingSummary,
            daysSinceReviewed: input.daysSinceReviewed,
          }),
        },
      ],
      response_format: zodResponseFormat(recallQuestionSchema, "recall_question"),
    });

    const parsed = completion.choices[0]?.message.parsed;
    if (!parsed) throw new Error("OpenAI returned no parsed recall question");
    return parsed;
  }

  async generateSpeakingPrompt(
    input: SpeakingPromptContext,
  ): Promise<SpeakingPromptSuggestion> {
    const completion = await this.client.chat.completions.parse({
      model: DEFAULT_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You write a single spontaneous-speaking prompt about a concept the learner " +
            "has studied, for them to practice explaining out loud. Examples: 'Explain X " +
            "to a nontechnical person', 'Compare X and Y', 'Argue whether X is actually " +
            "useful'. One sentence, no preamble.",
        },
        {
          role: "user",
          content: JSON.stringify({ concept: input.conceptName }),
        },
      ],
      response_format: zodResponseFormat(speakingPromptSchema, "speaking_prompt"),
    });

    const parsed = completion.choices[0]?.message.parsed;
    if (!parsed) throw new Error("OpenAI returned no parsed speaking prompt");
    return parsed;
  }

  async generateProjectSuggestion(
    input: ProjectContext,
  ): Promise<ProjectSuggestion> {
    const completion = await this.client.chat.completions.parse({
      model: DEFAULT_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You suggest a small hands-on project to practice a concept the learner just " +
            "explained. Decide whether it meaningfully improves their personal learning app " +
            "('improve_app') or is better as a standalone mini-project ('standalone'). " +
            "Generate all progressive help levels (hint, bigger hint, steps, implementation " +
            "help) up front — the app reveals them one at a time, and the default should " +
            "encourage the learner to think before reaching for later hints.",
        },
        {
          role: "user",
          content: JSON.stringify({
            concept: input.conceptName,
            demonstratedUnderstanding: input.demonstratedUnderstanding,
            candidateDurations: input.candidateDurations,
          }),
        },
      ],
      response_format: zodResponseFormat(
        projectSuggestionSchema,
        "project_suggestion",
      ),
    });

    const parsed = completion.choices[0]?.message.parsed;
    if (!parsed) throw new Error("OpenAI returned no parsed project suggestion");
    return parsed;
  }

  async suggestTopic(input: TopicSuggestionContext): Promise<TopicSuggestion> {
    const completion = await this.client.chat.completions.parse({
      model: DEFAULT_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You infer a short topic name for a piece of learning material from its title, " +
            "so similar sessions collapse under the same category. If existing_topics " +
            "contains one that the title is clearly about, return that exact string " +
            "(same spelling/casing) — do not invent a near-duplicate. Otherwise propose a " +
            "new concise topic (1-3 words, Title Case, e.g. 'Attention', 'Mixture of " +
            "Experts') general enough that future related sessions could reuse it too, " +
            "not a restatement of the whole title.",
        },
        {
          role: "user",
          content: JSON.stringify({
            title: input.title,
            existingTopics: input.existingTopics,
          }),
        },
      ],
      response_format: zodResponseFormat(topicSuggestionSchema, "topic_suggestion"),
    });

    const parsed = completion.choices[0]?.message.parsed;
    if (!parsed) throw new Error("OpenAI returned no parsed topic suggestion");
    return parsed;
  }

  async analyzeArchitectureResponse(
    input: ArchitectureResponseInput,
  ): Promise<ArchitectureResponseAnalysis> {
    const completion = await this.client.chat.completions.parse({
      model: DEFAULT_MODEL,
      messages: [
        {
          role: "system",
          content:
            `You evaluate a learner's response about "${input.moduleTitle}" (${input.lessonSummary}) ` +
            "— you're grading their understanding against the ground truth given, not " +
            "opinion. Be specific and evidence-based. Never produce a single numeric " +
            "score — report structured qualitative findings only. Every misconception " +
            "must include a correction grounded in the ground truth given.\n\n" +
            ARCHITECTURE_LEVEL_RUBRIC[input.level],
        },
        {
          role: "user",
          content: JSON.stringify({
            moduleTitle: input.moduleTitle,
            level: input.level,
            lessonSummary: input.lessonSummary,
            groundTruth: input.groundTruth,
            userResponse: input.userResponse,
          }),
        },
      ],
      response_format: zodResponseFormat(
        architectureResponseAnalysisSchema,
        "architecture_response_analysis",
      ),
    });

    const parsed = completion.choices[0]?.message.parsed;
    if (!parsed)
      throw new Error("OpenAI returned no parsed architecture response analysis");
    return parsed;
  }
}
