import type { CurriculumModule } from "../types";

export const recallRetention: CurriculumModule = {
  slug: "recall-retention",
  track: "noesis",
  phase: "Phase 3 — Knowledge & Memory",
  title: "Recall & Retention",
  summary:
    "The heuristic (not spaced-repetition) scheduler behind the daily casual quiz question, and the idempotency guard that keeps it to one LLM call a day.",
  lesson: {
    overview:
      "Noesis quizzes you casually, once a day at most, on something you've previously explained — not a formal spaced-repetition system like Anki, but a much simpler heuristic. This module covers lib/recall.ts's scheduling logic and the idempotency pattern that keeps a page visited constantly from generating unbounded LLM calls.",
    sections: [
      {
        heading: "Picking what to ask about",
        body:
          "pickHeuristicConcept() in lib/recall.ts only considers concepts that have been explained at least once (quizzing on something merely 'encountered' wouldn't be a fair recall test). For each eligible concept it computes a score = daysSince(lastReviewedAt ?? lastEncounteredAt) + a flat +14 'struggle bonus' if that concept has ever had a non-'correct' explain-back status or a 'forgot'/'partial' recall outcome. The highest-scoring concept wins — so recency dominates in general, but a concept you've previously struggled with jumps the queue by roughly two weeks' worth of staleness.",
      },
      {
        heading: "One question a day, idempotently",
        body:
          "getOrCreateDailyRecallPrompt() is called directly from the dashboard's server component on every load of '/' — so it has to be safe to call constantly. It first checks for any existing unanswered recallAttempts row (outcome IS NULL) and returns that if found. Only if none exists does it check whether the most recent attempt (answered or not) was created today; if so, it returns null (nothing new today) rather than generating another. Only past both of those checks does it call ai.generateRecallQuestion(...) and insert a new row. The two checks together are the idempotency guard: a pending question is always resumed, and at most one new question is ever generated per day, regardless of how many times the dashboard is loaded.",
      },
      {
        heading: "The theory: heuristic scheduling vs. spaced repetition",
        body:
          "Formal spaced-repetition systems (SM-2, as used by Anki, or the Leitner box system) maintain a per-item 'ease factor' and compute a precise next-review date designed to hit a target recall probability, adjusted after every single review based on how well you did. That's real complexity: state per item, a tuned forgetting-curve model, and UI for grading recall quality on a scale. Noesis's heuristic is a deliberate simplification of that idea, not an accidental omission of it — daysSince(...) + struggleBonus captures the two things that actually matter most (how long since you touched it, and whether it's historically been shaky) without needing calibrated ease factors or an explicit forgetting-curve model. The general lesson: a good heuristic that captures 80% of the signal a formal algorithm would, at a fraction of the implementation and UI cost, is very often the right call for a V1 — and the code should say so explicitly when it's a deliberate simplification, not silently.",
      },
    ],
    sourceFiles: ["lib/recall.ts", "lib/actions/recall.ts", "lib/queries.ts"],
  },
  levels: {
    explain: {
      prompt:
        "Explain, in your own words, how Noesis decides what to quiz you on, and why it never generates more than one new question per day even if you reload the dashboard repeatedly.",
      groundTruth:
        "pickHeuristicConcept() scores every concept that's been explained at least once by days-since-last-touched, plus a flat +14 bonus if it's ever been gotten wrong/partial (either in an explain-back status or a recall outcome) — highest score wins. getOrCreateDailyRecallPrompt() enforces the once-a-day limit with two checks before ever calling the LLM: return any already-pending (unanswered) question first, and if none is pending, bail out without generating if the most recent attempt (of any outcome) was already created today.",
    },
    trace: {
      prompt:
        "Trace what happens, from loading the home page to a new recall question appearing (on a day when one hasn't been generated yet).",
      groundTruth:
        "app/page.tsx (home dashboard) calls getOrCreateDailyRecallPrompt() from lib/recall.ts. It queries recallAttempts for an unanswered row (none found) and for the most recent row overall (not from today), so it proceeds: pickHeuristicConcept() queries all concepts plus explainBackConcepts statuses and recallAttempts outcomes, scores eligible concepts, and returns the top one. getOrCreateDailyRecallPrompt then calls ai.generateRecallQuestion({ conceptName, lastUnderstandingSummary: null, daysSinceReviewed }), inserts a new recallAttempts row with the returned question/expectedKeyPoints, re-selects and returns it as a PendingRecall for the dashboard to render.",
    },
    modify: {
      prompt:
        "Suppose you wanted to actually implement SM-2-style spaced repetition instead of the current heuristic. Describe what would have to change.",
      groundTruth:
        "You'd need new per-concept state that doesn't exist today — an ease factor and a computed next-review date/interval — likely new columns on concepts or a new table, since recallAttempts currently only records what happened, not when the next attempt should be scheduled. pickHeuristicConcept()'s score-and-pick-highest approach would be replaced by a query for 'concepts whose next-review date has passed', and submitRecallAnswerAction (lib/actions/recall.ts) would need to update the ease factor and recompute the next interval based on the outcome, rather than just setting lastReviewedAt to now the way it does today. This is a meaningfully larger change than the heuristic — it's the concrete cost referenced in the lesson's theory section.",
    },
    design: {
      prompt:
        "Propose one concrete improvement to the recall/retention system, and justify the tradeoff.",
      groundTruth:
        "Open-ended — evaluate for tradeoff-awareness. Reasonable directions: letting lastUnderstandingSummary (currently always passed as null to generateRecallQuestion) actually carry the most recent explain-back's summary so recall questions can be more targeted, allowing more than one recall question per day with a cap, or surfacing why a particular concept was chosen (recency vs. struggle bonus) in the UI for transparency.",
    },
  },
};
