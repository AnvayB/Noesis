import Link from "next/link";
import { CaptureForm } from "@/components/CaptureForm";
import { MindscapeExplorer } from "@/components/MindscapeExplorer";
import { NavHeader } from "@/components/NavHeader";
import { clearWeeklyFocusAction } from "@/lib/actions/focus";
import { submitRecallAnswerAction } from "@/lib/actions/recall";
import { startSessionAction } from "@/lib/actions/sessions";
import { recentGrowth } from "@/lib/knowledge";
import {
  countInbox,
  getMindscapeData,
  getWeeklyFocus,
  listRecentGists,
  listRecentSessions,
} from "@/lib/queries";
import { getOrCreateDailyRecallPrompt } from "@/lib/recall";
import { getMindscapeSeed } from "@/lib/seed";

export const dynamic = "force-dynamic";

function formatDate(iso: string) {
  return new Date(iso.replace(" ", "T") + "Z").toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    timeZone: "America/Los_Angeles",
  });
}

function daysAgo(iso: string) {
  const d = (Date.now() - new Date(iso.replace(" ", "T") + "Z").getTime()) / 86400000;
  if (d < 1) return "today";
  if (d < 2) return "yesterday";
  if (d < 7) return `${Math.floor(d)} days ago`;
  if (d < 30) return `${Math.floor(d / 7)} week${d < 14 ? "" : "s"} ago`;
  return `on ${formatDate(iso)}`;
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
  const [inProgress, kept, focus, inbox, state, gists, pendingRecall] = await Promise.all([
    listRecentSessions(5, { status: "started" }),
    listRecentSessions(3, { status: "pending" }),
    getWeeklyFocus(),
    countInbox(),
    getMindscapeData(),
    listRecentGists(4),
    safeRecall(),
  ]);

  const growth = recentGrowth(state, 14);
  const fields = [...new Set(state.concepts.map((c) => c.field).filter((f): f is string => !!f))];
  const continueList = [
    ...(focus && focus.status === "started" ? [{ ...focus, isFocus: true, conceptField: null as string | null }] : []),
    ...inProgress.filter((s) => s.id !== focus?.id).map((s) => ({ ...s, isFocus: false })),
  ];
  const highlight = growth.explained.map((c) => c.id);
  const empty = state.concepts.length === 0;

  return (
    <div className="flex flex-1 flex-col">
      <NavHeader active="Now" />

      <main className="page-enter flex flex-1 flex-col">
        {/* The map is the page's hero, not a widget floating on it. */}
        <section aria-label="Mindscape" className="relative w-full">
          <MindscapeExplorer
            concepts={state.concepts}
            relations={state.relations}
            seed={getMindscapeSeed()}
            fields={fields}
            highlightIds={highlight.slice(0, 8)}
            heightClassName="h-[70dvh] min-h-[480px] max-h-[820px]"
          />
        </section>

        <div className="mx-auto grid w-full max-w-6xl gap-14 px-6 pb-20 pt-10 sm:px-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-20">
          <div className="flex flex-col gap-14">
            {continueList.length > 0 && (
              <section aria-label="Continue" className="flex flex-col gap-3">
                <h2 className="title text-[23px]">Continue</h2>
                <ul>
                  {continueList.map((session, i) => (
                    <li
                      key={session.id}
                      className={`row flex items-center justify-between gap-4 ${i === continueList.length - 1 ? "row-last" : ""}`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="lamp-dot shrink-0" aria-hidden="true" />
                        <div className="flex min-w-0 flex-col">
                          <Link href={`/sessions/${session.id}#explain`} className="link truncate font-serif text-[19px]">
                            {session.title}
                          </Link>
                          <span className="meta">
                            Started {daysAgo(session.startedAt)}
                            {session.conceptName ? `, on ${session.conceptName}` : ""}
                            {session.isFocus ? ". This week's thing." : ""}
                          </span>
                        </div>
                      </div>
                      <Link href={`/sessions/${session.id}#explain`} className="btn btn-ink btn-sm shrink-0">
                        Continue
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {focus && focus.status !== "started" && (
              <section aria-label="This week" className="flex flex-col gap-3">
                <h2 className="title text-[23px]">This week</h2>
                <div className="row row-last flex items-center justify-between gap-4">
                  <div className="flex min-w-0 flex-col">
                    <Link href={`/sessions/${focus.id}`} className="link truncate font-serif text-[19px]">
                      {focus.title}
                    </Link>
                    <span className="meta">
                      {focus.status === "completed" ? "Explained. The week's thing is done." : "Not started yet"}
                      {focus.conceptName ? `, on ${focus.conceptName}` : ""}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {focus.status === "pending" && (
                      <form action={startSessionAction}>
                        <input type="hidden" name="sessionId" value={focus.id} />
                        <button type="submit" className="btn btn-line btn-sm">
                          Start
                        </button>
                      </form>
                    )}
                    <form action={clearWeeklyFocusAction}>
                      <button type="submit" className="btn-quiet text-[13px]" title="Choose something else">
                        Change
                      </button>
                    </form>
                  </div>
                </div>
              </section>
            )}

            {gists.length > 0 && (
              <section aria-label="Lately" className="flex flex-col gap-3">
                <h2 className="title text-[23px]">Lately</h2>
                <ul>
                  {gists.map((g, i) => (
                    <li key={g.sessionId} className={`row flex flex-col gap-1 ${i === gists.length - 1 ? "row-last" : ""}`}>
                      <Link href={`/sessions/${g.sessionId}`} className="reading text-[17px]">
                        {g.gist ?? g.sessionTitle}
                      </Link>
                      <span className="meta">
                        {daysAgo(g.at)}
                        {g.conceptName ? (
                          <>
                            , on{" "}
                            <Link href={`/concepts/${g.conceptSlug}`} className="link link-soft">
                              {g.conceptName}
                            </Link>
                          </>
                        ) : null}
                        {g.level ? `, at ${g.level} of five` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
                {(growth.relations.length > 0 || growth.bridges.length > 0) && (
                  <p className="meta">
                    {growth.bridges.length > 0
                      ? `This fortnight you bridged fields ${growth.bridges.length === 1 ? "once" : `${growth.bridges.length} times`}.`
                      : "This fortnight you drew new cords on the map."}
                  </p>
                )}
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
                  <p className="meta">Remembering is what settles a thread into ground.</p>
                </form>
              </section>
            )}

            {empty && continueList.length === 0 && (
              <section className="flex flex-col gap-4">
                <h2 className="title text-[30px]">Learn something, and watch it take shape.</h2>
                <p className="reading text-[17px] text-ink-soft">
                  Paste a video or an article. Watch or read it here. Then explain it back in your
                  own words, and the map grows where the understanding is. Come back, and it is
                  still there.
                </p>
              </section>
            )}
          </div>

          <aside aria-label="Start" className="flex flex-col gap-8 lg:pt-1">
            <div className="flex flex-col gap-5">
              <h2 className="title text-[23px]">Start something</h2>
              <CaptureForm returnTo="/" compact />
              <p className="meta">
                <Link href="/sessions/new" className="link">
                  Add with details
                </Link>
                , when you know more than a link.
              </p>
            </div>

            {(kept.length > 0 || inbox.questions > 0) && (
              <div className="flex flex-col gap-3">
                <h3 className="meta">Kept for later</h3>
                <ul>
                  {kept.map((s, i) => (
                    <li key={s.id} className={`row flex items-center justify-between gap-3 ${i === kept.length - 1 ? "row-last" : ""}`}>
                      <Link href={`/sessions/${s.id}`} className="link min-w-0 truncate font-serif text-[16px]">
                        {s.title}
                      </Link>
                      <form action={startSessionAction}>
                        <input type="hidden" name="sessionId" value={s.id} />
                        <button type="submit" className="btn btn-line btn-sm">
                          Start
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
                <p className="meta">
                  {inbox.kept > kept.length || inbox.questions > 0 ? (
                    <>
                      {inbox.kept > kept.length ? `${inbox.kept - kept.length} more kept` : ""}
                      {inbox.kept > kept.length && inbox.questions > 0 ? ", and " : ""}
                      {inbox.questions > 0 ? `${inbox.questions} open question${inbox.questions === 1 ? "" : "s"}` : ""}
                      {" in "}
                    </>
                  ) : (
                    "All of it in "
                  )}
                  <Link href="/learn" className="link">
                    Learn
                  </Link>
                  .
                </p>
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
