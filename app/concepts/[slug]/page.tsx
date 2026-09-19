import Link from "next/link";
import { notFound } from "next/navigation";
import { NavHeader } from "@/components/NavHeader";
import { SpeakingPromptGenerator } from "@/components/SpeakingPromptGenerator";
import {
  deriveConceptStatusLabel,
  getConceptBySlug,
  getConceptUnderstandingHistory,
  getRecallHistoryForConcept,
  getRelatedConcepts,
  getSessionsForConcept,
} from "@/lib/queries";
import type { RecallOutcome } from "@/lib/db/schema";
import { EXPLAIN_BACK_STATUS_LABEL, RECALL_OUTCOME_LABEL } from "@/lib/tagColors";

export const dynamic = "force-dynamic";

function formatDate(iso: string) {
  return new Date(iso.replace(" ", "T") + "Z").toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    timeZone: "America/Los_Angeles",
  });
}

const STATUS_SENTENCE: Record<string, string> = {
  Retained: "This has stayed with you.",
  "Can Explain": "You can explain this.",
  Familiar: "You are getting to know this.",
  Encountered: "You have met this, but not explained it yet.",
};

const DEPTH_WORD: Record<string, string> = {
  surface: "on the surface",
  solid: "solidly",
  deep: "in depth",
};

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
    history.map((h) => ({ at: h.createdAt, status: h.status })),
    recallHistory
      .filter((r): r is typeof r & { outcome: RecallOutcome; answeredAt: string } => r.outcome !== null && r.answeredAt !== null)
      .map((r) => ({ at: r.answeredAt, outcome: r.outcome })),
  );
  const answered = recallHistory.filter((r) => r.outcome);

  return (
    <div className="flex flex-1 flex-col">
      <NavHeader active="Mindscape" />

      <main className="page-enter mx-auto flex w-full max-w-2xl flex-1 flex-col gap-12 px-6 py-14 sm:px-10">
        <header className="flex flex-col gap-3">
          <p className="meta">On the map{concept.field ? `, in ${concept.field}` : ""}</p>
          <h1 className="title text-[44px] sm:text-[52px]">{concept.name}</h1>
          <p className="reading text-[17px] text-ink-soft">
            {STATUS_SENTENCE[statusLabel] ?? STATUS_SENTENCE.Encountered}
          </p>
        </header>

        <section className="flex flex-col gap-3">
          <h2 className="title text-[23px]">How you have explained it</h2>
          {history.length === 0 ? (
            <p className="meta">Not yet. The first explanation gives it threads.</p>
          ) : (
            <ul>
              {history.map((h, i) => (
                <li
                  key={i}
                  className={`row flex flex-col gap-1 ${i === history.length - 1 ? "row-last" : ""}`}
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <Link href={`/sessions/${h.sessionId}`} className="link font-serif text-[19px]">
                      {h.sessionTitle}
                    </Link>
                    <span className="meta shrink-0">{formatDate(h.createdAt)}</span>
                  </div>
                  <span className="meta">
                    {EXPLAIN_BACK_STATUS_LABEL[h.status] ?? h.status}, {DEPTH_WORD[h.depth] ?? h.depth}
                    {h.level ? `, at ${h.level} of five` : ""}
                  </span>
                  {h.gist && <span className="reading text-[15px] text-ink-soft">{h.gist}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>

        {answered.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="title text-[23px]">When it was asked back</h2>
            <ul>
              {answered.map((r, i) => (
                <li
                  key={i}
                  className={`row flex flex-col gap-1 ${i === answered.length - 1 ? "row-last" : ""}`}
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="font-serif text-[17px] italic">{r.prompt}</span>
                    <span className="meta shrink-0">{formatDate(r.createdAt)}</span>
                  </div>
                  <span className="meta">
                    You {RECALL_OUTCOME_LABEL[r.outcome ?? ""] ?? r.outcome}.
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="flex flex-col gap-3">
          <h2 className="title text-[23px]">Connected to</h2>
          {related.length === 0 ? (
            <p className="meta">Nothing yet. Connections appear when an explanation makes one.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {related.map((r, i) => (
                <li key={i} className="text-[15px] leading-relaxed">
                  {r.conceptSlug ? (
                    <Link href={`/concepts/${r.conceptSlug}`} className="link font-serif text-[19px]">
                      {r.conceptName}
                    </Link>
                  ) : (
                    <span className="font-serif text-[19px]">{r.conceptName}</span>
                  )}
                  {r.description && <span className="text-ink-soft"> {r.description}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>

        {history.length > 0 && (
          <section className="sheet flex flex-col gap-4">
            <p className="meta">Say it out loud</p>
            <p className="reading text-[17px]">
              Explaining to no one in particular still counts. Ask for a prompt and answer it
              without looking anything up.
            </p>
            <SpeakingPromptGenerator conceptId={concept.id} />
          </section>
        )}

        <section className="flex flex-col gap-3">
          <h2 className="title text-[23px]">Sessions</h2>
          {sessions.length === 0 ? (
            <p className="meta">None yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {sessions.map((s) => (
                <li key={s.id} className="flex items-baseline gap-3 text-[15px]">
                  <Link href={`/sessions/${s.id}`} className="link">
                    {s.title}
                  </Link>
                  <span className="meta">{formatDate(s.startedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
