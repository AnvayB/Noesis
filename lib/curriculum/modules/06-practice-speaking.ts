import type { CurriculumModule } from "../types";

export const practiceSpeaking: CurriculumModule = {
  slug: "practice-speaking",
  phase: "Phase 4 — Practice",
  title: "Practice & Speaking",
  summary:
    "The 'From My Knowledge' personalized speaking prompt, why it's not a form action, and why it's deliberately ephemeral instead of persisted.",
  lesson: {
    overview:
      "/practice pairs two things: a personalized speaking prompt generated from your own concept history, and a plain external link to unprompted.cool for generic spontaneous-speaking practice. The interesting engineering is entirely in the first half — it's the smallest AI-backed feature in the app, and a good example of when NOT to reach for the server-action-plus-database pattern used everywhere else.",
    sections: [
      {
        heading: "A random concept, not the heuristic scheduler",
        body:
          "generateSpeakingPromptAction (lib/actions/speaking.ts) picks a concept uniformly at random from every concept you've ever encountered — Math.floor(Math.random() * allConcepts.length) — not through pickHeuristicConcept() from the Recall module. That's a real difference in intent: recall scheduling optimizes for retention (surface what's stale or shaky), while speaking practice optimizes for variety and low stakes (surface literally anything you know, so you get reps explaining things out loud). Reusing the recall heuristic here would quietly change what the feature is for.",
      },
      {
        heading: "Not a form action, not persisted",
        body:
          "Every other AI-backed feature in the app follows the form → server action → db.insert → redirect/revalidate pattern. generateSpeakingPromptAction breaks that pattern deliberately: it's called directly from a 'use client' component (SpeakingPromptGenerator.tsx) inside a useTransition, and its return value just becomes local React state — nothing is written to the database. The code comment calls this out explicitly: these prompts are meant to be ephemeral and exploratory, not part of your tracked learning history. Clicking 'Another one' regenerates in place; nothing about a speaking prompt you didn't like lingers anywhere.",
      },
      {
        heading: "The theory: not every feature needs the same architecture",
        body:
          "It's tempting, once a pattern (form action → persist → redirect) is established and working well, to apply it everywhere for consistency. This module is a useful counter-example: consistency is worth less than fit. A feature whose entire point is 'ephemeral, no stakes, no history' has no business writing rows to a database table — doing so anyway would be persistence for its own sake, not because the product needs it. The general skill being taught here is recognizing which of your app's existing patterns actually applies to a new feature, rather than reflexively reusing the most recent one.",
      },
    ],
    sourceFiles: [
      "lib/actions/speaking.ts",
      "components/SpeakingPromptGenerator.tsx",
      "app/practice/page.tsx",
      "lib/ai/types.ts",
    ],
  },
  levels: {
    explain: {
      prompt:
        "Explain, in your own words, why the speaking-prompt feature doesn't follow the form-action-plus-database pattern used everywhere else in the app, and why it picks a concept randomly instead of using the recall scheduler.",
      groundTruth:
        "It's not persisted because the feature is explicitly meant to be ephemeral/exploratory (per the code comment in lib/actions/speaking.ts) — there's no learning-history value in remembering which speaking prompts you were shown, so writing them to the database would be persistence without purpose. It's called directly from a client component via useTransition into local state, not through a form. It picks a concept uniformly at random rather than via pickHeuristicConcept() because the goal is variety/low-stakes reps across everything you know, not retention-optimized targeting of stale or struggled concepts — reusing the recall heuristic would change what the feature is for.",
    },
    trace: {
      prompt:
        "Trace what happens from clicking 'Generate a prompt' to the prompt appearing on screen.",
      groundTruth:
        "SpeakingPromptGenerator.tsx's onClick calls startTransition(async () => { const res = await generateSpeakingPromptAction(); setResult(res); }). generateSpeakingPromptAction (lib/actions/speaking.ts) queries all concepts, returns an { error } object if none exist, otherwise picks one at random and calls ai.generateSpeakingPrompt({ conceptName }) — resolving through lib/ai/index.ts to OpenAIProvider.generateSpeakingPrompt, which returns a single-sentence prompt via the usual parse+zodResponseFormat pattern. The action returns { prompt, conceptName } directly (no redirect, no db write) and the component sets it as local state, rendering it in the result panel.",
    },
    modify: {
      prompt:
        "Suppose product wanted 'Practice' to start showing which concepts you've generated speaking prompts for, as a lightweight history (still not graded, just a log). Describe the smallest change that would accomplish this without turning it into a full explain-back-style feature.",
      groundTruth:
        "You'd need a new, minimal table (not reusing conceptUnderstandings or recallAttempts, which carry LLM-graded analysis this feature doesn't produce) — something like a speakingPromptLog with just conceptId and createdAt. generateSpeakingPromptAction would need one db.insert(...).run() added after generating the prompt. Critically, this wouldn't need to change it back into a form action — a server action can both return a value to the caller AND write to the database; those aren't mutually exclusive, the current code just doesn't need the second half.",
    },
    design: {
      prompt:
        "Propose one concrete improvement to the practice/speaking feature, and justify the tradeoff.",
      groundTruth:
        "Open-ended — evaluate for tradeoff-awareness. Reasonable directions: weighting the random concept pick toward ones you haven't spoken about recently (without going as far as full retention-style scheduling), letting the user optionally record and self-rate how the explanation went (reintroducing some persistence, deliberately, with a stated reason), or tighter integration with unprompted.cool so a Noesis-generated concept can seed an unprompted.cool session directly.",
    },
  },
};
