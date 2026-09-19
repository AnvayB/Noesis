import Link from "next/link";
import { DeleteSessionButton } from "@/components/DeleteSessionButton";
import { FilterSelect } from "@/components/FilterSelect";
import { LearnNav } from "@/components/LearnNav";
import { NavHeader } from "@/components/NavHeader";
import { setAsideSessionAction, startSessionAction } from "@/lib/actions/sessions";
import type { LearningSessionStatus } from "@/lib/db/schema";
import { listAllSessions } from "@/lib/queries";
import { SESSION_STATUS_LABEL } from "@/lib/tagColors";

export const dynamic = "force-dynamic";

function formatDate(iso: string) {
  return new Date(iso.replace(" ", "T") + "Z").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Los_Angeles",
  });
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function Choice({ href, active, count, children }: { href: string; active: boolean; count: number; children: React.ReactNode }) {
  return (
    <Link href={href} className={active ? "choice choice-active" : "choice"}>
      {children}
      <span className="ml-1 text-ink-soft">{count}</span>
    </Link>
  );
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const status =
    params.status === "pending" || params.status === "started" || params.status === "completed"
      ? (params.status as LearningSessionStatus)
      : undefined;

  const all = await listAllSessions();
  const sessions = status ? all.filter((s) => s.status === status) : all;
  const counts = { pending: 0, started: 0, completed: 0 } as Record<LearningSessionStatus, number>;
  for (const s of all) counts[s.status]++;
  const query = (st: string) => (st ? `/sessions?status=${st}` : "/sessions");

  return (
    <div className="flex flex-1 flex-col">
      <NavHeader active="Learn" />

      <main className="page-enter mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-6 py-12 sm:px-10 sm:py-14">
        <div className="flex flex-col gap-5">
          <h1 className="title text-[40px]">History</h1>
          <LearnNav active="History" />
          <p className="meta">Every session, whether it was kept, started, or explained.</p>
        </div>

        <div className="border-y border-rule py-4">
          <div className="sm:hidden">
            <FilterSelect
              value={query(status ?? "")}
              options={[
                { href: query(""), label: "All", count: all.length },
                { href: query("pending"), label: "Kept for later", count: counts.pending },
                { href: query("started"), label: "In progress", count: counts.started },
                { href: query("completed"), label: "Explained", count: counts.completed },
              ]}
            />
          </div>
          <div className="hidden flex-wrap gap-5 sm:flex">
            <Choice href={query("")} active={!status} count={all.length}>All</Choice>
            <Choice href={query("pending")} active={status === "pending"} count={counts.pending}>Kept for later</Choice>
            <Choice href={query("started")} active={status === "started"} count={counts.started}>In progress</Choice>
            <Choice href={query("completed")} active={status === "completed"} count={counts.completed}>Explained</Choice>
          </div>
        </div>

        {sessions.length === 0 ? (
          <p className="meta">
            {status ? "Nothing in that state. Widen the filter." : "Nothing here yet. Start something and it will appear."}
          </p>
        ) : (
          <ul>
            {sessions.map((session, i) => (
              <li
                key={session.id}
                className={`row flex flex-col gap-1.5 ${i === sessions.length - 1 ? "row-last" : ""}`}
              >
                <div className="flex items-baseline justify-between gap-4">
                  <Link href={`/sessions/${session.id}`} className="link font-serif text-[21px] leading-snug">
                    {session.title}
                  </Link>
                  <span className="meta shrink-0">{formatDate(session.startedAt)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className={session.status === "started" ? "meta text-ink" : "meta"}>
                    {session.status === "started" && (
                      <span className="lamp-dot mr-2 align-middle" aria-hidden="true" />
                    )}
                    {SESSION_STATUS_LABEL[session.status]}
                  </span>
                  {session.conceptSlug && (
                    <Link href={`/concepts/${session.conceptSlug}`} className="link link-soft text-[13px]">
                      {session.conceptName}
                      {session.conceptField ? ` · ${session.conceptField}` : ""}
                    </Link>
                  )}
                  {session.resourceUrl && (
                    <a
                      href={session.resourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link link-soft text-[13px]"
                    >
                      {hostOf(session.resourceUrl)}
                    </a>
                  )}
                  <span className="ml-auto flex items-center gap-2">
                    {session.status === "pending" && (
                      <form action={startSessionAction}>
                        <input type="hidden" name="sessionId" value={session.id} />
                        <button type="submit" className="btn btn-line btn-sm">
                          Start
                        </button>
                      </form>
                    )}
                    {session.status === "started" && (
                      <form action={setAsideSessionAction}>
                        <input type="hidden" name="sessionId" value={session.id} />
                        <button type="submit" className="btn-quiet text-[13px]" title="Back to kept for later">
                          Set aside
                        </button>
                      </form>
                    )}
                    <Link
                      href={`/sessions/${session.id}/edit`}
                      aria-label={`Edit ${session.title}`}
                      title="Edit"
                      className="flex h-11 w-11 items-center justify-center text-ink-soft transition-colors hover:text-ink"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                      </svg>
                    </Link>
                    <DeleteSessionButton sessionId={session.id} sessionTitle={session.title} />
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
