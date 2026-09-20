import Link from "next/link";
import { MindscapeExplorer } from "@/components/MindscapeExplorer";
import { NavHeader } from "@/components/NavHeader";
import { getMindscapeData } from "@/lib/queries";
import { getMindscapeSeed } from "@/lib/seed";

export const dynamic = "force-dynamic";

export default async function MindscapePage() {
  const state = await getMindscapeData();
  const fields = [...new Set(state.concepts.map((c) => c.field).filter((f): f is string => !!f))];

  return (
    <div className="flex flex-1 flex-col">
      <NavHeader active="Mindscape" />

      <main className="page-enter flex flex-1 flex-col">
        {state.concepts.length === 0 ? (
          <div className="mx-auto flex h-[calc(100dvh-9rem)] min-h-[520px] w-full max-w-6xl flex-col items-center justify-center gap-3 px-6">
            <p className="meta">
              <Link href="/learn" className="link">
                Start something
              </Link>{" "}
              and the first marks appear here.
            </p>
          </div>
        ) : (
          <MindscapeExplorer concepts={state.concepts} relations={state.relations} seed={getMindscapeSeed()} fields={fields} />
        )}
      </main>
    </div>
  );
}
