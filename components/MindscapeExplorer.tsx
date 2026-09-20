"use client";

import { useEffect, useState } from "react";
import { CLIMATES, Mindscape, type Climate } from "@/components/Mindscape";
import type { MapConcept, MapRelation } from "@/lib/mindscape/engine";

const STORAGE_KEY = "noesis-climate";

const CAPTION: Record<Climate, string> = {
  ground:
    "A colony per field, a cell per concept. Organelles are how often you came back. A filament is a connection; two colours means across fields. Dotted means the model noticed it, not you. Deeper cells came from deeper explanations.",
  grove:
    "A tree per field, a sapling where you have barely started. Branches are what you explained; a fuller canopy means you came back. A flower marks a connection you made yourself. Roots below the line link fields you have bridged.",
  sky:
    "A region per field, a star per concept. A wider halo means you came back. A line is earned between two related, explained stars. A bright bloom is rare — deep, retained, revisited. A light bridge is a connection across fields.",
};

/**
 * The map, and the choice of weather to see it in. Three renderings of one
 * history — see docs/mindscape/three-systems.md. The choice is a
 * per-viewer convenience, kept in this browser only.
 */
export function MindscapeExplorer({
  concepts,
  relations,
  seed,
  fields,
  highlightIds,
  heightClassName = "h-[calc(100dvh-9rem)] min-h-[520px]",
  caption = true,
}: {
  concepts: MapConcept[];
  relations: MapRelation[];
  seed: string;
  fields: string[];
  highlightIds?: string[];
  heightClassName?: string;
  caption?: boolean;
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

  const dark = climate === "sky";

  return (
    <div className={`relative w-full ${heightClassName}`}>
      {ready && (
        <Mindscape
          concepts={concepts}
          relations={relations}
          seed={seed}
          climate={climate}
          highlightIds={highlightIds}
          interactive
          labels
        />
      )}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center pt-5">
        <div
          className={
            dark
              ? "pointer-events-auto flex gap-1 rounded-full border border-white/15 bg-black/30 p-1 backdrop-blur-sm"
              : "pointer-events-auto flex gap-1 rounded-full border border-rule-strong bg-sheet/90 p-1 backdrop-blur-sm"
          }
        >
          {CLIMATES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => choose(c.id)}
              title={c.blurb}
              className={
                climate === c.id
                  ? `rounded-full px-4 py-1.5 text-[13px] ${dark ? "bg-[#e5e3ee] text-[#0a0e1a]" : "bg-ink text-paper"}`
                  : `rounded-full px-4 py-1.5 text-[13px] ${dark ? "text-[#b7b6c4] hover:text-white" : "text-ink-soft hover:text-ink"}`
              }
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
      {caption && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-2 px-6 pb-6 sm:px-10">
          <p className={`max-w-2xl text-[13px] leading-relaxed ${dark ? "text-[#a9a8b8]" : "meta"}`}>{CAPTION[climate]}</p>
          {fields.length > 0 && (
            <p className={`text-[13px] ${dark ? "text-[#a9a8b8]" : "meta"}`}>
              Fields: {fields.join(", ")}. Drag to move, scroll to zoom, click a mark to open the concept.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
