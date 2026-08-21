import Link from "next/link";
import { NavHeader } from "@/components/NavHeader";
import { CURRICULUM_TRACKS, listCurriculumPhases, type CurriculumTrack } from "@/lib/curriculum";
import { listModuleProgressSummaries } from "@/lib/curriculum/queries";
import type { CurriculumLevel, CurriculumVerdict } from "@/lib/db/schema";

const LEVEL_LABELS: Record<CurriculumLevel, string> = {
  understand: "Understand",
  explain: "Explain",
  trace: "Trace",
  modify: "Modify",
  design: "Design",
};

const verdictStyle: Record<CurriculumVerdict, string> = {
  solid: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  partial: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  off_track: "bg-black/[.04] text-zinc-500 dark:bg-white/[.08] dark:text-zinc-400",
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
    <div className="flex flex-1 flex-col bg-background font-sans">
      <NavHeader active={label} />

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-8 py-12">
        <div className="flex flex-col gap-2">
          <h1 className="text-lg font-medium text-zinc-800 dark:text-zinc-100">{label}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
        </div>

        {phases.map((phase) => (
          <section key={phase.phase} className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              {phase.phase}
            </h2>
            <ul className="flex flex-col gap-3">
              {phase.modules.map((module) => {
                const summary = summaryBySlug.get(module.slug);
                const furthestLevel = summary?.furthestLevel ?? null;
                const verdict = summary?.latestVerdict ?? null;
                return (
                  <li key={module.slug}>
                    <Link
                      href={`${basePath}/${module.slug}`}
                      className="flex flex-col gap-1.5 rounded-xl border border-black/[.06] bg-white px-5 py-4 dark:border-white/[.08] dark:bg-zinc-950"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-medium text-zinc-800 dark:text-zinc-100">
                          {module.title}
                        </span>
                        <span
                          className={
                            furthestLevel
                              ? "whitespace-nowrap rounded-full bg-black/[.04] px-2.5 py-1 text-xs text-zinc-600 dark:bg-white/[.08] dark:text-zinc-300"
                              : "whitespace-nowrap rounded-full bg-black/[.04] px-2.5 py-1 text-xs text-zinc-400 dark:bg-white/[.08] dark:text-zinc-600"
                          }
                        >
                          {furthestLevel ? LEVEL_LABELS[furthestLevel] : "Not started"}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {module.summary}
                      </p>
                      {verdict && (
                        <span
                          className={`w-fit rounded-full px-2 py-0.5 text-xs ${verdictStyle[verdict]}`}
                        >
                          {verdict.replace("_", " ")}
                        </span>
                      )}
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
