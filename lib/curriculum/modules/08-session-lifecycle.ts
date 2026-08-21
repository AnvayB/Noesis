import type { CurriculumModule } from "../types";

export const sessionLifecycle: CurriculumModule = {
  slug: "session-lifecycle",
  phase: "Phase 5 — Learning Workflow",
  title: "Session Lifecycle: Pending, Started, Completed",
  summary:
    "How a learning session went from an implicit 'always already in progress' row to an explicit three-state workflow with its own transitions — and what had to change to support it.",
  lesson: {
    overview:
      "Originally, creating a learningSessions row meant you were already learning it — there was no way to save a reference to something you intended to consume later without it immediately counting as 'in progress'. This module covers the migration that added a status column (pending/started/completed) and the three narrow, single-purpose actions that move a session between those states.",
    sections: [
      {
        heading: "One column, not a second table",
        body:
          "status lives directly on learningSessions as a NOT NULL enum column defaulting to 'started' — not a separate backlog_items table you'd promote a row out of once you begin it. The default matters specifically: every pre-existing row (and every row created through the old, still-supported 'start right now' flow) keeps its original meaning with zero backfill needed, because 'started' is exactly what an untouched row always implicitly meant before this column existed. The deeper reason it's one column on one table rather than two tables: a pending reference and a completed session are the same entity — same title, same resource, same eventual concept link — just at different points in one lifeline, so modeling it as a status transition (not a row you copy/delete between tables) means nothing ever needs to be 'promoted'.",
      },
      {
        heading: "Three surfaces, one field",
        body:
          "Creation time: the New Session form has two submit buttons, both named status, with values \"started\" and \"pending\" — both hit the identical createSessionAction and identical validation, differing only in which button's value wins as the submitted field, so 'Start now' and 'Add to backlog' are the same code path with one branch. Two tiny one-field transitions: startSessionAction and completeSessionAction are each a single db.update(...).set({status: ...}) plus a redirect — completeSessionAction additionally stamps endedAt. Full editability: updateSessionAction is the one action that has to actively maintain an invariant the other two get for free by construction — since an edit can move status in any direction (including backward, out of 'completed'), it explicitly sets endedAt the first time status becomes 'completed' and clears it back to null if status moves to anything else, rather than assuming completion is a one-way door the way the dedicated startSessionAction/completeSessionAction actions can safely assume.",
      },
      {
        heading: "The theory: promoting implicit state to an explicit column",
        body:
          "This is a common shape in growing systems: state that was informally implied by 'a row exists' or by a combination of nullable fields eventually needs a real name once a product requirement forces a genuine third state into existence. Before this change, 'session exists' *meant* 'in progress' — a fact nowhere written down as data, just an assumption every reader of the table shared. The moment a backlog became a real feature, that assumption broke, and the fix wasn't a workaround (like a magic sentinel resourceId or an ad hoc null-notes convention) — it was promoting the implicit state to an explicit, named enum column with its own default and its own set of legal transitions. The payoff shows up everywhere a session's state is read: the sessions-list filters, the homepage's separate Backlog vs. Recent sessions sections, the pending-only inline Start button, and the detail page's three-way branch (pending → 'Start learning' prompt; started/no explain-back yet → the explain form; explained → results) all key off one unambiguous field instead of each independently re-deriving 'is this actually pending?' from some combination of timestamps.",
      },
    ],
    sourceFiles: [
      "lib/db/schema.ts",
      "lib/actions/sessions.ts",
      "app/sessions/[id]/page.tsx",
      "app/sessions/page.tsx",
      "app/page.tsx",
    ],
  },
  levels: {
    explain: {
      prompt:
        "Explain, in your own words, why status lives as one column on learningSessions rather than a separate backlog table, and what invariant updateSessionAction has to actively maintain that startSessionAction and completeSessionAction don't.",
      groundTruth:
        "One column because a pending reference and a completed session are the same entity across its lifetime (same resource/concept, just a different point in one lifeline) — modeling it as a status transition avoids ever needing to move a row between tables. updateSessionAction has to keep endedAt in sync in both directions (set it the first time status newly becomes 'completed', clear it back to null if status moves away from 'completed') because a full edit can move status any direction; startSessionAction and completeSessionAction don't need that logic because each only ever makes one specific one-way transition, so the invariant holds automatically by construction.",
    },
    trace: {
      prompt:
        "Trace what happens, end to end, from clicking 'Add to backlog' on the New Session form to that same session later showing the explain-back form after clicking 'Start' from the homepage.",
      groundTruth:
        "The New Session form's 'Add to backlog' button submits status=pending (both buttons share the same createSessionAction, differing only by which submit button's name=\"status\" value fires); createSessionAction inserts the learningSessions row with status: \"pending\" and redirects to /sessions?status=pending instead of the session detail page. Later, the homepage's Backlog section (built from listRecentSessions(5, { status: \"pending\" })) renders that row with an inline form posting to startSessionAction, which runs a single db.update(learningSessions).set({ status: \"started\" })...run() and redirects to /sessions/[id]. The detail page (app/sessions/[id]/page.tsx) re-fetches the session, sees status !== \"pending\" and no existing explain-back result, and renders the 'Explain what you just learned' form instead of the earlier 'Start learning' prompt.",
    },
    modify: {
      prompt:
        "Suppose you wanted a one-click 'Revert to Started' action directly on the session detail page for a completed session, without routing through the full edit form. Describe the smallest change.",
      groundTruth:
        "Add a small form/button (similar to the existing 'Mark as completed without explaining' link) that posts to a new single-purpose action — mirroring startSessionAction/completeSessionAction's shape — that sets status: \"started\" and endedAt: null in one db.update(...).run() call, then redirects back to the session detail page. This reuses the exact endedAt-clearing behavior updateSessionAction already has for the 'moved away from completed' case, just packaged as its own narrow action instead of requiring a trip through the full edit form.",
    },
    design: {
      prompt:
        "Propose one concrete improvement to the session status workflow, and justify the tradeoff.",
      groundTruth:
        "Open-ended — evaluate for tradeoff-awareness. Reasonable directions: a status-change history/audit log (when did this session actually move pending→started→completed, useful for noticing 'add to backlog' items that sit untouched for months), auto-flagging or surfacing 'started' sessions that have been inactive for a long time, or showing time-spent-per-status as a lightweight personal metric. Any proposal should weigh the extra schema/write complexity against what it actually buys the learner.",
    },
  },
};
