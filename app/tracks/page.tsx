import Link from "next/link";
import { LearnNav } from "@/components/LearnNav";
import { NavHeader } from "@/components/NavHeader";
import { CURRICULUM_TRACKS, listCurriculumPhases, type CurriculumTrack } from "@/lib/curriculum";
import { listModuleProgressSummaries } from "@/lib/curriculum/queries";

export const dynamic = "force-dynamic";

const DESCRIPTION: Record<CurriculumTrack, string> = {
  noesis: "How this app is built: read a module, explain it back, and be graded against the real implementation.",
  arteris: "Chips, interconnects, and the products built on them, from the basics up.",
};

export default async function TracksPage() {
  const tracks = Object.keys(CURRICULUM_TRACKS) as CurriculumTrack[];
  const rows = await Promise.all(
    tracks.map(async (track) => {
      const { label, basePath } = CURRICULUM_TRACKS[track];
      const phases = listCurriculumPhases(track);
      const modules = phases.flatMap((p) => p.modules);
      const summaries = await listModuleProgressSummaries(track);
      const touched = summaries.filter((s) => s.furthestLevel !== null).length;
      return { track, label, basePath, modules: modules.length, touched };
    }),
  );

  return (
    <div className="flex flex-1 flex-col">
      <NavHeader active="Learn" />
      <main className="page-enter mx-auto flex w-full max-w-3xl flex-1 flex-col gap-12 px-6 py-12 sm:px-10 sm:py-14">
        <div className="flex flex-col gap-5">
          <h1 className="title text-[40px]">Tracks</h1>
          <LearnNav active="Tracks" />
          <p className="reading text-[17px] text-ink-soft">
            Graded self-study. Each module is read, then explained, traced, modified, and designed,
            with feedback against a ground truth.
          </p>
        </div>
        <ul>
          {rows.map((r, i) => (
            <li key={r.track} className={`row flex flex-col gap-1 ${i === rows.length - 1 ? "row-last" : ""}`}>
              <Link href={r.basePath} className="link font-serif text-[23px]">
                {r.label}
              </Link>
              <span className="reading text-[15px] text-ink-soft">{DESCRIPTION[r.track]}</span>
              <span className="meta">
                {r.modules} modules{r.touched > 0 ? `, ${r.touched} begun` : ""}
              </span>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
