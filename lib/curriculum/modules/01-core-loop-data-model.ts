import type { CurriculumModule } from "../types";

export const coreLoopDataModel: CurriculumModule = {
  slug: "core-loop-data-model",
  track: "noesis",
  phase: "Phase 1 — Foundations",
  title: "Core Loop & Data Model",
  summary:
    "How a learning session becomes rows in SQLite, and why the app is built around a Consume → Recall → Explain → Revisit loop instead of gamified scoring.",
  lesson: {
    diagramId: "core-loop-data-model",
    overview:
      "Every screen in Noesis ultimately reads or writes a small set of Drizzle-managed SQLite tables, almost always through a Next.js server action rather than a REST API. Before touching any of that code, it helps to understand the loop the data model exists to support: Consume (read/watch/listen to something) → Recall (get occasionally, casually quizzed on it later) → Explain (put it in your own words) → Feedback (an LLM tells you what you got right and wrong) → Revisit → Retain. Everything else in the app — the tables, the AI calls, the visualization — is in service of making that loop cheap enough to actually do.",
    sections: [
      {
        heading: "Resources, sessions, and concepts",
        body:
          "A Resource is something external you learned from (a video, article, paper) — type/url/title/notes, nothing fancier. A LearningSession is one sitting: it optionally links a Resource, records an environmentMode (\"listen\" or \"focus\") and activityMode (\"consume\" or \"practice\"), a duration, and free-text notes.\n\n" +
          "A Concept is the thing actually being learned — \"Mixture of Experts,\" say — identified by a unique slug so the same idea encountered in two different sessions resolves to one row, not two. Sessions and Concepts are linked through sessionConcepts, a join table with a role (\"primary\" vs \"mentioned\"). Notably, Concept has no stored confidence score or mastery percentage — deliberately. Understanding is derived at read time from the explain-back and recall history attached to it (see deriveConceptStatusLabel in lib/queries.ts), not cached as a number that could silently drift out of sync with the evidence behind it.",
      },
      {
        heading: "Server actions, not API routes",
        body:
          "Almost every mutation in Noesis is a \"use server\" function in lib/actions/*.ts, passed directly as a form's action prop. There is no app/api/sessions route, no client-side fetch, no hand-written JSON contract for creating a session — the browser POSTs the form, Next.js serializes it straight into a server function, which awaits db.insert(...).run() (an async libSQL write via Drizzle — libSQL is a network-capable driver, so every query is a Promise, unlike the synchronous better-sqlite3 setup this app started with) and then redirect()s or revalidatePath()s.\n\n" +
          "This isn't just a style preference — it removes an entire layer (route handler, request parsing, response shaping) that would otherwise exist purely to shuttle a form's fields from browser to database. The one place Noesis does need genuine request/response semantics — app/api/export/route.ts — is exactly the one case that isn't a form submission (a file download).",
      },
      {
        heading: "The theory: why two independent mode axes",
        body:
          "environmentMode (listen/focus) and activityMode (consume/practice) are deliberately orthogonal — any combination is valid (e.g. \"focus + practice\" is deep work, \"listen + consume\" is a podcast on a walk). This is a small instance of a common design move: instead of one enum trying to capture every situation (\"deep-work-session\", \"casual-podcast-session\", ...), you decompose the situation into independent axes and let the product logic combine them. It keeps the schema small, keeps filtering (see the FilterLink UI on /sessions) compositional instead of combinatorial, and means adding a third axis later doesn't require redefining every existing value.",
      },
    ],
    sourceFiles: [
      "lib/db/schema.ts",
      "lib/actions/sessions.ts",
      "lib/db/index.ts",
      "lib/queries.ts",
    ],
  },
  levels: {
    explain: {
      prompt:
        "In your own words: how does a new learning session end up as rows in the database, and why does the app use server actions instead of a JSON API for this?",
      groundTruth:
        "app/sessions/new/page.tsx renders a form whose action is a 'use server' function in lib/actions/sessions.ts. That function reads FormData directly (no JSON parsing step), calls db.insert(learningSessions).values(...).run(), optionally resolves/creates a Concept via findOrCreateConcept and inserts a sessionConcepts row, then redirect()s to the new session. No client-side fetch/JSON API exists for this — Next.js server actions serialize the form POST straight into the server function's arguments, cutting out the route-handler layer entirely.",
    },
    trace: {
      prompt:
        "Trace what happens, file by file, from submitting the 'New Session' form to seeing that session appear on /sessions.",
      groundTruth:
        "app/sessions/new/page.tsx (form, action=createSessionAction) → lib/actions/sessions.ts createSessionAction (reads FormData, db.insert(learningSessions).values(...).run(), optional findOrCreateConcept from lib/concepts.ts + db.insert(sessionConcepts)) → redirect('/sessions') → app/sessions/page.tsx re-renders as an async Server Component, calling listAllSessions() from lib/queries.ts, which does a leftJoin across learningSessions/sessionConcepts/concepts/resources and returns rows ordered by startedAt desc.",
    },
    modify: {
      prompt:
        "Suppose a session needed to support multiple concepts, not just one primary concept. Describe what you'd actually have to change, and what's already in place.",
      groundTruth:
        "The schema already supports it — sessionConcepts is a many-to-many join table with a role column, not a single foreign key on learningSessions. The real constraint is in application code: lib/queries.ts's listRecentSessions/getSessionById do a single leftJoin against concepts assuming exactly one row per session (there's a comment in queries.ts acknowledging this: 'Phase 1 only ever links one primary concept per session, so this join can't fan out into duplicate rows yet'). You'd need to change those queries to aggregate multiple concept rows per session (group by session id, collect concepts into an array) and update the session list/detail JSX to render a list of concept pills instead of one.",
    },
    design: {
      prompt:
        "Propose one concrete improvement to how sessions and concepts are modeled or queried today, and justify the tradeoff you're making.",
      groundTruth:
        "Open-ended — evaluate for architectural soundness and tradeoff-awareness (e.g. recognizing the current one-concept-per-session assumption in lib/queries.ts, the lack of any index beyond primary keys and the unique slug on concepts, or that createdAt/startedAt/lastEncounteredAt timestamps are plain text rather than a dedicated date type in SQLite), not a single 'correct' answer.",
    },
  },
};
