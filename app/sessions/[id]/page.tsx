import Link from "next/link";
import { notFound } from "next/navigation";
import { ExplainBackInput } from "@/components/ExplainBackInput";
import { NavHeader } from "@/components/NavHeader";
import { completeSessionAction, startSessionAction } from "@/lib/actions/sessions";
import { submitExplainBackAction } from "@/lib/actions/explainBack";
import { getExplainBackForSession, getSessionById } from "@/lib/queries";
import {
  ACTIVITY_MODE_STYLE,
  CONCEPT_TAG_STYLE,
  ENVIRONMENT_MODE_STYLE,
  EXPLAIN_BACK_STATUS_STYLE as statusStyle,
  SESSION_STATUS_LABEL,
  SESSION_STATUS_STYLE,
} from "@/lib/tagColors";

export const dynamic = "force-dynamic";

function formatDate(iso: string) {
  return new Date(iso.replace(" ", "T") + "Z").toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSessionById(id);
  if (!session) notFound();

  const result = await getExplainBackForSession(id);

  return (
    <div className="flex flex-1 flex-col bg-background font-sans">
      <NavHeader
        active="Learn"
        right={
          <div className="flex items-center gap-4">
            <Link
              href={`/sessions/${session.id}/edit`}
              className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              Edit
            </Link>
            <Link
              href="/sessions"
              className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              All sessions
            </Link>
          </div>
        }
      />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-8 py-12">
        <div className="flex flex-col gap-2">
          <h1 className="text-lg font-medium text-zinc-800 dark:text-zinc-100">
            {session.title}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span
              className={`rounded-full px-2 py-0.5 ${SESSION_STATUS_STYLE[session.status]}`}
            >
              {SESSION_STATUS_LABEL[session.status]}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 ${ENVIRONMENT_MODE_STYLE[session.environmentMode]}`}
            >
              {session.environmentMode}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 ${ACTIVITY_MODE_STYLE[session.activityMode]}`}
            >
              {session.activityMode}
            </span>
            {session.conceptSlug && (
              <Link
                href={`/concepts/${session.conceptSlug}`}
                className={`rounded-full px-2 py-0.5 underline decoration-dotted ${CONCEPT_TAG_STYLE}`}
              >
                {session.conceptName}
              </Link>
            )}
            <span>{formatDate(session.startedAt)}</span>
            {session.durationMinutes != null && <span>{session.durationMinutes} min</span>}
          </div>
          {session.resourceUrl && (
            <a
              href={session.resourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-zinc-500 underline decoration-dotted dark:text-zinc-400"
            >
              {session.resourceTitle ?? session.resourceUrl}
            </a>
          )}
          {session.notes && (
            <p className="text-sm text-zinc-600 dark:text-zinc-300">{session.notes}</p>
          )}
        </div>

        {session.status === "pending" ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-black/[.06] bg-white p-6 dark:border-white/[.08] dark:bg-zinc-950">
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              This is sitting in your backlog. Start it once you actually
              begin watching or reading — you don&apos;t need to log anything
              until then.
            </p>
            <form action={startSessionAction}>
              <input type="hidden" name="sessionId" value={session.id} />
              <button
                type="submit"
                className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
              >
                Start learning
              </button>
            </form>
          </div>
        ) : !result ? (
          <div className="flex flex-col gap-3">
            <form
              action={submitExplainBackAction}
              className="flex flex-col gap-3 rounded-2xl border border-black/[.06] bg-white p-6 dark:border-white/[.08] dark:bg-zinc-950"
            >
              <input type="hidden" name="sessionId" value={session.id} />
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                  Explain what you just learned
                </span>
                <span className="text-xs text-zinc-400 dark:text-zinc-600">
                  As if to a friend who understands the basics but hasn&apos;t seen this
                  specific topic. Take your time — nothing here interrupts you.
                </span>
              </label>
              <ExplainBackInput />
              <div>
                <button
                  type="submit"
                  className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                >
                  Submit explanation
                </button>
              </div>
            </form>
            {session.status === "started" && (
              <form action={completeSessionAction} className="self-start">
                <input type="hidden" name="sessionId" value={session.id} />
                <button
                  type="submit"
                  className="text-xs text-zinc-400 hover:text-zinc-600 dark:text-zinc-600 dark:hover:text-zinc-400"
                >
                  Mark as completed without explaining
                </button>
              </form>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="rounded-2xl border border-black/[.06] bg-white p-6 dark:border-white/[.08] dark:bg-zinc-950">
              <div className="mb-2 flex items-center gap-2">
                <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Your explanation
                </h2>
                {result.explainBack.inputMode === "voice" && (
                  <span className="rounded-full bg-black/[.04] px-2 py-0.5 text-xs text-zinc-500 dark:bg-white/[.08] dark:text-zinc-400">
                    voice
                  </span>
                )}
              </div>
              <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
                {result.explainBack.rawText}
              </p>
            </div>

            {result.analysis && (
              <div className="flex flex-col gap-4 rounded-2xl border border-black/[.06] bg-white p-6 dark:border-white/[.08] dark:bg-zinc-950">
                <div className="flex flex-wrap gap-2">
                  {result.conceptStatuses.map((c) => (
                    <Link
                      key={c.conceptId}
                      href={`/concepts/${c.conceptSlug}`}
                      className={`rounded-full px-2.5 py-1 text-xs ${statusStyle[c.status]}`}
                    >
                      {c.conceptName} · {c.status}
                    </Link>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm text-zinc-600 dark:text-zinc-300">
                  <div>
                    <span className="text-xs text-zinc-400 dark:text-zinc-600">Depth</span>
                    <p>{result.analysis.depth}</p>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-400 dark:text-zinc-600">Clarity</span>
                    <p>{result.analysis.clarity}</p>
                  </div>
                </div>

                {result.analysis.omissions.length > 0 && (
                  <div>
                    <span className="text-xs text-zinc-400 dark:text-zinc-600">
                      Omissions
                    </span>
                    <ul className="list-inside list-disc text-sm text-zinc-600 dark:text-zinc-300">
                      {result.analysis.omissions.map((o, i) => (
                        <li key={i}>{o}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.analysis.misconceptions.length > 0 && (
                  <div>
                    <span className="text-xs text-zinc-400 dark:text-zinc-600">
                      Misconceptions
                    </span>
                    <ul className="list-inside list-disc text-sm text-zinc-600 dark:text-zinc-300">
                      {result.analysis.misconceptions.map((m, i) => (
                        <li key={i}>{m.description}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.analysis.connectionsMade.length > 0 && (
                  <div>
                    <span className="text-xs text-zinc-400 dark:text-zinc-600">
                      Connections
                    </span>
                    <ul className="list-inside list-disc text-sm text-zinc-600 dark:text-zinc-300">
                      {result.analysis.connectionsMade.map((c, i) => (
                        <li key={i}>
                          {c.from} → {c.to}: {c.description}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.analysis.followUpQuestion && (
                  <div className="rounded-xl bg-black/[.03] p-4 text-sm text-zinc-700 dark:bg-white/[.06] dark:text-zinc-200">
                    {result.analysis.followUpQuestion}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
