import Link from "next/link";
import { CaptureForm } from "@/components/CaptureForm";
import { Mindscape } from "@/components/Mindscape";
import { NavHeader } from "@/components/NavHeader";
import { clearWeeklyFocusAction } from "@/lib/actions/focus";
import { submitRecallAnswerAction } from "@/lib/actions/recall";
import {
  countInbox,
  getWeeklyFocus,
  listMindscapeConcepts,
  listMindscapeRelations,
  listRecentSessions,
} from "@/lib/queries";
import { getOrCreateDailyRecallPrompt } from "@/lib/recall";

export const dynamic = "force-dynamic";

function formatDate(iso: string) {
  return new Date(iso.replace(" ", "T") + "Z").toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    timeZone: "America/Los_Angeles",
  });
}

// The recall prompt needs the model; if it is unavailable the page must
// still render, so the failure is swallowed here and the sheet is absent.
async function safeRecall() {
  try {
    return await getOrCreateDailyRecallPrompt();
  } catch (error) {
    console.error("recall prompt unavailable", error);
    return null;
  }
}

export default async function NowPage() {
  const [inProgress, focus, inbox, mindscapeConcepts, mindscapeRelations, pendingRecall] =
    await Promise.all([
      listRecentSessions(5, { status: "started" }),
      getWeeklyFocus(),
      countInbox(),
      listMindscapeConcepts(),
      listMindscapeRelations(),
      safeRecall(),
    ]);

  const focusIsInProgress = focus?.status === "started";
  const inProgressOthers = inProgress.filter((s) => s.id !== focus?.id);
  const waiting: string[] = [];
  if (inbox.kept === 1) waiting.push("one thing kept for later");
  if (inbox.kept > 1) waiting.push(`${inbox.kept} things kept for later`);
  if (inbox.questions === 1) waiting.push("one question");
  if (inbox.questions > 1) waiting.push(`${inbox.questions} questions`);

  return (
    <div className="flex flex-1 flex-col">
      <NavHeader active="Now" />

      <main className="page-enter flex flex-1 flex-col">
        {/* The map is the top of the page, not a widget on it. */}
        <section aria-label="Mindscape" className="mx-auto w-full max-w-6xl px-2 sm:px-6">
          <div className="map-fade h-[400px] sm:h-[460px]">
            <Mindscape
              concepts={mindscapeConcepts}
              relations={mindscapeRelations}
              height={460}
            />
          </div>
          <div className="-mt-4 flex items-baseline justify-between px-4">
            <p className="meta">The map so far.</p>
            {mindscapeConcepts.length > 0 && (
              <Link href="/mindscape" className="link link-soft text-sm">
                Open the map
              </Link>
            )}
          </div>
        </section>

        <div className="mx-auto grid w-full max-w-6xl gap-14 px-6 pb-20 pt-14 sm:px-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-20">
          <div className="flex flex-col gap-14">
            <section aria-label="This week" className="flex flex-col gap-3">
              <h2 className="title text-[23px]">This week</h2>
              {focus ? (
                <div className="row row-last flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    {focusIsInProgress && <span className="lamp-dot shrink-0" aria-hidden="true" />}
                    <div className="flex min-w-0 flex-col">
                      <Link href={`/sessions/${focus.id}`} className="link truncate font-serif text-[21px]">
                        {focus.title}
                      </Link>
                      <span className="meta">
                        {focus.status === "completed"
                          ? "Explained. The week's thing is done."
                          : focus.status === "started"
                            ? `In progress since ${formatDate(focus.startedAt)}`
                            : "Not started yet"}
                        {focus.conceptName ? `, on ${focus.conceptName}` : ""}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {focus.status !== "completed" && (
                      <Link href={`/sessions/${focus.id}`} className="btn btn-line btn-sm">
                        {focus.status === "started" ? "Continue" : "Start"}
                      </Link>
                    )}
                    <form action={clearWeeklyFocusAction}>
                      <button type="submit" className="btn-quiet text-[13px]" title="Choose something else">
                        Change
                      </button>
                    </form>
                  </div>
                </div>
              ) : (
                <p className="meta">
                  Nothing chosen for this week yet.{" "}
                  <Link href="/learn" className="link">
                    Pick one thing to learn
                  </Link>
                  , and it will sit here until it is explained.
                </p>
              )}
            </section>

            {inProgressOthers.length > 0 && (
              <section aria-label="In progress" className="flex flex-col gap-3">
                <h2 className="title text-[23px]">In progress</h2>
                <ul>
                  {inProgressOthers.map((session, i) => (
                    <li
                      key={session.id}
                      className={`row flex items-center justify-between gap-4 ${i === inProgressOthers.length - 1 ? "row-last" : ""}`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="lamp-dot shrink-0" aria-hidden="true" />
                        <div className="flex min-w-0 flex-col">
                          <Link href={`/sessions/${session.id}`} className="link truncate font-serif text-[19px]">
                            {session.title}
                          </Link>
                          <span className="meta">
                            Started {formatDate(session.startedAt)}
                            {session.conceptName ? `, on ${session.conceptName}` : ""}
                          </span>
                        </div>
                      </div>
                      <Link href={`/sessions/${session.id}`} className="btn btn-line btn-sm shrink-0">
                        Continue
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {pendingRecall && (
              <section aria-label="Quick recall" className="sheet flex flex-col gap-5">
                <p className="meta">Do you still remember this?</p>
                <p className="question">{pendingRecall.attempt.prompt}</p>
                <form action={submitRecallAnswerAction} className="flex flex-col gap-4">
                  <input type="hidden" name="attemptId" value={pendingRecall.attempt.id} />
                  <textarea
                    name="response"
                    rows={2}
                    placeholder="Say what comes back, or just answer below"
                    className="field"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button type="submit" name="outcome" value="remembered" className="btn btn-line btn-sm">
                      I remember
                    </button>
                    <button type="submit" name="outcome" value="partial" className="btn btn-line btn-sm">
                      Partly
                    </button>
                    <button type="submit" name="outcome" value="forgot" className="btn btn-line btn-sm">
                      It&apos;s gone
                    </button>
                  </div>
                </form>
              </section>
            )}
          </div>

          <aside aria-label="Capture" className="flex flex-col gap-6 lg:pt-1">
            <h2 className="title text-[23px]">Something new</h2>
            <CaptureForm returnTo="/" compact />
            <p className="meta">
              {waiting.length > 0 ? (
                <>
                  {waiting.join(" and ")} waiting in{" "}
                  <Link href="/learn" className="link">
                    Learn
                  </Link>
                  .
                </>
              ) : (
                <>
                  Nothing waiting. Whatever you keep here shows up in{" "}
                  <Link href="/learn" className="link">
                    Learn
                  </Link>
                  .
                </>
              )}
            </p>
          </aside>
        </div>

        <footer className="mx-auto w-full max-w-6xl px-6 pb-10 sm:px-10">
          <a href="/api/export" className="link link-soft text-[13px]">
            Download a backup of everything
          </a>
        </footer>
      </main>
    </div>
  );
}
