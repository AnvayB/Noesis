import Link from "next/link";
import { CaptureForm } from "@/components/CaptureForm";
import { DeleteSessionButton } from "@/components/DeleteSessionButton";
import { LearnNav } from "@/components/LearnNav";
import { NavHeader } from "@/components/NavHeader";
import { startFromQuestionAction } from "@/lib/actions/capture";
import { resolveCuriosityItemAction } from "@/lib/actions/curiosity";
import { setWeeklyFocusAction } from "@/lib/actions/focus";
import { dedupeSessionsAction, startSessionAction } from "@/lib/actions/sessions";
import {
  countDuplicates,
  getWeeklyFocus,
  listOpenCuriosityItems,
  listRecentSessions,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

function formatDate(iso: string) {
  return new Date(iso.replace(" ", "T") + "Z").toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    timeZone: "America/Los_Angeles",
  });
}

const KIND_WORD: Record<string, string> = {
  youtube: "video",
  article: "article",
  paper: "paper",
  podcast: "podcast",
  doc: "documentation",
  book: "book",
};

export default async function LearnPage() {
  const [inProgress, kept, questions, focus, duplicateCount] = await Promise.all([
    listRecentSessions(20, { status: "started" }),
    listRecentSessions(50, { status: "pending" }),
    listOpenCuriosityItems(),
    getWeeklyFocus(),
    countDuplicates(),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      <NavHeader active="Learn" />

      <main className="page-enter mx-auto flex w-full max-w-3xl flex-1 flex-col gap-14 px-6 py-12 sm:px-10 sm:py-14">
        <section className="flex flex-col gap-8">
          <div className="flex flex-col gap-5">
            <h1 className="title text-[40px]">Learn</h1>
            <LearnNav active="Start" />
          </div>
          <CaptureForm returnTo="/learn" autoFocus />
          <p className="meta -mt-4">
            Or{" "}
            <Link href="/sessions/new" className="link">
              add with details
            </Link>
            : a title, a source, how you took it in, and notes, for logging a session you already did
            or keeping one for later.
          </p>
          {duplicateCount > 0 && (
            <div className="row flex items-center justify-between gap-4">
              <p className="meta">
                {duplicateCount} duplicate{duplicateCount === 1 ? "" : "s"} found below.
              </p>
              <form action={dedupeSessionsAction}>
                <button type="submit" className="btn btn-line btn-sm shrink-0">
                  Clean up
                </button>
              </form>
            </div>
          )}
        </section>

        {inProgress.length > 0 && (
          <section aria-label="In progress" className="flex flex-col gap-3">
            <h2 className="title text-[23px]">In progress</h2>
            <ul>
              {inProgress.map((session, i) => (
                <li
                  key={session.id}
                  className={`row flex items-center justify-between gap-4 ${i === inProgress.length - 1 ? "row-last" : ""}`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="lamp-dot shrink-0" aria-hidden="true" />
                    <div className="flex min-w-0 flex-col">
                      <Link href={`/sessions/${session.id}#explain`} className="link truncate font-serif text-[19px]">
                        {session.title}
                      </Link>
                      <span className="meta">
                        Started {formatDate(session.startedAt)}
                        {session.conceptName ? `, on ${session.conceptName}` : ""}
                        {focus?.id === session.id ? ". This week's thing." : ""}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <DeleteSessionButton sessionId={session.id} sessionTitle={session.title} />
                    <Link href={`/sessions/${session.id}#explain`} className="btn btn-ink btn-sm">
                      Continue
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-label="Kept for later" className="flex flex-col gap-3">
          <h2 className="title text-[23px]">Kept for later</h2>
          {kept.length === 0 ? (
            <p className="meta">Nothing kept. Paste a link above and choose Keep for later.</p>
          ) : (
            <ul>
              {kept.map((session, i) => (
                <li
                  key={session.id}
                  className={`row flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between ${i === kept.length - 1 ? "row-last" : ""}`}
                >
                  <div className="flex min-w-0 flex-col">
                    <Link href={`/sessions/${session.id}`} className="link font-serif text-[19px] leading-snug">
                      {session.title}
                    </Link>
                    <span className="meta">
                      {[
                        session.resourceType ? KIND_WORD[session.resourceType] ?? null : null,
                        session.conceptName ?? null,
                        focus?.id === session.id ? "This week's thing" : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {focus?.id !== session.id && (
                      <form action={setWeeklyFocusAction}>
                        <input type="hidden" name="sessionId" value={session.id} />
                        <button type="submit" className="btn-quiet text-[13px]">
                          This week
                        </button>
                      </form>
                    )}
                    <DeleteSessionButton sessionId={session.id} sessionTitle={session.title} />
                    <form action={startSessionAction}>
                      <input type="hidden" name="sessionId" value={session.id} />
                      <button type="submit" className="btn btn-line btn-sm">
                        Start
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-label="Questions" className="flex flex-col gap-3">
          <h2 className="title text-[23px]">Wondering about</h2>
          {questions.length === 0 ? (
            <p className="meta">No open questions. Write one above and it will wait here.</p>
          ) : (
            <ul>
              {questions.map((item, i) => (
                <li
                  key={item.id}
                  className={`row flex flex-col gap-2 ${i === questions.length - 1 ? "row-last" : ""}`}
                >
                  <span className="font-serif text-[19px] italic leading-snug">{item.text}</span>
                  <span className="flex items-center gap-4 text-sm">
                    <form action={startFromQuestionAction}>
                      <input type="hidden" name="id" value={item.id} />
                      <button type="submit" className="btn btn-line btn-sm">
                        Start on this
                      </button>
                    </form>
                    <form action={resolveCuriosityItemAction}>
                      <input type="hidden" name="id" value={item.id} />
                      <button type="submit" className="btn-quiet text-[13px]">
                        Let it go
                      </button>
                    </form>
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
