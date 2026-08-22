import Link from "next/link";
import { FilterSelect } from "@/components/FilterSelect";
import { NavHeader } from "@/components/NavHeader";
import { startSessionAction } from "@/lib/actions/sessions";
import type {
  ActivityMode,
  EnvironmentMode,
  LearningSessionStatus,
} from "@/lib/db/schema";
import { listAllSessions } from "@/lib/queries";
import {
  ACTIVITY_MODE_STYLE,
  CONCEPT_TAG_STYLE,
  ENVIRONMENT_MODE_STYLE,
  SESSION_STATUS_LABEL,
  SESSION_STATUS_STYLE,
} from "@/lib/tagColors";

export const dynamic = "force-dynamic";

function formatDate(iso: string) {
  return new Date(iso.replace(" ", "T") + "Z").toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function FilterLink({
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
    <Link
      href={href}
      className="inline-flex items-stretch overflow-hidden rounded-full text-xs"
    >
      <span
        className={
          active
            ? "px-3 py-1 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
            : "px-3 py-1 bg-black/[.04] text-zinc-600 dark:bg-white/[.08] dark:text-zinc-300"
        }
      >
        {children}
      </span>
      <span
        className={
          active
            ? "px-1.5 py-1 bg-zinc-700 text-white dark:bg-zinc-300 dark:text-zinc-900"
            : "px-1.5 py-1 bg-black/[.08] text-zinc-500 dark:bg-white/[.14] dark:text-zinc-400"
        }
      >
        {count}
      </span>
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

export default async function SessionsPage({
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

  return (
    <div className="flex flex-1 flex-col bg-background font-sans">
      <NavHeader
        active="Learn"
        right={
          <Link
            href="/sessions/new"
            className="rounded-full bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            New Session
          </Link>
        }
      />

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-12 sm:px-8">
        <h1 className="text-lg font-medium text-zinc-800 dark:text-zinc-100">
          Session history
        </h1>

        <div className="flex flex-col gap-3 rounded-xl border border-black/[.06] bg-white p-4 dark:border-white/[.08] dark:bg-zinc-950">
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
            <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-zinc-400 sm:w-20 dark:text-zinc-600">
              Status
            </span>
            <div className="sm:hidden">
              <FilterSelect
                value={query({ status: status ?? "" })}
                options={[
                  { href: query({ status: "" }), label: "All", count: statusScoped.length },
                  { href: query({ status: "pending" }), label: "Pending", count: statusCounts.pending ?? 0 },
                  { href: query({ status: "started" }), label: "Started", count: statusCounts.started ?? 0 },
                  { href: query({ status: "completed" }), label: "Completed", count: statusCounts.completed ?? 0 },
                ]}
              />
            </div>
            <div className="hidden flex-wrap gap-2 sm:flex">
              <FilterLink
                href={query({ status: "" })}
                active={!status}
                count={statusScoped.length}
              >
                All
              </FilterLink>
              <FilterLink
                href={query({ status: "pending" })}
                active={status === "pending"}
                count={statusCounts.pending ?? 0}
              >
                Pending
              </FilterLink>
              <FilterLink
                href={query({ status: "started" })}
                active={status === "started"}
                count={statusCounts.started ?? 0}
              >
                Started
              </FilterLink>
              <FilterLink
                href={query({ status: "completed" })}
                active={status === "completed"}
                count={statusCounts.completed ?? 0}
              >
                Completed
              </FilterLink>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
            <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-zinc-400 sm:w-20 dark:text-zinc-600">
              Environment
            </span>
            <div className="sm:hidden">
              <FilterSelect
                value={query({ environment: environmentMode ?? "" })}
                options={[
                  { href: query({ environment: "" }), label: "All", count: environmentScoped.length },
                  { href: query({ environment: "listen" }), label: "Listen", count: environmentCounts.listen ?? 0 },
                  { href: query({ environment: "focus" }), label: "Focus", count: environmentCounts.focus ?? 0 },
                ]}
              />
            </div>
            <div className="hidden flex-wrap gap-2 sm:flex">
              <FilterLink
                href={query({ environment: "" })}
                active={!environmentMode}
                count={environmentScoped.length}
              >
                All
              </FilterLink>
              <FilterLink
                href={query({ environment: "listen" })}
                active={environmentMode === "listen"}
                count={environmentCounts.listen ?? 0}
              >
                Listen
              </FilterLink>
              <FilterLink
                href={query({ environment: "focus" })}
                active={environmentMode === "focus"}
                count={environmentCounts.focus ?? 0}
              >
                Focus
              </FilterLink>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
            <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-zinc-400 sm:w-20 dark:text-zinc-600">
              Activity
            </span>
            <div className="sm:hidden">
              <FilterSelect
                value={query({ activity: activityMode ?? "" })}
                options={[
                  { href: query({ activity: "" }), label: "All", count: activityScoped.length },
                  { href: query({ activity: "consume" }), label: "Consume", count: activityCounts.consume ?? 0 },
                  { href: query({ activity: "practice" }), label: "Practice", count: activityCounts.practice ?? 0 },
                ]}
              />
            </div>
            <div className="hidden flex-wrap gap-2 sm:flex">
              <FilterLink
                href={query({ activity: "" })}
                active={!activityMode}
                count={activityScoped.length}
              >
                All
              </FilterLink>
              <FilterLink
                href={query({ activity: "consume" })}
                active={activityMode === "consume"}
                count={activityCounts.consume ?? 0}
              >
                Consume
              </FilterLink>
              <FilterLink
                href={query({ activity: "practice" })}
                active={activityMode === "practice"}
                count={activityCounts.practice ?? 0}
              >
                Practice
              </FilterLink>
            </div>
          </div>
        </div>

        {sessions.length === 0 ? (
          <p className="text-sm text-zinc-400 dark:text-zinc-600">
            {environmentMode || activityMode
              ? "No sessions match these filters."
              : "Nothing logged yet."}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {sessions.map((session) => (
              <li
                key={session.id}
                className="flex flex-col gap-1.5 rounded-xl border border-black/[.06] bg-white px-5 py-4 dark:border-white/[.08] dark:bg-zinc-950"
              >
                <div className="flex items-center justify-between gap-4">
                  <Link
                    href={`/sessions/${session.id}`}
                    className="font-medium text-zinc-800 dark:text-zinc-100"
                  >
                    {session.title}
                  </Link>
                  <div className="flex shrink-0 items-center gap-3">
                    <Link
                      href={`/sessions/${session.id}/edit`}
                      className="text-xs text-zinc-400 hover:text-zinc-600 dark:text-zinc-600 dark:hover:text-zinc-400"
                    >
                      Edit
                    </Link>
                    <span className="whitespace-nowrap text-xs text-zinc-400 dark:text-zinc-600">
                      {formatDate(session.startedAt)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                  <span
                    className={`rounded-full px-2 py-0.5 ${SESSION_STATUS_STYLE[session.status]}`}
                  >
                    {SESSION_STATUS_LABEL[session.status]}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 ${ENVIRONMENT_MODE_STYLE[session.environmentMode]}`}
                  >
                    {session.environmentMode}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 ${ACTIVITY_MODE_STYLE[session.activityMode]}`}
                  >
                    {session.activityMode}
                  </span>
                  {session.conceptSlug && (
                    <Link
                      href={`/concepts/${session.conceptSlug}`}
                      className={`rounded-full px-2 py-0.5 ${CONCEPT_TAG_STYLE}`}
                    >
                      {session.conceptName}
                    </Link>
                  )}
                  {session.durationMinutes != null && (
                    <span>{session.durationMinutes} min</span>
                  )}
                  {session.resourceUrl && (
                    <a
                      href={session.resourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="max-w-full break-all underline decoration-dotted"
                    >
                      {session.resourceTitle ?? "resource"}
                    </a>
                  )}
                  {session.status === "pending" && (
                    <form action={startSessionAction} className="ml-auto">
                      <input type="hidden" name="sessionId" value={session.id} />
                      <button
                        type="submit"
                        className="rounded-full bg-zinc-900 px-2.5 py-0.5 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      >
                        Start
                      </button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
