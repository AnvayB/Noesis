import Link from "next/link";
import { LearnNav } from "@/components/LearnNav";
import { NavHeader } from "@/components/NavHeader";
import { CURRICULUM_TRACKS, listCurriculumPhases, type CurriculumTrack } from "@/lib/curriculum";
import { listModuleProgressSummaries } from "@/lib/curriculum/queries";
import type { CurriculumLevel, CurriculumVerdict } from "@/lib/db/schema";

const LEVEL_LABELS: Record<CurriculumLevel, string> = {
  understand: "Read",
  explain: "Explained",
  trace: "Traced",
  modify: "Modified",
  design: "Designed",
};

const VERDICT_WORD: Record<CurriculumVerdict, string> = {
  solid: "last attempt held",
  partial: "last attempt partly held",
  off_track: "last attempt went off track",
};

export async function CurriculumTrackIndex({
  track,
  description,
}: {
  track: CurriculumTrack;
  description: string;
}) {
  const { label, basePath } = CURRICULUM_TRACKS[track];
  const phases = listCurriculumPhases(track);
  const summaries = await listModuleProgressSummaries(track);
  const summaryBySlug = new Map(summaries.map((s) => [s.module.slug, s]));

  return (
    <div className="flex flex-1 flex-col">
      <NavHeader active="Learn" />

      <main className="page-enter mx-auto flex w-full max-w-3xl flex-1 flex-col gap-14 px-6 py-14 sm:px-10">
        <div className="flex flex-col gap-5">
          <h1 className="title text-[40px]">{label}</h1>
          <LearnNav active="Tracks" />
          <p className="reading text-[17px] text-ink-soft">{description}</p>
        </div>

        {phases.map((phase) => (
          <section key={phase.phase} className="flex flex-col gap-3">
            <h2 className="title text-[23px]">{phase.phase}</h2>
            <ul>
              {phase.modules.map((module, i) => {
                const summary = summaryBySlug.get(module.slug);
                const furthestLevel = summary?.furthestLevel ?? null;
                const verdict = summary?.latestVerdict ?? null;
                return (
                  <li
                    key={module.slug}
                    className={`row ${i === phase.modules.length - 1 ? "row-last" : ""}`}
                  >
                    <Link href={`${basePath}/${module.slug}`} className="group flex flex-col gap-1.5">
                      <div className="flex items-baseline justify-between gap-4">
                        <span className="link font-serif text-[21px] leading-snug">
                          {module.title}
                        </span>
                        <span className={furthestLevel ? "meta shrink-0 text-ink" : "meta shrink-0"}>
                          {furthestLevel ? LEVEL_LABELS[furthestLevel] : "Not started"}
                        </span>
                      </div>
                      <p className="max-w-[62ch] text-[15px] leading-relaxed text-ink-soft">
                        {module.summary}
                      </p>
                      {verdict && <span className="meta">{VERDICT_WORD[verdict]}.</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </main>
    </div>
  );
}
