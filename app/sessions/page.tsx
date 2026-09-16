import Link from "next/link";
import { DeleteSessionButton } from "@/components/DeleteSessionButton";
import { FilterSelect } from "@/components/FilterSelect";
import { NavHeader } from "@/components/NavHeader";
import { completeSessionAction, startSessionAction } from "@/lib/actions/sessions";
import type {
  ActivityMode,
  EnvironmentMode,
  LearningSessionStatus,
} from "@/lib/db/schema";
import { listAllSessions } from "@/lib/queries";
import {
  ACTIVITY_MODE_LABEL,
  ENVIRONMENT_MODE_LABEL,
  SESSION_STATUS_LABEL,
} from "@/lib/tagColors";

export const dynamic = "force-dynamic";

function formatDate(iso: string) {
  return new Date(iso.replace(" ", "T") + "Z").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
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

function Choice({
  href,
  active,
  count,
  children,
}: {
  href: string;
  active: boolean;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={active ? "choice choice-active" : "choice"}>
      {children}
      <span className="ml-1 text-ink-soft">{count}</span>
    </Link>
  );
}

function tally<T extends string>(rows: T[]): Record<T, number> {
  const counts = {} as Record<T, number>;
  for (const value of rows) {
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return counts;
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    environment?: string;
    activity?: string;
    status?: string;
  }>;
}) {
  const params = await searchParams;
  const environmentMode =
    params.environment === "listen" || params.environment === "focus"
      ? (params.environment as EnvironmentMode)
      : undefined;
  const activityMode =
    params.activity === "consume" || params.activity === "practice"
      ? (params.activity as ActivityMode)
      : undefined;
  const status =
    params.status === "pending" ||
    params.status === "started" ||
    params.status === "completed"
      ? (params.status as LearningSessionStatus)
      : undefined;

  const [sessions, statusScoped, environmentScoped, activityScoped] =
    await Promise.all([
      listAllSessions({ environmentMode, activityMode, status }),
      listAllSessions({ environmentMode, activityMode }),
      listAllSessions({ status, activityMode }),
      listAllSessions({ status, environmentMode }),
    ]);

  const statusCounts = tally(statusScoped.map((s) => s.status));
  const environmentCounts = tally(environmentScoped.map((s) => s.environmentMode));
  const activityCounts = tally(activityScoped.map((s) => s.activityMode));

  const query = (overrides: {
    environment?: string;
    activity?: string;
    status?: string;
  }) => {
    const next = new URLSearchParams();
    const env = overrides.environment ?? params.environment;
    const act = overrides.activity ?? params.activity;
    const st = overrides.status ?? params.status;
    if (env) next.set("environment", env);
    if (act) next.set("activity", act);
    if (st) next.set("status", st);
    const qs = next.toString();
    return qs ? `/sessions?${qs}` : "/sessions";
  };

  const filtered = !!(environmentMode || activityMode || status);

  return (
    <div className="flex flex-1 flex-col">
      <NavHeader
        active="Learn"
        right={
          <Link href="/learn" className="link link-soft text-sm">
            Back to Learn
          </Link>
        }
      />

      <main className="page-enter mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-6 py-14 sm:px-10">
        <div className="flex flex-col gap-2">
          <h1 className="title text-[40px]">Everything you have learned</h1>
          <p className="meta">Every session, whether it was kept, started, or explained.</p>
        </div>

        <div className="flex flex-col gap-3 border-y border-rule py-4">
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-baseline sm:gap-5">
            <span className="meta w-24 shrink-0">State</span>
            <div className="sm:hidden">
              <FilterSelect
                value={query({ status: status ?? "" })}
                options={[
                  { href: query({ status: "" }), label: "All", count: statusScoped.length },
                  { href: query({ status: "pending" }), label: "Kept for later", count: statusCounts.pending ?? 0 },
                  { href: query({ status: "started" }), label: "In progress", count: statusCounts.started ?? 0 },
                  { href: query({ status: "completed" }), label: "Explained", count: statusCounts.completed ?? 0 },
                ]}
              />
            </div>
            <div className="hidden flex-wrap gap-5 sm:flex">
              <Choice href={query({ status: "" })} active={!status} count={statusScoped.length}>All</Choice>
              <Choice href={query({ status: "pending" })} active={status === "pending"} count={statusCounts.pending ?? 0}>Kept for later</Choice>
              <Choice href={query({ status: "started" })} active={status === "started"} count={statusCounts.started ?? 0}>In progress</Choice>
              <Choice href={query({ status: "completed" })} active={status === "completed"} count={statusCounts.completed ?? 0}>Explained</Choice>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-baseline sm:gap-5">
            <span className="meta w-24 shrink-0">Attention</span>
            <div className="sm:hidden">
              <FilterSelect
                value={query({ environment: environmentMode ?? "" })}
                options={[
                  { href: query({ environment: "" }), label: "Either", count: environmentScoped.length },
                  { href: query({ environment: "listen" }), label: "Listening", count: environmentCounts.listen ?? 0 },
                  { href: query({ environment: "focus" }), label: "Focused", count: environmentCounts.focus ?? 0 },
                ]}
              />
            </div>
            <div className="hidden flex-wrap gap-5 sm:flex">
              <Choice href={query({ environment: "" })} active={!environmentMode} count={environmentScoped.length}>Either</Choice>
              <Choice href={query({ environment: "listen" })} active={environmentMode === "listen"} count={environmentCounts.listen ?? 0}>Listening</Choice>
              <Choice href={query({ environment: "focus" })} active={environmentMode === "focus"} count={environmentCounts.focus ?? 0}>Focused</Choice>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-baseline sm:gap-5">
            <span className="meta w-24 shrink-0">Doing</span>
            <div className="sm:hidden">
              <FilterSelect
                value={query({ activity: activityMode ?? "" })}
                options={[
                  { href: query({ activity: "" }), label: "Either", count: activityScoped.length },
                  { href: query({ activity: "consume" }), label: "Taking in", count: activityCounts.consume ?? 0 },
                  { href: query({ activity: "practice" }), label: "Practising", count: activityCounts.practice ?? 0 },
                ]}
              />
            </div>
            <div className="hidden flex-wrap gap-5 sm:flex">
              <Choice href={query({ activity: "" })} active={!activityMode} count={activityScoped.length}>Either</Choice>
              <Choice href={query({ activity: "consume" })} active={activityMode === "consume"} count={activityCounts.consume ?? 0}>Taking in</Choice>
              <Choice href={query({ activity: "practice" })} active={activityMode === "practice"} count={activityCounts.practice ?? 0}>Practising</Choice>
            </div>
          </div>
        </div>

        {sessions.length === 0 ? (
          <p className="meta">
            {filtered ? "Nothing matches that. Widen the filters." : "Nothing here yet. Start something and it will appear."}
          </p>
        ) : (
          <ul>
            {sessions.map((session, i) => {
              const words = [SESSION_STATUS_LABEL[session.status]];
              words.push(
                `${ENVIRONMENT_MODE_LABEL[session.environmentMode]}, ${ACTIVITY_MODE_LABEL[session.activityMode]}`,
              );
              if (session.durationMinutes != null) words.push(`${session.durationMinutes} minutes`);
              return (
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
                      {words.join("; ")}
                    </span>
                    {session.conceptSlug && (
                      <Link href={`/concepts/${session.conceptSlug}`} className="link link-soft text-[13px]">
                        {session.conceptName}
                      </Link>
                    )}
                    {session.resourceUrl && (
                      <a
                        href={session.resourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link link-soft text-[13px]"
                      >
                        {session.resourceTitle ?? hostOf(session.resourceUrl)}
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
                        <form action={completeSessionAction}>
                          <input type="hidden" name="sessionId" value={session.id} />
                          <button type="submit" className="btn-quiet text-[13px]" title="Close it without an explanation">
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
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.25}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-4 w-4"
                          aria-hidden="true"
                        >
                          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                        </svg>
                      </Link>
                      <DeleteSessionButton sessionId={session.id} sessionTitle={session.title} />
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
