import Link from "next/link";
import { notFound } from "next/navigation";
import { CaptureForm } from "@/components/CaptureForm";
import { ExplainBackInput } from "@/components/ExplainBackInput";
import { Mindscape } from "@/components/Mindscape";
import { NavHeader } from "@/components/NavHeader";
import { ResourcePlate } from "@/components/ResourcePlate";
import { SubmitButton } from "@/components/SubmitButton";
import { retryAnalysisAction, submitExplainBackAction } from "@/lib/actions/explainBack";
import { startSessionAction } from "@/lib/actions/sessions";
import {
  getExplainBackForSession,
  getReflection,
  getSessionById,
  listMindscapeConcepts,
  listMindscapeRelations,
} from "@/lib/queries";
import {
  ACTIVITY_MODE_LABEL,
  ENVIRONMENT_MODE_LABEL,
  EXPLAIN_BACK_STATUS_LABEL,
} from "@/lib/tagColors";

export const dynamic = "force-dynamic";

function formatDate(iso: string) {
  return new Date(iso.replace(" ", "T") + "Z").toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    timeZone: "America/Los_Angeles",
  });
}

const DEPTH_WORD: Record<string, string> = {
  surface: "stayed on the surface",
  solid: "held together",
  deep: "went deep",
};
const CLARITY_WORD: Record<string, string> = {
  unclear: "was hard to follow",
  reasonable: "read clearly enough",
  very_clear: "read very clearly",
};
const STANDING: Record<string, string> = {
  Encountered: "met",
  Familiar: "familiar",
  "Can Explain": "something you can explain",
  Retained: "retained",
};

export default async function SessionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ unread?: string }>;
}) {
  const { id } = await params;
  const { unread } = await searchParams;
  const session = await getSessionById(id);
  if (!session) notFound();

  const result = await getExplainBackForSession(id);
  const reflection = result?.analysis ? await getReflection(id) : null;
  const [mapConcepts, mapRelations] = reflection
    ? await Promise.all([listMindscapeConcepts(), listMindscapeRelations()])
    : [[], []];

  const when =
    session.status === "pending"
      ? `Kept on ${formatDate(session.startedAt)}`
      : session.status === "started"
        ? `In progress since ${formatDate(session.startedAt)}`
        : `Explained on ${formatDate(session.startedAt)}`;
  const how = `${ENVIRONMENT_MODE_LABEL[session.environmentMode]}, ${ACTIVITY_MODE_LABEL[session.activityMode]}`;

  return (
    <div className="flex flex-1 flex-col">
      <NavHeader
        active="Learn"
        right={
          <Link href={`/sessions/${session.id}/edit`} className="link link-soft text-sm">
            Edit
          </Link>
        }
      />

      <main className="page-enter mx-auto flex w-full max-w-2xl flex-1 flex-col gap-12 px-6 py-14 sm:px-10">
        <header className="flex flex-col gap-4">
          <p className="meta">
            {session.status === "started" && (
              <span className="lamp-dot mr-2 align-middle" aria-hidden="true" />
            )}
            {when}; {how}.
          </p>
          <h1 className="title text-[34px] sm:text-[40px]">{session.title}</h1>
          {session.conceptSlug && (
            <p className="meta">
              On the map as{" "}
              <Link href={`/concepts/${session.conceptSlug}`} className="link">
                {session.conceptName}
              </Link>
              .
            </p>
          )}
          {session.notes && (
            <p className="max-w-[60ch] text-[15px] leading-relaxed text-ink-soft">{session.notes}</p>
          )}
        </header>

        <ResourcePlate
          type={session.resourceType ?? null}
          url={session.resourceUrl ?? null}
          title={session.resourceTitle ?? null}
          durationMinutes={session.durationMinutes ?? null}
        />

        {session.status === "pending" ? (
          <section className="sheet flex flex-col gap-5">
            <p className="reading text-[17px]">
              This is kept for later. Start it when you actually begin watching or
              reading. There is nothing to log until then.
            </p>
            <form action={startSessionAction}>
              <input type="hidden" name="sessionId" value={session.id} />
              <button type="submit" className="btn btn-ink">
                Start learning
              </button>
            </form>
          </section>
        ) : !result ? (
          <section className="flex flex-col gap-4">
            <form action={submitExplainBackAction} className="sheet flex flex-col gap-5">
              <input type="hidden" name="sessionId" value={session.id} />
              <div className="flex flex-col gap-2">
                <p className="question">
                  When you are ready, explain what you learned, as if to a friend who
                  knows the basics but has not seen this.
                </p>
                <p className="meta">Take your time. Nothing here interrupts you.</p>
              </div>
              <ExplainBackInput />
              <div>
                <SubmitButton pendingLabel="Reading your explanation…">Save explanation</SubmitButton>
              </div>
            </form>
          </section>
        ) : !result.analysis ? (
          <section className="flex flex-col gap-6">
            <div className="sheet flex flex-col gap-3">
              <p className="meta">Your explanation, saved</p>
              <p className="reading whitespace-pre-wrap">{result.explainBack.rawText}</p>
            </div>
            <div className="flex flex-col gap-3">
              <p className="reading text-[17px]">
                {unread
                  ? "It is saved, but it could not be read just now. Nothing is lost."
                  : "It is saved, and has not been read yet."}
              </p>
              <form action={retryAnalysisAction}>
                <input type="hidden" name="explainBackId" value={result.explainBack.id} />
                <SubmitButton pendingLabel="Reading your explanation…">Read it now</SubmitButton>
              </form>
            </div>
          </section>
        ) : (
          <div className="flex flex-col gap-12">
            <section className="sheet flex flex-col gap-3">
              <p className="meta">
                Your explanation{result.explainBack.inputMode === "voice" ? ", spoken" : ""}
              </p>
              <p className="reading whitespace-pre-wrap">{result.explainBack.rawText}</p>
            </section>

            <section className="flex flex-col gap-10" aria-label="What came of it">
              {result.analysis.connectionsMade.length > 0 && (
                <div className="flex flex-col gap-3">
                  <h2 className="title text-[23px]">What you connected</h2>
                  <ul className="flex flex-col gap-3">
                    {result.analysis.connectionsMade.map((c, i) => (
                      <li key={i} className="reading text-[17px]">
                        <span className="font-medium">{c.from}</span> and{" "}
                        <span className="font-medium">{c.to}</span>: {c.description}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-col gap-4">
                <h2 className="title text-[23px]">What the map did</h2>
                {reflection && (
                  <ul className="flex flex-col gap-2">
                    {reflection.concepts.map((c) => (
                      <li key={c.conceptId} className="text-[15px] leading-relaxed">
                        <Link href={`/concepts/${c.conceptSlug}`} className="link font-serif text-[19px]">
                          {c.conceptName}
                        </Link>
                        <span className="text-ink-soft">
                          {" "}
                          {c.isNew
                            ? `appeared on the map for the first time, ${EXPLAIN_BACK_STATUS_LABEL[c.status] ?? c.status}.`
                            : c.before === c.after
                              ? `was ${EXPLAIN_BACK_STATUS_LABEL[c.status] ?? c.status}; it stays ${STANDING[c.after] ?? c.after}.`
                              : `went from ${STANDING[c.before] ?? c.before} to ${STANDING[c.after] ?? c.after}.`}
                        </span>
                      </li>
                    ))}
                    {reflection.relations.map((r, i) => (
                      <li key={`r${i}`} className="text-[15px] leading-relaxed">
                        <span className="text-ink-soft">
                          {r.kind === "new" ? "A new cord joins " : "The cord between "}
                        </span>
                        <Link href={`/concepts/${r.fromSlug}`} className="link">
                          {r.fromName}
                        </Link>
                        <span className="text-ink-soft"> and </span>
                        <Link href={`/concepts/${r.toSlug}`} className="link">
                          {r.toName}
                        </Link>
                        <span className="text-ink-soft">
                          {r.kind === "new" ? "." : " thickened."}
                        </span>
                      </li>
                    ))}
                    {reflection.concepts.length === 0 && reflection.relations.length === 0 && (
                      <li className="meta">Nothing on the map moved this time.</li>
                    )}
                  </ul>
                )}
                {reflection && mapConcepts.length > 0 && (
                  <div className="map-fade -mx-2 h-[320px]">
                    <Mindscape
                      concepts={mapConcepts}
                      relations={mapRelations}
                      height={320}
                      highlightIds={reflection.concepts.map((c) => c.conceptId)}
                    />
                  </div>
                )}
              </div>

              {result.analysis.omissions.length > 0 && (
                <div className="flex flex-col gap-3">
                  <h2 className="title text-[23px]">What you left out</h2>
                  <ul className="flex flex-col gap-2">
                    {result.analysis.omissions.map((o, i) => (
                      <li key={i} className="reading text-[17px]">
                        {o}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.analysis.misconceptions.length > 0 && (
                <div className="flex flex-col gap-3">
                  <h2 className="title text-[23px]">Worth correcting</h2>
                  <ul className="flex flex-col gap-2">
                    {result.analysis.misconceptions.map((m, i) => (
                      <li key={i} className="reading text-[17px]">
                        {m.description}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="meta">
                Overall, the explanation {DEPTH_WORD[result.analysis.depth] ?? result.analysis.depth} and{" "}
                {CLARITY_WORD[result.analysis.clarity] ?? result.analysis.clarity}.
              </p>

              <div className="flex flex-col gap-5 border-t border-rule pt-8">
                <h2 className="title text-[23px]">What next</h2>
                {result.analysis.followUpQuestion && (
                  <p className="question">{result.analysis.followUpQuestion}</p>
                )}
                <CaptureForm
                  returnTo="/learn"
                  compact
                  hint={false}
                  defaultValue={result.analysis.followUpQuestion ?? ""}
                />
                <p className="meta">
                  Keep the question for later, start on it now, or paste the next link.{" "}
                  <Link href="/" className="link">
                    Or go back to the map.
                  </Link>
                </p>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
