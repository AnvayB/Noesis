import type { CurriculumModule } from "../types";

export const explainBackAiAbstraction: CurriculumModule = {
  slug: "explain-back-ai-abstraction",
  track: "noesis",
  phase: "Phase 2 — Talking to an LLM",
  title: "Explain-Back & the AI Provider Abstraction",
  summary:
    "How the app grades a free-text explanation with structured LLM output, and why no application code ever imports an SDK directly.",
  lesson: {
    overview:
      "Explaining something in your own words is the single most important feature in Noesis — it's the moment that actually reveals whether you understood the material or just recognized it. lib/ai/ is the layer that turns a paragraph of free text into structured, gradable feedback, and it's built so the LLM vendor behind it (OpenAI today) is a swappable implementation detail, not something baked into every call site.",
    sections: [
      {
        heading: "types.ts / schemas.ts / providers/openai.ts",
        body:
          "lib/ai/types.ts defines plain TypeScript interfaces for every LLM call the app makes — ExplainBackInput/ExplainBackAnalysis, RecallContext/RecallQuestion, and so on — with zero mention of OpenAI anywhere in the file. lib/ai/schemas.ts mirrors each of those 1:1 as a zod schema. That duplication is intentional: the zod schema is the single source of truth for two different jobs at once — it's handed to OpenAI's zodResponseFormat() to constrain what the model is allowed to return (structured output), and it's the exact same object used to validate/type the parsed response on the way back in.\n\n" +
          "lib/ai/providers/openai.ts is the only adapter that exists today. Every method has the identical shape: build a system+user message pair, call client.chat.completions.parse() with response_format: zodResponseFormat(schema, name), then throw if completion.choices[0]?.message.parsed is null. Nothing about that shape is OpenAI-specific except the client itself.",
      },
      {
        heading: "What's deterministic vs. what the LLM controls",
        body:
          "It's worth being precise about the boundary here, because it's easy to blur: the LLM's only job is to return the ExplainBackAnalysis shape (concepts addressed, misconceptions, omissions, depth, clarity, connections, a follow-up question). Every persistence decision — writing the explainBacks row, writing conceptUnderstandings, deciding whether a mentioned concept is new or already exists (findOrCreateConcept), bumping lastReviewedAt, deduplicating near-identical concept names the model might invent — happens in deterministic TypeScript in lib/actions/explainBack.ts, after the AI call returns. The model proposes; the application code disposes.\n\n" +
          "There's a concrete guard for this in the code: the system prompt instructs the model to only use concept names it already listed in concepts_addressed, but the comment above the canonicalNameByLower map in explainBack.ts admits models don't always comply ('seen in testing: \"Query and Key vectors\" vs. \"Query, Key, and Value vectors\"') — so deterministic code builds a lowercase-keyed lookup and silently drops any connection referencing a name outside that set, rather than trusting the model's naming consistency.",
      },
      {
        heading: "The theory: structured output as a contract, and the Adapter pattern",
        body:
          "Two general ideas are doing the real work here, independent of Noesis. First, structured/JSON-schema-constrained generation (what OpenAI calls 'structured outputs', Anthropic has an equivalent via tool-use forced-choice) turns an LLM from 'produces plausible text' into 'produces a value you can type-check' — it's the difference between parsing prose with regex and getting a value your compiler already understands. Second, lib/ai/'s shape is a textbook Adapter (or Strategy) pattern: a stable interface (AIProvider) that application code depends on, with swappable concrete implementations behind it. The payoff isn't hypothetical — it's the exact reason adding a second provider is cheap (see the Modify prompt below).",
      },
    ],
    sourceFiles: [
      "lib/ai/types.ts",
      "lib/ai/schemas.ts",
      "lib/ai/providers/openai.ts",
      "lib/ai/index.ts",
      "lib/actions/explainBack.ts",
    ],
  },
  levels: {
    explain: {
      prompt:
        "Explain, in your own words, what the AI provider abstraction buys the app, and precisely what the LLM is and isn't responsible for in the explain-back flow.",
      groundTruth:
        "The abstraction (types.ts interfaces + schemas.ts zod mirrors + a provider-selecting factory in index.ts) means application code only ever calls ai.analyzeExplainBack(...) and never imports an OpenAI (or any vendor) type — swapping or adding a provider touches only lib/ai/. The LLM's responsibility is strictly the ExplainBackAnalysis shape: it judges depth/clarity, flags omissions/misconceptions, and proposes concept connections. It does NOT decide how that gets stored, does NOT dedupe concept names, and does NOT touch the database — all of that is deterministic code in lib/actions/explainBack.ts running after the call returns.",
    },
    trace: {
      prompt:
        "Trace what happens from submitting an explanation on a session page to the concept graph being updated.",
      groundTruth:
        "app/sessions/[id]/page.tsx's form (with <ExplainBackInput />) posts to submitExplainBackAction in lib/actions/explainBack.ts. That function loads the session, gathers sessionConcepts + prior known concept names (listRecentConceptNames), calls ai.analyzeExplainBack(...) (which resolves through lib/ai/index.ts's getProvider() singleton to OpenAIProvider.analyzeExplainBack), inserts an explainBacks row and a 1:1 conceptUnderstandings row with the raw analysis, then for each concept in conceptsAddressed calls findOrCreateConcept (lib/concepts.ts) and inserts an explainBackConcepts status row. Finally it builds a canonical-name map and, for each connectionsMade pair that resolves to two known concepts, either increments an existing conceptRelations.strength or inserts a new relation — then redirects back to the session page.",
    },
    modify: {
      prompt:
        "Suppose you wanted to add an Anthropic/Claude adapter alongside OpenAI. Describe exactly what you'd add, and just as importantly, what you would NOT need to touch.",
      groundTruth:
        "Add lib/ai/providers/anthropic.ts implementing the AIProvider interface (same five methods), translating each call to Claude's API and validating the JSON response against the existing zod schemas from lib/ai/schemas.ts. Add a new case \"anthropic\" in the switch inside createProvider() in lib/ai/index.ts, reading an ANTHROPIC_API_KEY env var. Nothing in lib/actions/*, any app/* route, or lib/ai/types.ts/schemas.ts needs to change — that's the entire point of depending on the AIProvider interface rather than an OpenAI client type.",
    },
    design: {
      prompt:
        "Propose one concrete improvement to the AI provider abstraction itself, and justify the tradeoff.",
      groundTruth:
        "Open-ended — evaluate for tradeoff-awareness. Reasonable directions include: retry/fallback logic when a provider call fails or returns null (currently every method just throws), a way to run two providers in parallel for eval/comparison purposes, or caching identical requests. Any proposal should engage with the cost it adds (latency, complexity, another failure mode) against the reliability or flexibility it buys.",
    },
  },
};
