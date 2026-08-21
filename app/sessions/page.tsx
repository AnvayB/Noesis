import Link from "next/link";
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
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-full bg-zinc-900 px-3 py-1 text-xs text-white dark:bg-zinc-100 dark:text-zinc-900"
          : "rounded-full bg-black/[.04] px-3 py-1 text-xs text-zinc-600 dark:bg-white/[.08] dark:text-zinc-300"
      }
    >
      {children}
    </Link>
  );
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

  const sessions = await listAllSessions({ environmentMode, activityMode, status });

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

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-8 py-12">
        <h1 className="text-lg font-medium text-zinc-800 dark:text-zinc-100">
          Session history
        </h1>

        <div className="flex flex-col gap-3 rounded-xl border border-black/[.06] bg-white p-4 dark:border-white/[.08] dark:bg-zinc-950">
          <div className="flex flex-wrap items-center gap-3">
            <span className="w-20 shrink-0 text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-600">
              Status
            </span>
            <div className="flex flex-wrap gap-2">
              <FilterLink href={query({ status: "" })} active={!status}>
                All
              </FilterLink>
              <FilterLink
                href={query({ status: "pending" })}
                active={status === "pending"}
              >
                Pending
              </FilterLink>
              <FilterLink
                href={query({ status: "started" })}
                active={status === "started"}
              >
                Started
              </FilterLink>
              <FilterLink
                href={query({ status: "completed" })}
                active={status === "completed"}
              >
                Completed
              </FilterLink>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="w-20 shrink-0 text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-600">
              Environment
            </span>
            <div className="flex flex-wrap gap-2">
              <FilterLink
                href={query({ environment: "" })}
                active={!environmentMode}
              >
                All
              </FilterLink>
              <FilterLink
                href={query({ environment: "listen" })}
                active={environmentMode === "listen"}
              >
                Listen
              </FilterLink>
              <FilterLink
                href={query({ environment: "focus" })}
                active={environmentMode === "focus"}
              >
                Focus
              </FilterLink>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="w-20 shrink-0 text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-600">
              Activity
            </span>
            <div className="flex flex-wrap gap-2">
              <FilterLink href={query({ activity: "" })} active={!activityMode}>
                All
              </FilterLink>
              <FilterLink
                href={query({ activity: "consume" })}
                active={activityMode === "consume"}
              >
                Consume
              </FilterLink>
              <FilterLink
                href={query({ activity: "practice" })}
                active={activityMode === "practice"}
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
                      className="underline decoration-dotted"
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
