import { CurriculumTrackIndex } from "@/components/CurriculumTrackIndex";

export const dynamic = "force-dynamic";

export default function LearnNoesisPage() {
  return (
    <CurriculumTrackIndex
      track="noesis"
      description="A self-study curriculum on how this app is actually built. Read a module, explain it back in your own words, and see exactly where your understanding has gaps — graded against the real implementation, not a summary of it."
    />
  );
}
