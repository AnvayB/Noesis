"use client";

import { useEffect, useState } from "react";
import { CLIMATES, Mindscape, type Climate } from "@/components/Mindscape";
import type { MapConcept, MapRelation } from "@/lib/mindscape/engine";

const STORAGE_KEY = "noesis-climate";

const CAPTION: Record<Climate, string> = {
  ground:
    "Threads are what you have explained; thicker means you came back. A cord with a bloom is a connection you made yourself; two colours means across fields. Contours are what has settled, and they never go away. A dotted reach is a question you still have.",
  grove:
    "Branches are what you have explained; thicker means you came back. A flower is a connection you made yourself. Foliage is what has settled, and it never falls. A bare, pale branch is something you once had wrong.",
  sky:
    "Stars are what you have explained; a wider halo means you came back. A line is earned between two related, explained stars. A nebula is what has settled, and it never fades. A light bridge is a connection across fields.",
};

/**
 * The full map page: the picture, and the choice of weather to see it in.
 * Three renderings of one history — see docs/mindscape/three-systems.md.
 * The choice is a per-viewer convenience, kept in this browser only.
 */
export function MindscapeExplorer({
  concepts,
  relations,
  seed,
  fields,
}: {
  concepts: MapConcept[];
  relations: MapRelation[];
  seed: string;
  fields: string[];
}) {
  const [climate, setClimate] = useState<Climate>("ground");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Reading the stored preference can only happen client-side, so a
    // one-time setState on mount is the correct pattern here, not an
    // anti-pattern (same as ThemeToggle's mount effect).
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "ground" || stored === "grove" || stored === "sky") {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setClimate(stored);
      }
    } catch {
      // localStorage unavailable — the default stands.
    }
    setReady(true);
  }, []);

  function choose(next: Climate) {
    setClimate(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // per-viewer convenience only; fine if it can't be saved.
    }
  }

  return (
    <div className="relative h-[calc(100vh-9rem)] min-h-[520px] w-full">
      {ready && (
        <Mindscape concepts={concepts} relations={relations} seed={seed} climate={climate} interactive labels />
      )}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center pt-5">
        <div className="pointer-events-auto flex gap-1 rounded-full border border-rule-strong bg-sheet/90 p-1 backdrop-blur-sm">
          {CLIMATES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => choose(c.id)}
              title={c.blurb}
              className={
                climate === c.id
                  ? "rounded-full bg-ink px-4 py-1.5 text-[13px] text-paper"
                  : "rounded-full px-4 py-1.5 text-[13px] text-ink-soft hover:text-ink"
              }
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-2 px-6 pb-6 sm:px-10">
        <p className="meta max-w-2xl">{CAPTION[climate]}</p>
        {fields.length > 0 && (
          <p className="meta">
            Fields: {fields.join(", ")}. Drag to move, scroll to zoom, click a mark to open the concept.
          </p>
        )}
      </div>
    </div>
  );
}
