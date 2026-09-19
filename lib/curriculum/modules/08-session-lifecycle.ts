import type { CurriculumModule } from "../types";

export const sessionLifecycle: CurriculumModule = {
  slug: "session-lifecycle",
  track: "noesis",
  phase: "Phase 5 — Learning Workflow",
  title: "Session Lifecycle: Pending, Started, Completed",
  summary:
    "How a learning session went from an implicit 'always already in progress' row to an explicit three-state workflow — and how one of its three transitions was later removed on purpose.",
  lesson: {
    diagramId: "session-lifecycle-states",
    overview:
      "Originally, creating a learningSessions row meant you were already learning it — there was no way to save a reference to something you intended to consume later without it immediately counting as 'in progress'. A status column (pending/started/completed) fixed that. This module also covers a deliberate later narrowing: a manual 'mark completed without explaining' action existed for a while, and was removed outright — completion is now only ever a side effect of submitting a real explanation, never a button.",
    sections: [
      {
        heading: "One column, not a second table",
        body:
          "status lives directly on learningSessions as a NOT NULL enum column defaulting to 'started' — not a separate backlog_items table you'd promote a row out of once you begin it. The default matters specifically: every pre-existing row (and every row created through the old, still-supported 'start right now' flow) keeps its original meaning with zero backfill needed, because 'started' is exactly what an untouched row always implicitly meant before this column existed. The deeper reason it's one column on one table rather than two tables: a pending reference and a completed session are the same entity — same title, same resource, same eventual concept link — just at different points in one lifeline, so modeling it as a status transition (not a row you copy/delete between tables) means nothing ever needs to be 'promoted'.",
      },
      {
        heading: "Three transitions, one now deliberately missing",
        body:
          "Creation time: the New Session form has two submit buttons, both named status, with values \"started\" and \"pending\" — both hit the identical createSessionAction (which now shares its concept/field-suggestion and link-reading logic with the quick-capture flow via lib/actions/capture.ts, rather than duplicating it) and differ only in which button's value wins. Forward is a single db.update(...).set({ status: \"started\", startedAt: now }).run() in startSessionAction. Backward — a started session you're setting aside, not abandoning — is setAsideSessionAction, which sets status back to \"pending\" and touches nothing else; nothing about the session is lost.\n\n" +
          "There used to be a fourth action, completeSessionAction, that set status: \"completed\" directly from a button — 'mark this done without explaining it'. It's gone. The only way a session becomes 'completed' now is as a side effect inside submitExplainBackAction, when a real explanation is actually saved. This was a deliberate product decision, not a simplification for its own sake: the app's whole premise is that explaining, not consuming, is what completion should mean, and a manual shortcut past that quietly undermined it every time it was used.",
      },
      {
        heading: "The theory: promoting implicit state to an explicit column, then narrowing what can reach it",
        body:
          "Adding the status column was a common shape in growing systems: state that was informally implied by 'a row exists' eventually needs a real name once a product requirement forces a genuine third state into existence, and the fix is a real named column with a sensible default, not a workaround like a magic sentinel field. The later removal of completeSessionAction is the less common but just as important second move: once a state machine exists, it's worth periodically asking which of its legal transitions actually serve the product versus which ones exist only because they were easy to add. updateSessionAction (the full edit form) used to be able to move status in any direction, including backward out of 'completed', and had real logic dedicated to keeping endedAt in sync with whatever direction an edit moved it. Today updateSessionAction doesn't accept a status field at all — it reads the session's current status, holds it fixed, and edits everything else (title, concept, field, resource, notes). That endedAt-syncing code is still there, but with status now always equal to itself, its two branches can only ever fire on data written before this change; it's a small, honest example of a narrowing leaving behind logic that no longer has a live transition to protect. One consequence worth noticing: 'completed' is now a true one-way door in the UI — nothing lets a learner revert a completed session, on purpose.",
      },
    ],
    sourceFiles: [
      "lib/db/schema.ts",
      "lib/actions/sessions.ts",
      "lib/actions/capture.ts",
      "lib/actions/explainBack.ts",
      "app/sessions/[id]/page.tsx",
      "app/sessions/page.tsx",
      "app/page.tsx",
    ],
  },
  levels: {
    explain: {
      prompt:
        "Explain, in your own words, the three transitions a session's status can actually make today, and why updateSessionAction (the full edit form) doesn't accept a status field even though it lets you change almost everything else about a session.",
      groundTruth:
        "pending → started (startSessionAction, a one-field update plus a fresh startedAt); started → pending (setAsideSessionAction — 'not abandoned, just set aside', nothing else about the session changes); started → completed, only as a side effect of submitExplainBackAction actually saving a real explanation, never from a direct button. updateSessionAction omits status because the product decided completion should only ever mean 'I explained this' — letting a full edit silently flip status (as it used to) reopened exactly the shortcut the removal of completeSessionAction was meant to close, so the edit form now holds status fixed to whatever it already is and only lets you correct title/concept/field/resource/notes.",
    },
    trace: {
      prompt:
        "Trace what happens, end to end, from clicking 'Add to backlog' on the capture form to that same session showing as completed with a gist on the home page — including what's notably absent from this path compared to an earlier version of the app.",
      groundTruth:
        "The capture form's 'Keep for later' submits intent=keep to captureAction (lib/actions/capture.ts), which reads the link's title, suggests a concept and field, and creates the learningSessions row with status: \"pending\" via the shared createSession helper. Later, a 'Start' button (wherever the pending item is listed) posts to startSessionAction, which sets status: \"started\" and a fresh startedAt, then redirects to the session page — where, since there's no result yet, the explain form is shown directly (there is no intermediate 'mark as done without explaining' link anymore; that path was removed). Submitting a real explanation posts to submitExplainBackAction, which saves the explanation, calls the model, and only then sets status: \"completed\" and endedAt as part of the same action that recorded the analysis — never as an independent status flip. The home page's 'Lately' section (listRecentGists in lib/queries.ts) picks that row up by its most recent conceptUnderstandings.gist, which only exists because an explanation was actually submitted.",
    },
    modify: {
      prompt:
        "Suppose you wanted to let a learner reopen a completed session — to add another explanation, say, or just to revert it to in-progress. Today there is no way to do this at all. Describe the smallest change that would add one, without reintroducing the old 'mark completed without explaining' shortcut.",
      groundTruth:
        "Add a small single-purpose action, shaped like startSessionAction/setAsideSessionAction rather than like the old updateSessionAction, that only ever moves a session from \"completed\" back to \"started\" and clears endedAt — never accepts an arbitrary status value, so it can't be used to fabricate completion the way the removed action could. It would need its own button on the session detail page, shown only when status is \"completed\". The key constraint to preserve: the new action must never be able to set status to \"completed\" itself — only submitExplainBackAction should ever do that — or the whole point of the earlier removal is undone.",
    },
    design: {
      prompt:
        "Propose one concrete improvement to the session status workflow as it stands today, and justify the tradeoff.",
      groundTruth:
        "Open-ended — evaluate for tradeoff-awareness and engagement with the current, narrower state machine rather than the old four-action one. Reasonable directions: removing the now-vestigial endedAt-sync branches in updateSessionAction (dead code that can no longer fire, since status is held fixed — small cleanup, low risk, arguably worth doing purely for clarity), a status-change history/audit log, auto-surfacing 'started' sessions inactive for a long time, or weighing whether 'completed is a true one-way door' is the right call for every learner (some might genuinely want to revert a mistaken completion) against the discipline it enforces. Any proposal should engage with what completion is now supposed to mean, not just with the mechanics of the status column.",
    },
  },
};
