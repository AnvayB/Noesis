import Link from "next/link";
import { notFound } from "next/navigation";
import { ExplainBackInput } from "@/components/ExplainBackInput";
import { NavHeader } from "@/components/NavHeader";
import { CURRICULUM_DIAGRAMS } from "@/components/curriculum/diagrams";
import {
  markUnderstandCompleteAction,
  submitCurriculumResponseAction,
} from "@/lib/actions/curriculum";
import { CURRICULUM_TRACKS, getCurriculumModule, type CurriculumTrack } from "@/lib/curriculum";
import {
  availableLevels,
  getAttemptHistory,
  getLatestAttempts,
  nextIncompleteLevel,
} from "@/lib/curriculum/queries";
import { type CurriculumLevel } from "@/lib/db/schema";

const LEVEL_LABELS: Record<CurriculumLevel, string> = {
  understand: "Understand",
  explain: "Explain",
  trace: "Trace",
  modify: "Modify",
  design: "Design",
};

const verdictStyle: Record<string, string> = {
  solid: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  partial: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  off_track: "bg-black/[.04] text-zinc-500 dark:bg-white/[.08] dark:text-zinc-400",
};

function formatDate(iso: string) {
  return new Date(iso.replace(" ", "T") + "Z").toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function LevelTab({
  href,
  active,
  attempted,
  children,
}: {
  href: string;
  active: boolean;
  attempted: boolean;
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
      {attempted && !active && <span className="ml-1 text-zinc-400 dark:text-zinc-500">·</span>}
    </Link>
  );
}

export async function CurriculumModuleView({
  track,
  moduleSlug,
  levelParam,
}: {
  track: CurriculumTrack;
  moduleSlug: string;
  levelParam?: string;
}) {
  const curriculumModule = getCurriculumModule(moduleSlug);
  if (!curriculumModule || curriculumModule.track !== track) notFound();

  const { label, basePath } = CURRICULUM_TRACKS[track];
  const levels = availableLevels(curriculumModule);
  const latestByLevel = await getLatestAttempts(moduleSlug);
  const activeLevel: CurriculumLevel = levels.includes(levelParam as CurriculumLevel)
    ? (levelParam as CurriculumLevel)
    : nextIncompleteLevel(curriculumModule, latestByLevel);

  const latestForActiveLevel = latestByLevel.get(activeLevel) ?? null;
  const attemptHistory =
    activeLevel === "understand" ? [] : await getAttemptHistory(moduleSlug, activeLevel);

  return (
    <div className="flex flex-1 flex-col bg-background font-sans">
      <NavHeader
        active={label}
        right={
          <Link
            href={basePath}
            className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            All modules
          </Link>
        }
      />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-8 py-12">
        <div className="flex flex-col gap-2">
          <span className="text-xs text-zinc-400 dark:text-zinc-600">{curriculumModule.phase}</span>
          <h1 className="text-lg font-medium text-zinc-800 dark:text-zinc-100">
            {curriculumModule.title}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{curriculumModule.summary}</p>
        </div>

        <section className="flex flex-col gap-5 rounded-2xl border border-black/[.06] bg-white p-6 dark:border-white/[.08] dark:bg-zinc-950">
          <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
            {curriculumModule.lesson.overview}
          </p>
          {curriculumModule.lesson.diagramId &&
            CURRICULUM_DIAGRAMS[curriculumModule.lesson.diagramId]}
          {curriculumModule.lesson.sections.map((section) => (
            <div key={section.heading} className="flex flex-col gap-1.5">
              <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                {section.heading}
              </h2>
              <p className="whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-300">
                {section.body}
              </p>
            </div>
          ))}
          {curriculumModule.lesson.sourceFiles && curriculumModule.lesson.sourceFiles.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-zinc-400 dark:text-zinc-600">
                {track === "noesis" ? "Source to read alongside this module" : "Reference"}
              </span>
              <ul className="flex flex-wrap gap-2">
                {curriculumModule.lesson.sourceFiles.map((file) => (
                  <li
                    key={file}
                    className="rounded-full bg-black/[.04] px-2.5 py-1 font-mono text-xs text-zinc-500 dark:bg-white/[.08] dark:text-zinc-400"
                  >
                    {file}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {curriculumModule.lesson.videos && curriculumModule.lesson.videos.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-zinc-400 dark:text-zinc-600">Related videos</span>
              <ul className="flex flex-col gap-1.5">
                {curriculumModule.lesson.videos.map((video) => (
                  <li key={video.url}>
                    <a
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-sky-600 hover:underline dark:text-sky-400"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="shrink-0"
                      >
                        <path d="M21.6 7.2s-.2-1.5-.8-2.2c-.8-.9-1.7-.9-2.1-1C15.9 3.8 12 3.8 12 3.8h0s-3.9 0-6.7.2c-.4 0-1.3.1-2.1 1-.6.7-.8 2.2-.8 2.2S2.2 9 2.2 10.7v1.5C2.2 14 2.4 15.7 2.4 15.7s.2 1.5.8 2.2c.8.9 1.9.9 2.4 1 1.7.2 7.4.2 7.4.2s3.9 0 6.7-.2c.4 0 1.3-.1 2.1-1 .6-.7.8-2.2.8-2.2s.2-1.7.2-3.5v-1.5c0-1.7-.2-3.5-.2-3.5zM9.9 14.6V8.4l5.4 3.1-5.4 3.1z" />
                      </svg>
                      {video.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <div className="flex flex-wrap gap-2">
          {levels.map((level) => (
            <LevelTab
              key={level}
              href={`${basePath}/${moduleSlug}?level=${level}`}
              active={level === activeLevel}
              attempted={latestByLevel.has(level)}
            >
              {LEVEL_LABELS[level]}
            </LevelTab>
          ))}
        </div>

        {activeLevel === "understand" ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-black/[.06] bg-white p-6 dark:border-white/[.08] dark:bg-zinc-950">
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              Read the lesson above, then mark it as read to move on to explaining it back
              in your own words.
            </p>
            {latestForActiveLevel ? (
              <span className="w-fit rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-700 dark:text-emerald-400">
                Marked as read
              </span>
            ) : (
              <form action={markUnderstandCompleteAction}>
                <input type="hidden" name="moduleSlug" value={moduleSlug} />
                <button
                  type="submit"
                  className="w-fit rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                >
                  Mark as read
                </button>
              </form>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <form
              action={submitCurriculumResponseAction}
              className="flex flex-col gap-3 rounded-2xl border border-black/[.06] bg-white p-6 dark:border-white/[.08] dark:bg-zinc-950"
            >
              <input type="hidden" name="moduleSlug" value={moduleSlug} />
              <input type="hidden" name="level" value={activeLevel} />
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                  {curriculumModule.levels[activeLevel]?.prompt}
                </span>
                <span className="text-xs text-zinc-400 dark:text-zinc-600">
                  {track === "noesis"
                    ? "Answers here are compared against how the code actually works, not against a generic definition — retries are expected and encouraged."
                    : "Answers here are graded against the lesson above — retries are expected and encouraged."}
                </span>
              </label>
              <ExplainBackInput />
              <div>
                <button
                  type="submit"
                  className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                >
                  {latestForActiveLevel ? "Try again" : "Submit response"}
                </button>
              </div>
            </form>

            {attemptHistory.map((attempt) => (
              <div
                key={attempt.id}
                className="flex flex-col gap-4 rounded-2xl border border-black/[.06] bg-white p-6 dark:border-white/[.08] dark:bg-zinc-950"
              >
                <div className="flex items-center justify-between gap-4">
                  {attempt.verdict && (
                    <span
                      className={`w-fit rounded-full px-2.5 py-1 text-xs ${verdictStyle[attempt.verdict]}`}
                    >
                      {attempt.verdict.replace("_", " ")}
                    </span>
                  )}
                  <span className="text-xs text-zinc-400 dark:text-zinc-600">
                    {formatDate(attempt.createdAt)}
                  </span>
                </div>

                <div>
                  <span className="text-xs text-zinc-400 dark:text-zinc-600">
                    Your response
                  </span>
                  <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
                    {attempt.userResponse}
                  </p>
                </div>

                {attempt.whatYouGotRight.length > 0 && (
                  <div>
                    <span className="text-xs text-zinc-400 dark:text-zinc-600">
                      What you got right
                    </span>
                    <ul className="list-inside list-disc text-sm text-zinc-600 dark:text-zinc-300">
                      {attempt.whatYouGotRight.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {attempt.misconceptions.length > 0 && (
                  <div>
                    <span className="text-xs text-zinc-400 dark:text-zinc-600">
                      Misconceptions
                    </span>
                    <ul className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-300">
                      {attempt.misconceptions.map((m, i) => (
                        <li key={i} className="list-inside list-disc">
                          {m.description}
                          <span className="block pl-4 text-zinc-400 dark:text-zinc-500">
                            → {m.correction}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {attempt.gaps.length > 0 && (
                  <div>
                    <span className="text-xs text-zinc-400 dark:text-zinc-600">Gaps</span>
                    <ul className="list-inside list-disc text-sm text-zinc-600 dark:text-zinc-300">
                      {attempt.gaps.map((gap, i) => (
                        <li key={i}>{gap}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {attempt.followUpQuestion && (
                  <div className="rounded-xl bg-black/[.03] p-4 text-sm text-zinc-700 dark:bg-white/[.06] dark:text-zinc-200">
                    {attempt.followUpQuestion}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
