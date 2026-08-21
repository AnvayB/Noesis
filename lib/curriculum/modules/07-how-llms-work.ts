import type { CurriculumModule } from "../types";

export const howLlmsWork: CurriculumModule = {
  slug: "how-llms-work",
  track: "noesis",
  phase: "Phase 2 — Talking to an LLM",
  title: "How LLMs Actually Work",
  summary:
    "What actually happens inside an OpenAI call this app makes — tokens, context windows, autoregressive sampling, and why 'structured outputs' is constrained decoding, not the model being polite.",
  lesson: {
    overview:
      "lib/ai/ treats the model as a black box: send messages, get back a validated object. That's the right abstraction for application code, but it's worth opening the box at least once. This module covers what a token is, how a model actually generates text one token at a time, and — the part most directly relevant to Noesis — what response_format: zodResponseFormat(...) is really doing under the hood when it guarantees explainBackAnalysisSchema always parses.",
    sections: [
      {
        heading: "Tokens, not words",
        body:
          "A model never sees characters or whole words — text is split into tokens (roughly sub-word chunks; 'concepts_addressed' might be several tokens, common short words are often one) by a tokenizer specific to that model family, and everything — the system prompt, the user message, the model's own output — is priced and budgeted in tokens, not characters. This matters concretely in this codebase: every call in providers/openai.ts JSON.stringifies real data straight into the user message (sessionConcepts, priorKnownConcepts, the whole explanationText) with no summarization or truncation step of its own. Every concept you've ever learned about, every word of your explanation, is tokens the model has to read before it can respond — and listRecentConceptNames in lib/queries.ts capping priorKnownConcepts at limit = 20 is not an arbitrary number, it's a direct token-budget guard (see the Modify prompt below).",
      },
      {
        heading: "Autoregressive generation and sampling",
        body:
          "A model generates one token at a time: given everything so far (system prompt + user message + its own output tokens generated up to this point), it produces a probability distribution over its entire vocabulary for 'what token comes next', samples one, appends it, and repeats. This is why the same exact input can produce a different explanation of 'depth: solid vs. surface' across two separate calls — sampling is genuinely stochastic unless temperature is pushed to 0. Noesis never sets a temperature on any of its five OpenAI calls (analyzeExplainBack, generateRecallQuestion, generateSpeakingPrompt, generateProjectSuggestion, analyzeArchitectureResponse in providers/openai.ts) — that's not an oversight to fix, it's accepting the API default, which is itself a real (if implicit) design choice worth noticing rather than assuming 'no setting' means 'no behavior'.",
      },
      {
        heading: "The theory: structured outputs is constrained decoding, not a polite request",
        body:
          "'Please respond in valid JSON matching this shape' in a plain prompt is a request the model can still get wrong — malformed brackets, a missing field, an extra field, prose before the JSON. response_format: zodResponseFormat(explainBackAnalysisSchema, ...) is a fundamentally different mechanism: OpenAI compiles the zod schema into a JSON Schema / grammar and constrains decoding itself — at every single token-generation step, the model's next-token probability distribution is masked so only tokens that keep the output on a path toward valid JSON matching that exact schema are even eligible to be sampled. The model cannot emit a token that would produce an invalid enum value for `depth` or a missing `conceptsAddressed` field; that's why completion.choices[0].message.parsed can be trusted as already-validated with zero manual JSON.parse/try-catch anywhere in the codebase.\n\nBut notice precisely what that guarantees and what it doesn't: the schema constrains SHAPE (every field present, enums restricted to their literal options, types correct), never TRUTH. A `misconceptions[].description` string is free-form generation within its slot — fully unconstrained, exactly as hallucination-prone as any other LLM text — the grammar only forces something string-shaped to appear there, not something true. Constrained decoding is a guarantee about structure, never about content.",
      },
    ],
    sourceFiles: [
      "lib/ai/providers/openai.ts",
      "lib/ai/schemas.ts",
      "lib/ai/types.ts",
      "lib/queries.ts",
    ],
    videos: [
      {
        title: "Large Language Models, Explained Briefly — 3Blue1Brown",
        url: "https://www.youtube.com/watch?v=WMcwoIyK4DA",
      },
    ],
  },
  levels: {
    explain: {
      prompt:
        "Explain, in your own words, what 'structured outputs' (response_format + zodResponseFormat) actually constrains about a model's output, and — just as importantly — what it does NOT constrain.",
      groundTruth:
        "It constrains shape: at every generation step the model's next-token choices are masked to only those consistent with valid JSON matching the given schema, so every required field is present and enum fields (depth, clarity, status) can only ever be one of their literal options — this is enforced during decoding itself (a grammar/constrained-decoding mechanism), not a post-hoc validation step or a polite instruction the model might ignore. It does NOT constrain content/truth: free-text fields like misconceptions[].description or followUpQuestion are unconstrained generation within their slot — the schema forces something string-shaped there, never something accurate. Shape guarantee, not truth guarantee.",
    },
    trace: {
      prompt:
        "Trace what happens to a single call to ai.analyzeExplainBack(...), in terms of tokens and generation, from the messages array being built to a validated ExplainBackAnalysis object being returned.",
      groundTruth:
        "OpenAIProvider.analyzeExplainBack builds a messages array (one system message with grading instructions, one user message JSON.stringify-ing sessionConcepts/priorKnownConcepts/explanationText) — this whole array gets tokenized on OpenAI's side. The model then generates output tokens one at a time, autoregressively, with each step's next-token distribution masked by the JSON Schema compiled from explainBackAnalysisSchema (via zodResponseFormat), so only schema-valid continuations are ever sampled. Once generation completes, the SDK parses and validates the resulting JSON against the same zod schema and exposes it as completion.choices[0].message.parsed — which analyzeExplainBack returns directly (throwing only if parsed is null, e.g. the call was refused/truncated), with no manual JSON.parse or validation step anywhere in application code.",
    },
    modify: {
      prompt:
        "Suppose listRecentConceptNames's limit = 20 cap on priorKnownConcepts (lib/queries.ts) were removed, and a learner with 500 encountered concepts submitted an explain-back. What actually breaks, mechanically, and why is a concept-count cap the right kind of fix (versus, say, truncating the explanation text instead)?",
      groundTruth:
        "Every one of those 500 concept names gets JSON.stringify-d directly into the user message in analyzeExplainBack — the token count of the request grows roughly linearly with concept count, increasing per-call cost and, at enough scale, risking exceeding the model's context window (causing a truncated/failed request) well before the explanation text itself becomes the bottleneck. Capping priorKnownConcepts specifically (rather than, say, shortening explanationText) is the right fix because the explanation is the actual thing being graded — truncating it would silently degrade grading quality — whereas the prior-known-concepts list is only context to help the model spot connections, which degrades gracefully if capped to the 20 most recently encountered rather than all of them.",
    },
    design: {
      prompt:
        "Propose one concrete improvement to how this app manages token usage or model behavior, and justify the tradeoff.",
      groundTruth:
        "Open-ended — evaluate for tradeoff-awareness. Reasonable directions: logging completion.usage (prompt/completion token counts, available on every OpenAI response but currently discarded) for cost visibility; setting an explicit low temperature on analyzeArchitectureResponse/analyzeExplainBack for more consistent grading versus leaving generateSpeakingPrompt/generateRecallQuestion at a higher temperature for variety, since those two use cases want opposite properties; or using a cheaper/smaller model for the low-stakes ephemeral speaking-prompt call versus the persisted, graded explain-back call. Any proposal should weigh the cost/complexity added against what it actually buys.",
    },
  },
};
