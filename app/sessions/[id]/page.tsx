import Link from "next/link";
import { notFound } from "next/navigation";
import { CaptureForm } from "@/components/CaptureForm";
import { ExplainBackInput } from "@/components/ExplainBackInput";
import { MarksField } from "@/components/MarksField";
import { Mindscape } from "@/components/Mindscape";
import { NavHeader } from "@/components/NavHeader";
import { ResourcePlate } from "@/components/ResourcePlate";
import { SubmitButton } from "@/components/SubmitButton";
import { retryAnalysisAction, submitExplainBackAction } from "@/lib/actions/explainBack";
import { setAsideSessionAction, startSessionAction } from "@/lib/actions/sessions";
import { getMindscapeSeed } from "@/lib/seed";
import {
  getExplainBackForSession,
  getMindscapeData,
  getReflection,
  getSessionById,
} from "@/lib/queries";
import { EXPLAIN_BACK_STATUS_LABEL } from "@/lib/tagColors";

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
const LADDER: Record<number, string> = {
  1: "You have heard of it and can say roughly what it is.",
  2: "You can follow it and restate the main idea loosely.",
  3: "You can explain the main idea correctly in your own words.",
  4: "You can explain it with its reasons and edges, and relate it to what you know.",
  5: "You could teach it, and use it somewhere new.",
};

export default async function SessionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ unread?: string; reveal?: string }>;
}) {
  const { id } = await params;
  const { unread, reveal } = await searchParams;
  const session = await getSessionById(id);
  if (!session) notFound();

  const result = await getExplainBackForSession(id);
  const reflection = result?.analysis ? await getReflection(id) : null;
  const map = reflection ? await getMindscapeData() : null;
  const seed = getMindscapeSeed();

  const when =
    session.status === "pending"
      ? `Kept on ${formatDate(session.startedAt)}`
      : session.status === "started"
        ? `In progress since ${formatDate(session.startedAt)}`
        : `Explained on ${formatDate(session.endedAt ?? session.startedAt)}`;

  const isArticle = !!session.resourceExcerpt;
  const readingPrompt = isArticle
    ? "When you have read it, explain what it said, as if to a friend who knows the basics but has not read this."
    : session.resourceUrl
      ? "When you have watched it, explain what you learned, as if to a friend who knows the basics but has not seen this."
      : "When you have found out, explain what you learned, as if to a friend who knows the basics.";

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

      <main className="page-enter mx-auto flex w-full max-w-2xl flex-1 flex-col gap-12 px-6 py-12 sm:px-10 sm:py-14">
        <header className="flex flex-col gap-4">
          <p className="meta">
            {session.status === "started" && (
              <span className="lamp-dot mr-2 align-middle" aria-hidden="true" />
            )}
            {when}.
          </p>
          <h1 className="title text-[34px] sm:text-[40px]">{session.title}</h1>
          {session.conceptSlug && (
            <p className="meta">
              On the map as{" "}
              <Link href={`/concepts/${session.conceptSlug}`} className="link">
                {session.conceptName}
              </Link>
              {session.conceptField ? `, in ${session.conceptField}.` : "."}
            </p>
          )}
        </header>

        <ResourcePlate
          type={session.resourceType ?? null}
          url={session.resourceUrl ?? null}
          title={session.resourceTitle ?? null}
          byline={session.resourceByline}
          excerpt={session.resourceExcerpt}
          wordCount={session.resourceWordCount}
          durationMinutes={session.durationMinutes ?? null}
          reader={session.status !== "completed"}
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
          <section className="flex flex-col gap-10">
            <MarksField sessionId={session.id} initial={session.notes ?? ""} />

            <form action={submitExplainBackAction} className="sheet flex flex-col gap-5" id="explain">
              <input type="hidden" name="sessionId" value={session.id} />
              <div className="flex flex-col gap-2">
                <p className="question">{readingPrompt}</p>
                <p className="meta">
                  Take your time. If it reminds you of something you already know, say so; that is
                  where the map grows most.
                </p>
              </div>
              <ExplainBackInput />
              <div className="flex flex-wrap items-center gap-4">
                <SubmitButton pendingLabel="Reading your explanation…">Save explanation</SubmitButton>
                <p className="meta">Your words are saved first; the reading happens after.</p>
              </div>
            </form>

            <form action={setAsideSessionAction} className="flex justify-end">
              <input type="hidden" name="sessionId" value={session.id} />
              <button type="submit" className="btn-quiet text-[13px]" title="Back to kept for later">
                Not now. Keep it for later.
              </button>
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
            {/* What this came to, in your own terms. */}
            {result.analysis.gist && (
              <section className="flex flex-col gap-2">
                <p className="meta">What this came to</p>
                <p className="reading text-[23px] leading-snug">{result.analysis.gist}</p>
              </section>
            )}

            {/* The map, first: this is what the time produced. */}
            {reflection && map && map.concepts.length > 0 && (
              <section aria-label="What the map did" className="flex flex-col gap-4">
                <h2 className="title text-[23px]">What the map did</h2>
                <div className="map-fade -mx-6 h-[340px] sm:-mx-10 sm:h-[400px]">
                  <Mindscape
                    concepts={map.concepts}
                    relations={map.relations}
                    seed={seed}
                    highlightIds={reflection.concepts.map((c) => c.conceptId)}
                    focusIds={reflection.concepts.map((c) => c.conceptId)}
                    reveal={!!reveal}
                    labels
                  />
                </div>
                <ul className="flex flex-col gap-2">
                  {reflection.concepts.map((c) => (
                    <li key={c.conceptId} className="text-[15px] leading-relaxed">
                      <Link href={`/concepts/${c.conceptSlug}`} className="link font-serif text-[19px]">
                        {c.conceptName}
                      </Link>
                      <span className="text-ink-soft">
                        {" "}
                        {c.isNew
                          ? `appeared for the first time${c.conceptField ? ` in ${c.conceptField}` : ""}, ${EXPLAIN_BACK_STATUS_LABEL[c.status] ?? c.status}.`
                          : c.before === c.after
                            ? `was ${EXPLAIN_BACK_STATUS_LABEL[c.status] ?? c.status}; its threads thickened, and it stays ${STANDING[c.after] ?? c.after}.`
                            : `went from ${STANDING[c.before] ?? c.before} to ${STANDING[c.after] ?? c.after}.`}
                      </span>
                    </li>
                  ))}
                  {reflection.relations.map((r, i) => {
                    const cross = r.fromField && r.toField && r.fromField !== r.toField;
                    return (
                      <li key={`r${i}`} className="text-[15px] leading-relaxed">
                        <span className="text-ink-soft">
                          {r.kind === "new"
                            ? cross
                              ? "A bridge, across fields: "
                              : "A new cord joins "
                            : "The cord between "}
                        </span>
                        <Link href={`/concepts/${r.fromSlug}`} className="link">
                          {r.fromName}
                        </Link>
                        <span className="text-ink-soft"> and </span>
                        <Link href={`/concepts/${r.toSlug}`} className="link">
                          {r.toName}
                        </Link>
                        <span className="text-ink-soft">
                          {r.kind === "new" ? (cross ? `, ${r.fromField} to ${r.toField}.` : ".") : " thickened."}
                        </span>
                      </li>
                    );
                  })}
                  {reflection.concepts.length === 0 && reflection.relations.length === 0 && (
                    <li className="meta">Nothing on the map moved this time.</li>
                  )}
                </ul>
              </section>
            )}

            {/* Where it landed, and the next step. */}
            {result.analysis.level && (
              <section className="flex flex-col gap-3 border-t border-rule pt-8">
                <div className="flex items-baseline gap-4">
                  <span className="title text-[40px] leading-none">{result.analysis.level}</span>
                  <span className="meta">of five, for {session.conceptName ?? "this"}</span>
                </div>
                <p className="reading text-[17px]">{LADDER[result.analysis.level]}</p>
                {result.analysis.nextStep && (
                  <p className="reading text-[17px] text-ink-soft">
                    <span className="text-ink">To reach {Math.min(5, result.analysis.level + 1)}:</span>{" "}
                    {result.analysis.nextStep}
                  </p>
                )}
              </section>
            )}

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

              <details className="group">
                <summary className="meta cursor-pointer list-none">
                  Your explanation{result.explainBack.inputMode === "voice" ? ", spoken" : ""}, and how it read
                  <span className="ml-1 text-ink-soft group-open:hidden">▸</span>
                </summary>
                <div className="sheet mt-4 flex flex-col gap-3">
                  <p className="reading whitespace-pre-wrap">{result.explainBack.rawText}</p>
                  <p className="meta">
                    Overall, the explanation {DEPTH_WORD[result.analysis.depth] ?? result.analysis.depth} and{" "}
                    {CLARITY_WORD[result.analysis.clarity] ?? result.analysis.clarity}.
                  </p>
                </div>
              </details>

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
