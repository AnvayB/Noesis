import Link from "next/link";
import { notFound } from "next/navigation";
import { ExplainBackInput } from "@/components/ExplainBackInput";
import { NavHeader } from "@/components/NavHeader";
import { SubmitButton } from "@/components/SubmitButton";
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
  understand: "Read",
  explain: "Explain",
  trace: "Trace",
  modify: "Modify",
  design: "Design",
};

const VERDICT_WORD: Record<string, string> = {
  solid: "This held.",
  partial: "This partly held.",
  off_track: "This went off track.",
};

function formatDate(iso: string) {
  return new Date(iso.replace(" ", "T") + "Z").toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    timeZone: "America/Los_Angeles",
  });
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

  const { basePath } = CURRICULUM_TRACKS[track];
  const levels = availableLevels(curriculumModule);
  const latestByLevel = await getLatestAttempts(moduleSlug);
  const activeLevel: CurriculumLevel = levels.includes(levelParam as CurriculumLevel)
    ? (levelParam as CurriculumLevel)
    : nextIncompleteLevel(curriculumModule, latestByLevel);

  const latestForActiveLevel = latestByLevel.get(activeLevel) ?? null;
  const attemptHistory =
    activeLevel === "understand" ? [] : await getAttemptHistory(moduleSlug, activeLevel);

  return (
    <div className="flex flex-1 flex-col">
      <NavHeader
        active="Learn"
        right={
          <Link href={basePath} className="link link-soft text-sm">
            All modules
          </Link>
        }
      />

      <main className="page-enter mx-auto flex w-full max-w-2xl flex-1 flex-col gap-12 px-6 py-14 sm:px-10">
        <header className="flex flex-col gap-3">
          <p className="meta">{curriculumModule.phase}</p>
          <h1 className="title text-[34px] sm:text-[40px]">{curriculumModule.title}</h1>
          <p className="reading text-[17px] text-ink-soft">{curriculumModule.summary}</p>
        </header>

        <article className="flex flex-col gap-8">
          <p className="reading whitespace-pre-wrap">{curriculumModule.lesson.overview}</p>
          {curriculumModule.lesson.diagramId &&
            CURRICULUM_DIAGRAMS[curriculumModule.lesson.diagramId]}
          {curriculumModule.lesson.sections.map((section) => (
            <div key={section.heading} className="flex flex-col gap-3">
              <h2 className="title text-[23px]">{section.heading}</h2>
              <p className="reading whitespace-pre-wrap">{section.body}</p>
            </div>
          ))}
          {curriculumModule.lesson.sourceFiles && curriculumModule.lesson.sourceFiles.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-rule pt-6">
              <span className="meta">
                {track === "noesis" ? "Read the source alongside this" : "Reference"}
              </span>
              <ul className="flex flex-wrap gap-x-4 gap-y-1">
                {curriculumModule.lesson.sourceFiles.map((file) => (
                  <li key={file} className="font-mono text-[13px] text-ink-soft">
                    {file}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {curriculumModule.lesson.videos && curriculumModule.lesson.videos.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-rule pt-6">
              <span className="meta">Worth watching</span>
              <ul className="flex flex-col gap-1.5">
                {curriculumModule.lesson.videos.map((video) => (
                  <li key={video.url}>
                    <a
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link font-serif text-[17px]"
                    >
                      {video.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </article>

        <nav aria-label="Levels" className="flex flex-wrap gap-5 border-t border-rule pt-6">
          {levels.map((level) => (
            <Link
              key={level}
              href={`${basePath}/${moduleSlug}?level=${level}`}
              className={level === activeLevel ? "choice choice-active" : "choice"}
              aria-current={level === activeLevel ? "page" : undefined}
            >
              {LEVEL_LABELS[level]}
              {latestByLevel.has(level) && level !== activeLevel && (
                <span className="ml-1 text-ink-soft" aria-label="attempted">
                  ·
                </span>
              )}
            </Link>
          ))}
        </nav>

        {activeLevel === "understand" ? (
          <section className="sheet flex flex-col gap-5">
            <p className="reading text-[17px]">
              Read the lesson above. When it has settled, mark it read and move on to
              explaining it in your own words.
            </p>
            {latestForActiveLevel ? (
              <span className="meta text-ink">Marked as read.</span>
            ) : (
              <form action={markUnderstandCompleteAction}>
                <input type="hidden" name="moduleSlug" value={moduleSlug} />
                <button type="submit" className="btn btn-ink">
                  Mark as read
                </button>
              </form>
            )}
          </section>
        ) : (
          <div className="flex flex-col gap-12">
            <form action={submitCurriculumResponseAction} className="sheet flex flex-col gap-5">
              <input type="hidden" name="moduleSlug" value={moduleSlug} />
              <input type="hidden" name="level" value={activeLevel} />
              <div className="flex flex-col gap-2">
                <p className="question">{curriculumModule.levels[activeLevel]?.prompt}</p>
                <p className="meta">
                  {track === "noesis"
                    ? "Compared against how the code actually works, not a generic definition. Trying again is expected."
                    : "Compared against the lesson above. Trying again is expected."}
                </p>
              </div>
              <ExplainBackInput />
              <div>
                <SubmitButton pendingLabel="Reading your answer…">
                  {latestForActiveLevel ? "Try again" : "Save answer"}
                </SubmitButton>
              </div>
            </form>

            {attemptHistory.map((attempt, i) => (
              <section
                key={attempt.id}
                className="flex flex-col gap-6 border-t border-rule pt-8"
                aria-label={`Attempt from ${formatDate(attempt.createdAt)}`}
              >
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-serif text-[19px]">
                    {attempt.verdict ? VERDICT_WORD[attempt.verdict] : "Attempt"}
                  </span>
                  <span className="meta shrink-0">
                    {formatDate(attempt.createdAt)}
                    {i === 0 ? ", latest" : ""}
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="meta">What you wrote</span>
                  <p className="reading whitespace-pre-wrap text-[17px]">{attempt.userResponse}</p>
                </div>

                {attempt.whatYouGotRight.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <span className="meta">What held</span>
                    <ul className="flex flex-col gap-1.5">
                      {attempt.whatYouGotRight.map((item, j) => (
                        <li key={j} className="text-[15px] leading-relaxed">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {attempt.misconceptions.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <span className="meta">Worth correcting</span>
                    <ul className="flex flex-col gap-3">
                      {attempt.misconceptions.map((m, j) => (
                        <li key={j} className="text-[15px] leading-relaxed">
                          {m.description}
                          <span className="block text-ink-soft">{m.correction}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {attempt.gaps.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <span className="meta">What you left out</span>
                    <ul className="flex flex-col gap-1.5">
                      {attempt.gaps.map((gap, j) => (
                        <li key={j} className="text-[15px] leading-relaxed">
                          {gap}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {attempt.followUpQuestion && (
                  <p className="question">{attempt.followUpQuestion}</p>
                )}
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
