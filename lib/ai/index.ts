import type { AIProvider } from "./types";
import { OpenAIProvider } from "./providers/openai";

// Selects and caches the configured AIProvider adapter. Everything outside
// lib/ai/ should import { ai } from here and never a provider SDK directly —
// that's what lets a Claude or local-model adapter get added later (see
// providers/openai.ts for the shape a new adapter needs to match) without
// touching any application code.

declare global {
  var __noesisAiProvider: AIProvider | undefined;
}

function createProvider(): AIProvider {
  const providerName = process.env.AI_PROVIDER ?? "openai";

  switch (providerName) {
    case "openai": {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error(
          "OPENAI_API_KEY is required when AI_PROVIDER=openai (see .env.local.example)",
        );
      }
      return new OpenAIProvider(apiKey);
    }
    default:
      throw new Error(
        `Unknown AI_PROVIDER "${providerName}". Supported: "openai" (add new adapters in lib/ai/providers/).`,
      );
  }
}

// Constructed lazily, on first actual call, so simply importing this module
// (e.g. for its types) never requires an API key to be configured.
function getProvider(): AIProvider {
  if (!globalThis.__noesisAiProvider) {
    globalThis.__noesisAiProvider = createProvider();
  }
  return globalThis.__noesisAiProvider;
}

export const ai: AIProvider = {
  analyzeExplainBack: (input) => getProvider().analyzeExplainBack(input),
  generateRecallQuestion: (input) => getProvider().generateRecallQuestion(input),
  generateSpeakingPrompt: (input) => getProvider().generateSpeakingPrompt(input),
  suggestTopic: (input) => getProvider().suggestTopic(input),
  generateProjectSuggestion: (input) =>
    getProvider().generateProjectSuggestion(input),
  analyzeArchitectureResponse: (input) =>
    getProvider().analyzeArchitectureResponse(input),
};

export type {
  AIProvider,
  ExplainBackInput,
  ExplainBackAnalysis,
  RecallContext,
  RecallQuestion,
  SpeakingPromptContext,
  SpeakingPromptSuggestion,
  TopicSuggestionContext,
  TopicSuggestion,
  ProjectContext,
  ProjectSuggestion,
  ArchitectureResponseLevel,
  ArchitectureResponseInput,
  ArchitectureResponseAnalysis,
  ArchitectureUnderstandingVerdict,
} from "./types";
