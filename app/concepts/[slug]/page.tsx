import Link from "next/link";
import { notFound } from "next/navigation";
import { NavHeader } from "@/components/NavHeader";
import {
  deriveConceptStatusLabel,
  getConceptBySlug,
  getConceptUnderstandingHistory,
  getRecallHistoryForConcept,
  getRelatedConcepts,
  getSessionsForConcept,
} from "@/lib/queries";
import type { RecallOutcome } from "@/lib/db/schema";
import {
  CONCEPT_STATUS_LABEL_STYLE,
  EXPLAIN_BACK_STATUS_STYLE,
  RECALL_OUTCOME_STYLE,
  UNDERSTANDING_CLARITY_STYLE,
  UNDERSTANDING_DEPTH_STYLE,
} from "@/lib/tagColors";

export const dynamic = "force-dynamic";

function formatDate(iso: string) {
  return new Date(iso.replace(" ", "T") + "Z").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "America/Los_Angeles",
  });
}

export default async function ConceptDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const concept = await getConceptBySlug(slug);
  if (!concept) notFound();

  const [history, related, sessions, recallHistory] = await Promise.all([
    getConceptUnderstandingHistory(concept.id),
    getRelatedConcepts(concept.id),
    getSessionsForConcept(concept.id),
    getRecallHistoryForConcept(concept.id),
  ]);
  const statusLabel = deriveConceptStatusLabel(
    history.map((h) => h.status),
    recallHistory
      .map((r) => r.outcome)
      .filter((o): o is RecallOutcome => o !== null),
  );

  return (
    <div className="flex flex-1 flex-col bg-background font-sans">
      <NavHeader />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-8 py-12">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-medium text-zinc-800 dark:text-zinc-100">
            {concept.name}
          </h1>
          <span
            className={`rounded-full px-2.5 py-1 text-xs ${CONCEPT_STATUS_LABEL_STYLE[statusLabel] ?? CONCEPT_STATUS_LABEL_STYLE.Encountered}`}
          >
            {statusLabel}
          </span>
        </div>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Explain-back history
          </h2>
          {history.length === 0 ? (
            <p className="text-sm text-zinc-400 dark:text-zinc-600">
              Not explained yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {history.map((h, i) => (
                <li
                  key={i}
                  className="flex flex-col gap-1 rounded-xl border border-black/[.06] bg-white px-4 py-3 text-sm dark:border-white/[.08] dark:bg-zinc-950"
                >
                  <div className="flex items-center justify-between text-xs text-zinc-400 dark:text-zinc-600">
                    <Link
                      href={`/sessions/${h.sessionId}`}
                      className="underline decoration-dotted"
                    >
                      {h.sessionTitle}
                    </Link>
                    <span>{formatDate(h.createdAt)}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                    <span
                      className={`rounded-full px-2 py-0.5 ${EXPLAIN_BACK_STATUS_STYLE[h.status]}`}
                    >
                      {h.status}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 ${UNDERSTANDING_DEPTH_STYLE[h.depth]}`}
                    >
                      {h.depth}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 ${UNDERSTANDING_CLARITY_STYLE[h.clarity]}`}
                    >
                      {h.clarity}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {recallHistory.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Recall history
            </h2>
            <ul className="flex flex-col gap-2">
              {recallHistory
                .filter((r) => r.outcome)
                .map((r, i) => (
                  <li
                    key={i}
                    className="flex flex-col gap-1 rounded-xl border border-black/[.06] bg-white px-4 py-3 text-sm dark:border-white/[.08] dark:bg-zinc-950"
                  >
                    <div className="flex items-center justify-between text-xs text-zinc-400 dark:text-zinc-600">
                      <span>{r.prompt}</span>
                      <span>{formatDate(r.createdAt)}</span>
                    </div>
                    <span
                      className={`w-fit rounded-full px-2 py-0.5 text-xs ${RECALL_OUTCOME_STYLE[r.outcome ?? ""]}`}
                    >
                      {r.outcome}
                    </span>
                  </li>
                ))}
            </ul>
          </section>
        )}

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Related concepts
          </h2>
          {related.length === 0 ? (
            <p className="text-sm text-zinc-400 dark:text-zinc-600">
              No connections yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {related.map((r, i) => (
                <li key={i} className="text-sm text-zinc-600 dark:text-zinc-300">
                  {r.conceptSlug ? (
                    <Link
                      href={`/concepts/${r.conceptSlug}`}
                      className="underline decoration-dotted"
                    >
                      {r.conceptName}
                    </Link>
                  ) : (
                    r.conceptName
                  )}
                  {r.description && (
                    <span className="text-zinc-400 dark:text-zinc-600">
                      {" "}
                      — {r.description}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Sessions
          </h2>
          {sessions.length === 0 ? (
            <p className="text-sm text-zinc-400 dark:text-zinc-600">None yet.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {sessions.map((s) => (
                <li key={s.id} className="text-sm">
                  <Link
                    href={`/sessions/${s.id}`}
                    className="text-zinc-600 underline decoration-dotted dark:text-zinc-300"
                  >
                    {s.title}
                  </Link>
                  <span className="ml-2 text-xs text-zinc-400 dark:text-zinc-600">
                    {formatDate(s.startedAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
