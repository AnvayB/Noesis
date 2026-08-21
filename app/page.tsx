import Link from "next/link";
import { Mindscape } from "@/components/Mindscape";
import { NavHeader } from "@/components/NavHeader";
import {
  addCuriosityItemAction,
  resolveCuriosityItemAction,
} from "@/lib/actions/curiosity";
import { startSessionAction } from "@/lib/actions/sessions";
import { submitRecallAnswerAction } from "@/lib/actions/recall";
import {
  listMindscapeConcepts,
  listMindscapeRelations,
  listOpenCuriosityItems,
  listRecentSessions,
} from "@/lib/queries";
import { getOrCreateDailyRecallPrompt } from "@/lib/recall";
import {
  CONCEPT_TAG_STYLE,
  SESSION_STATUS_LABEL,
  SESSION_STATUS_STYLE,
} from "@/lib/tagColors";

export const dynamic = "force-dynamic";

function formatDate(iso: string) {
  return new Date(iso.replace(" ", "T") + "Z").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default async function Home() {
  const [
    recentSessions,
    backlogSessions,
    curiosityItems,
    mindscapeConcepts,
    mindscapeRelations,
    pendingRecall,
  ] = await Promise.all([
    listRecentSessions(5, { excludeStatus: "pending" }),
    listRecentSessions(5, { status: "pending" }),
    listOpenCuriosityItems(),
    listMindscapeConcepts(),
    listMindscapeRelations(),
    getOrCreateDailyRecallPrompt(),
  ]);

  return (
    <div className="flex flex-1 flex-col bg-background font-sans">
      <NavHeader
        active="Home"
        right={
          <Link
            href="/sessions/new"
            className="rounded-full bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            New Session
          </Link>
        }
      />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-8 py-12">
        <section aria-label="Mindscape" className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Mindscape
            </h2>
            {mindscapeConcepts.length > 0 && (
              <Link
                href="/mindscape"
                className="text-xs text-zinc-400 hover:text-zinc-600 dark:text-zinc-600 dark:hover:text-zinc-400"
              >
                Open full view
              </Link>
            )}
          </div>
          <div className="h-80 rounded-2xl border border-black/[.06] bg-white dark:border-white/[.08] dark:bg-zinc-950">
            <Mindscape
              concepts={mindscapeConcepts}
              relations={mindscapeRelations}
              height={320}
            />
          </div>
        </section>

        <section aria-label="Backlog" className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Backlog
            </h2>
            {backlogSessions.length > 0 && (
              <Link
                href="/sessions?status=pending"
                className="text-xs text-zinc-400 hover:text-zinc-600 dark:text-zinc-600 dark:hover:text-zinc-400"
              >
                View all
              </Link>
            )}
          </div>

          {backlogSessions.length === 0 ? (
            <p className="text-sm text-zinc-400 dark:text-zinc-600">
              Nothing queued up. Add content you want to learn without
              logging it yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {backlogSessions.map((session) => (
                <li
                  key={session.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-black/[.06] bg-white px-4 py-3 text-sm dark:border-white/[.08] dark:bg-zinc-950"
                >
                  <Link href={`/sessions/${session.id}`} className="flex flex-col">
                    <span className="text-zinc-800 dark:text-zinc-100">
                      {session.title}
                    </span>
                    {session.conceptName && (
                      <span
                        className={`w-fit rounded-full px-1.5 py-0.5 text-xs ${CONCEPT_TAG_STYLE}`}
                      >
                        {session.conceptName}
                      </span>
                    )}
                  </Link>
                  <form action={startSessionAction}>
                    <input type="hidden" name="sessionId" value={session.id} />
                    <button
                      type="submit"
                      className="whitespace-nowrap rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                    >
                      Start
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>

        {pendingRecall && (
          <section
            aria-label="Quick recall"
            className="flex flex-col gap-3 rounded-2xl border border-black/[.06] bg-white p-6 dark:border-white/[.08] dark:bg-zinc-950"
          >
            <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Quick one
            </h2>
            <p className="text-sm text-zinc-700 dark:text-zinc-200">
              {pendingRecall.attempt.prompt}
            </p>
            <form action={submitRecallAnswerAction} className="flex flex-col gap-3">
              <input
                type="hidden"
                name="attemptId"
                value={pendingRecall.attempt.id}
              />
              <textarea
                name="response"
                rows={2}
                placeholder="Type what you remember, or just pick below"
                className="rounded-lg border border-black/[.08] bg-white px-3 py-2 text-sm text-zinc-800 outline-none focus:border-zinc-400 dark:border-white/[.1] dark:bg-zinc-950 dark:text-zinc-100"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  name="outcome"
                  value="remembered"
                  className="rounded-full bg-black/[.06] px-3 py-1.5 text-xs text-zinc-700 dark:bg-white/[.08] dark:text-zinc-200"
                >
                  Remembered it
                </button>
                <button
                  type="submit"
                  name="outcome"
                  value="partial"
                  className="rounded-full bg-black/[.06] px-3 py-1.5 text-xs text-zinc-700 dark:bg-white/[.08] dark:text-zinc-200"
                >
                  Sort of
                </button>
                <button
                  type="submit"
                  name="outcome"
                  value="forgot"
                  className="rounded-full bg-black/[.06] px-3 py-1.5 text-xs text-zinc-700 dark:bg-white/[.08] dark:text-zinc-200"
                >
                  Drew a blank
                </button>
              </div>
            </form>
          </section>
        )}

        <div className="grid gap-8 sm:grid-cols-2">
          <section aria-label="Recent sessions" className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Recent sessions
              </h2>
              {recentSessions.length > 0 && (
                <Link
                  href="/sessions"
                  className="text-xs text-zinc-400 hover:text-zinc-600 dark:text-zinc-600 dark:hover:text-zinc-400"
                >
                  View all
                </Link>
              )}
            </div>

            {recentSessions.length === 0 ? (
              <p className="text-sm text-zinc-400 dark:text-zinc-600">
                Nothing logged yet.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {recentSessions.map((session) => (
                  <li
                    key={session.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-black/[.06] bg-white px-4 py-3 text-sm dark:border-white/[.08] dark:bg-zinc-950"
                  >
                    <Link href={`/sessions/${session.id}`} className="flex flex-col gap-1">
                      <span className="text-zinc-800 dark:text-zinc-100">
                        {session.title}
                      </span>
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`w-fit rounded-full px-1.5 py-0.5 text-xs ${SESSION_STATUS_STYLE[session.status]}`}
                        >
                          {SESSION_STATUS_LABEL[session.status]}
                        </span>
                        {session.conceptName && (
                          <span
                            className={`w-fit rounded-full px-1.5 py-0.5 text-xs ${CONCEPT_TAG_STYLE}`}
                          >
                            {session.conceptName}
                          </span>
                        )}
                      </span>
                    </Link>
                    <span className="whitespace-nowrap text-xs text-zinc-400 dark:text-zinc-600">
                      {formatDate(session.startedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-label="Curiosity inbox" className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Curiosity inbox
            </h2>

            <form
              action={addCuriosityItemAction}
              className="flex items-center gap-2"
            >
              <input
                name="text"
                required
                placeholder="Learn about Mixture of Experts..."
                className="flex-1 rounded-lg border border-black/[.08] bg-white px-3 py-2 text-sm text-zinc-800 outline-none focus:border-zinc-400 dark:border-white/[.1] dark:bg-zinc-950 dark:text-zinc-100"
              />
              <button
                type="submit"
                className="rounded-lg bg-black/[.06] px-3 py-2 text-sm text-zinc-700 dark:bg-white/[.08] dark:text-zinc-200"
              >
                Add
              </button>
            </form>

            {curiosityItems.length === 0 ? (
              <p className="text-sm text-zinc-400 dark:text-zinc-600">
                Nothing saved yet.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {curiosityItems.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-black/[.06] bg-white px-4 py-3 text-sm text-zinc-800 dark:border-white/[.08] dark:bg-zinc-950 dark:text-zinc-100"
                  >
                    <span>{item.text}</span>
                    <span className="flex shrink-0 items-center gap-3 text-xs">
                      <Link
                        href={{
                          pathname: "/sessions/new",
                          query: { curiosityItemId: item.id, topic: item.text },
                        }}
                        className="text-zinc-400 hover:text-zinc-600 dark:text-zinc-600 dark:hover:text-zinc-400"
                      >
                        Promote
                      </Link>
                      <form action={resolveCuriosityItemAction}>
                        <input type="hidden" name="id" value={item.id} />
                        <button
                          type="submit"
                          className="text-zinc-400 hover:text-zinc-600 dark:text-zinc-600 dark:hover:text-zinc-400"
                        >
                          Dismiss
                        </button>
                      </form>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <footer className="mt-auto pt-6 text-center">
          <a
            href="/api/export"
            className="text-xs text-zinc-400 hover:text-zinc-600 dark:text-zinc-600 dark:hover:text-zinc-400"
          >
            Export database backup
          </a>
        </footer>
      </main>
    </div>
  );
}
