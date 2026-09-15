import Link from "next/link";
import { CaptureForm } from "@/components/CaptureForm";
import { DeleteSessionButton } from "@/components/DeleteSessionButton";
import { NavHeader } from "@/components/NavHeader";
import { startFromQuestionAction } from "@/lib/actions/capture";
import { resolveCuriosityItemAction } from "@/lib/actions/curiosity";
import { setWeeklyFocusAction } from "@/lib/actions/focus";
import { startSessionAction } from "@/lib/actions/sessions";
import {
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

export default async function LearnPage() {
  const [inProgress, kept, questions, focus] = await Promise.all([
    listRecentSessions(20, { status: "started" }),
    listRecentSessions(50, { status: "pending" }),
    listOpenCuriosityItems(),
    getWeeklyFocus(),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      <NavHeader active="Learn" />

      <main className="page-enter mx-auto flex w-full max-w-3xl flex-1 flex-col gap-14 px-6 py-14 sm:px-10">
        <section className="flex flex-col gap-6">
          <h1 className="title text-[40px]">Learn</h1>
          <CaptureForm returnTo="/learn" autoFocus />
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
                      <Link href={`/sessions/${session.id}`} className="link truncate font-serif text-[19px]">
                        {session.title}
                      </Link>
                      <span className="meta">
                        Started {formatDate(session.startedAt)}
                        {session.conceptName ? `, on ${session.conceptName}` : ""}
                        {focus?.id === session.id ? ". This week's thing." : ""}
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
                      {session.conceptName ?? ""}
                      {focus?.id === session.id ? (session.conceptName ? ". " : "") + "This week's thing." : ""}
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

        <section aria-label="Elsewhere" className="flex flex-col gap-3 border-t border-rule pt-8">
          <p className="text-[15px]">
            <Link href="/sessions" className="link">
              Everything you have learned
            </Link>
            <span className="text-ink-soft">, kept, started, or explained.</span>
          </p>
          <p className="text-[15px]">
            <Link href="/sessions/new" className="link">
              Add something with details
            </Link>
            <span className="text-ink-soft">, when a link is not enough.</span>
          </p>
          <p className="text-[15px]">
            <span className="text-ink-soft">Tracks: </span>
            <Link href="/learn-noesis" className="link">
              Learn Noesis
            </Link>
            <span className="text-ink-soft"> and </span>
            <Link href="/arteris-101" className="link">
              Arteris 101
            </Link>
            <span className="text-ink-soft">, graded self-study.</span>
          </p>
        </section>
      </main>
    </div>
  );
}
