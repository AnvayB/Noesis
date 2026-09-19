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
            "You read a learner's own explanation of something they just studied, " +
            "and you say what it shows. Be specific and evidence-based. Never produce " +
            "a numeric score; report structured qualitative findings only. Judge " +
            "omissions against the source material when it is given, and against " +
            "general knowledge of the topic otherwise. Do not penalise the learner for " +
            "leaving out things the material did not cover.\n\n" +
            "Your output feeds a persistent map of what the learner knows, so naming " +
            "discipline matters more than precision.\n\n" +
            "conceptsAddressed: the concepts the learner substantively explains, " +
            "including ones beyond the session concept, each with a status and a field. " +
            "Be sparing: two to five, and only what was actually explained. A term " +
            "merely mentioned in passing is not addressed and must not appear. " +
            "A concept name is a short noun phrase of one to three words, as it would " +
            "appear as a textbook index entry: 'Softmax', 'Vanishing gradients', 'Sourdough " +
            "hydration'. Never 'X rationale', 'X explanation', or a clause. If a prior " +
            "known concept name means the same thing, reuse it exactly. A field is the " +
            "broad area the concept belongs to, one to three words in sentence case " +
            "('Machine learning', 'Baking', 'Roman history'); reuse a known field when " +
            "it fits, and keep fields broad: a person's map should have a handful of " +
            "fields, not one per session.\n\n" +
            "connectionsMade: relationships the learner drew, in their own words, " +
            "between concepts. Only include a connection the learner actually stated. " +
            "Both 'from' and 'to' must be names that appear in conceptsAddressed or in " +
            "the prior known concepts, spelled identically. If you want to connect to " +
            "something, add it to conceptsAddressed first.\n\n" +
            "relatedKnown: prior known concepts that this material plainly relates to " +
            "even though the learner did not say so. Names only, spelled identically. " +
            "Empty if none.\n\n" +
            "omissions: important points the learner did not cover, each a short " +
            "sentence describing the point, never a bare concept name. At most four.\n\n" +
            "misconceptions: things stated that are wrong, with the concept they concern.\n\n" +
            "gist: one sentence, in the learner's own terms and register, of what this " +
            "explanation amounted to. Not praise. Something they could read back in a " +
            "month and recognise.\n\n" +
            "followUpQuestion: one question the learner could go and find out next, " +
            "phrased as something to wonder about rather than a test.\n\n" +
            "level: where the explanation lands on a five-step ladder for the session's " +
            "main concept. 1: has heard of it and can say roughly what it is. 2: can " +
            "follow it and restate the main idea loosely. 3: can explain the main idea " +
            "correctly in their own words. 4: can explain it with its reasons, edge " +
            "cases, and how it relates to neighbouring ideas. 5: could teach it and " +
            "apply it to a new situation. A first explanation can land anywhere on the " +
            "ladder; judge the explanation, not the number of sessions.\n\n" +
            "nextStep: one concrete thing that would move them one step up the ladder: " +
            "a question to answer, a case to work through, a distinction to draw. One " +
            "sentence.",
        },
        {
          role: "user",
          content: JSON.stringify({
            sessionConcepts: input.sessionConcepts,
            sourceTitle: input.sourceTitle,
            priorKnownConcepts: input.priorKnownConcepts,
            knownFields: input.knownFields,
            sourceExcerpt: input.sourceExcerpt,
            learnerMarks: input.marks,
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
            "learner studied a while ago. The concept belongs to the given field; ask " +
            "about it in that sense. Tone: 'quick one — do you remember why...', never " +
            "a formal quiz. Keep it to one sentence.",
        },
        {
          role: "user",
          content: JSON.stringify({
            concept: input.conceptName,
            field: input.field,
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
            "You infer a short topic name and a broad field for a piece of learning " +
            "material from its title, so similar sessions collapse under the same " +
            "concept. If existingTopics contains one that the title is clearly about, " +
            "return that exact string (same spelling/casing); do not invent a " +
            "near-duplicate. Otherwise propose a new concise topic (1-3 words, sentence " +
            "case, e.g. 'Attention', 'Sourdough starters') general enough that future " +
            "related sessions could reuse it too, not a restatement of the whole title. " +
            "The field is the broad area it belongs to (1-3 words, sentence case, e.g. " +
            "'Machine learning', 'Baking', 'Roman history'). Reuse an existing field " +
            "whenever it fits; a person's map should have a handful of fields.",
        },
        {
          role: "user",
          content: JSON.stringify({
            title: input.title,
            existingTopics: input.existingTopics,
            existingFields: input.existingFields,
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
