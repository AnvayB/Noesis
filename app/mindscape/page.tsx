import { Mindscape } from "@/components/Mindscape";
import { NavHeader } from "@/components/NavHeader";
import { listMindscapeConcepts, listMindscapeRelations } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function MindscapePage() {
  const [concepts, relations] = await Promise.all([
    listMindscapeConcepts(),
    listMindscapeRelations(),
  ]);

  return (
    <div className="flex flex-1 flex-col bg-background font-sans">
      <NavHeader active="Mindscape" />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-8 py-12">
        <h1 className="text-lg font-medium text-zinc-800 dark:text-zinc-100">
          Mindscape
        </h1>
        <div className="h-[600px] rounded-2xl border border-black/[.06] bg-white dark:border-white/[.08] dark:bg-zinc-950">
          <Mindscape concepts={concepts} relations={relations} height={600} />
        </div>
      </main>
    </div>
  );
}
