"use client";

import { useEffect, useMemo } from "react";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import { saveConceptLayoutAction } from "@/lib/actions/mindscape";
import type { MindscapeConcept } from "@/lib/queries";

export interface MindscapeRelationInput {
  fromConceptId: string;
  toConceptId: string;
  strength: number;
}

interface Node extends SimulationNodeDatum {
  id: string;
  name: string;
  slug: string;
  statusLabel: string;
  opacity: number;
  radius: number;
}

type LinkDatum = SimulationLinkDatum<Node> & { strength: number };

const WIDTH = 800;

// Deterministic stand-in for Math.random(), seeded by concept id, so the
// initial scatter position for a not-yet-laid-out node is stable across
// re-renders (useMemo must stay pure — no Math.random() inside it).
function pseudoRandom(seed: string) {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 10000) / 10000;
}

function daysSince(iso: string) {
  const then = new Date(iso.replace(" ", "T") + "Z").getTime();
  return (Date.now() - then) / (1000 * 60 * 60 * 24);
}

// Bigger + more defined the better a concept is understood — mirrors the
// visual grammar in plan section G (border/fill by status, fade by recency).
function radiusFor(statusLabel: string) {
  if (statusLabel === "Retained") return 12;
  if (statusLabel === "Can Explain") return 10;
  if (statusLabel === "Familiar") return 7;
  return 5;
}

function opacityFor(concept: MindscapeConcept) {
  const days = daysSince(concept.lastReviewedAt ?? concept.lastEncounteredAt);
  const opacity = Math.max(0.35, 1 - days / 60);
  // Rounded to day-level precision on purpose: Date.now() is called once
  // during SSR and again at client hydration, moments apart — without
  // rounding, the resulting float differs between the two passes and React
  // flags a hydration mismatch even though the value is "the same" fade.
  return Math.round(opacity * 100) / 100;
}

function nodeClassName(statusLabel: string) {
  if (statusLabel === "Retained") {
    return "fill-sky-400/60 stroke-sky-500 dark:fill-sky-500/40 dark:stroke-sky-400";
  }
  if (statusLabel === "Can Explain") {
    return "fill-emerald-400/60 stroke-emerald-500 dark:fill-emerald-500/40 dark:stroke-emerald-400";
  }
  if (statusLabel === "Familiar") {
    return "fill-amber-300/50 stroke-amber-500 dark:fill-amber-500/30 dark:stroke-amber-400";
  }
  return "fill-zinc-300/40 stroke-zinc-400 dark:fill-zinc-600/30 dark:stroke-zinc-500";
}

// "Retained" gets a visibly thicker ring per plan section G ("structure
// becomes permanent/stable"); everything else stays a thin outline.
function strokeWidthFor(statusLabel: string) {
  return statusLabel === "Retained" ? 3 : 1.5;
}

function dashFor(statusLabel: string) {
  if (statusLabel === "Encountered") return "2 2";
  if (statusLabel === "Familiar") return "4 2";
  return undefined;
}

export function Mindscape({
  concepts,
  relations,
  height = 400,
}: {
  concepts: MindscapeConcept[];
  relations: MindscapeRelationInput[];
  height?: number;
}) {
  // Pure(ish) derivation of render state from props — a useMemo, not
  // useState+effect, since nodes/links are just a function of the inputs.
  // The one real side effect (persisting settled positions) is a separate
  // effect below, keyed off the memoized result.
  const { nodes, links } = useMemo(() => {
    if (concepts.length === 0) {
      return { nodes: [] as Node[], links: [] as LinkDatum[] };
    }

    const nodeData: Node[] = concepts.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      statusLabel: c.statusLabel,
      opacity: opacityFor(c),
      radius: radiusFor(c.statusLabel),
      x: c.layoutX ?? WIDTH / 2 + (pseudoRandom(c.id + "x") - 0.5) * 120,
      y: c.layoutY ?? height / 2 + (pseudoRandom(c.id + "y") - 0.5) * 120,
    }));

    const nodeIds = new Set(nodeData.map((n) => n.id));
    const linkData: LinkDatum[] = relations
      .filter((r) => nodeIds.has(r.fromConceptId) && nodeIds.has(r.toConceptId))
      .map((r) => ({
        source: r.fromConceptId,
        target: r.toConceptId,
        strength: r.strength,
      }));

    const simulation = forceSimulation(nodeData)
      .force("charge", forceManyBody().strength(-140))
      .force(
        "link",
        forceLink<Node, LinkDatum>(linkData)
          .id((d) => d.id)
          .distance(90),
      )
      .force("center", forceCenter(WIDTH / 2, height / 2))
      .force(
        "collide",
        forceCollide<Node>((d) => d.radius + 14),
      )
      .stop();

    // Advance to a settled state synchronously rather than animating tick by
    // tick — calmer, "landscape" feel rather than a bouncy live simulation.
    simulation.tick(200);
    return { nodes: nodeData, links: linkData };
  }, [concepts, relations, height]);

  useEffect(() => {
    if (nodes.length === 0) return;
    saveConceptLayoutAction(
      nodes.map((n) => ({ id: n.id, x: n.x ?? 0, y: n.y ?? 0 })),
    ).catch(() => {
      // Best-effort cache — a failed write just means next visit re-settles.
    });
  }, [nodes]);

  if (concepts.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-400 dark:text-zinc-600">
        Your knowledge landscape will grow here as you learn.
      </div>
    );
  }

  return (
    <svg viewBox={`0 0 ${WIDTH} ${height}`} className="h-full w-full">
      <g>
        {links.map((l, i) => {
          const source = typeof l.source === "object" ? l.source : undefined;
          const target = typeof l.target === "object" ? l.target : undefined;
          if (!source || !target) return null;
          return (
            <line
              key={i}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              stroke="currentColor"
              strokeOpacity={0.15}
              strokeWidth={Math.min(1 + l.strength * 0.6, 4)}
              className="text-zinc-400 dark:text-zinc-600"
            />
          );
        })}
      </g>
      <g>
        {nodes.map((n) => (
          <g key={n.id} opacity={n.opacity}>
            {/* SVG's own <a>, not next/link — next/link renders an HTML <a>,
                which isn't valid nested inside SVG shape elements. */}
            <a href={`/concepts/${n.slug}`} className="cursor-pointer">
              <circle
                cx={n.x}
                cy={n.y}
                r={n.radius}
                strokeWidth={strokeWidthFor(n.statusLabel)}
                strokeDasharray={dashFor(n.statusLabel)}
                className={nodeClassName(n.statusLabel)}
              />
              <text
                x={n.x}
                y={(n.y ?? 0) + n.radius + 12}
                textAnchor="middle"
                className="fill-zinc-500 text-[10px] dark:fill-zinc-400"
              >
                {n.name}
              </text>
            </a>
          </g>
        ))}
      </g>
    </svg>
  );
}
