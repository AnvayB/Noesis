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
    <div className="flex flex-1 flex-col">
      <NavHeader active="Mindscape" />

      <main className="page-enter flex flex-1 flex-col">
        <div className="mx-auto w-full max-w-6xl flex-1 px-2 sm:px-6">
          <div className="h-[calc(100vh-12rem)] min-h-[480px]">
            <Mindscape concepts={concepts} relations={relations} height={720} />
          </div>
        </div>
        <p className="meta mx-auto w-full max-w-6xl px-6 pb-10 sm:px-10">
          Threads are what you have explained. Cords are what you have connected.
          Contours are what has stayed. The glow is what you touched this fortnight.
        </p>
      </main>
    </div>
  );
}
