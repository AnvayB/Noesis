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
  hue: string; // a CSS color expression
  live: boolean;
  highlight: boolean;
  radius: number;
  seed: number;
}

type LinkDatum = SimulationLinkDatum<Node> & { strength: number; hue: string };

const WIDTH = 800;

// The six field hues. A field is a connected cluster of concepts; a concept
// that connects to nothing yet is drawn in ink, and gains a hue the first
// time an explanation joins it to something.
const HUES = [
  "var(--teal)",
  "var(--ochre)",
  "var(--rose)",
  "var(--slate)",
  "var(--moss)",
  "var(--copper)",
];

// Deterministic stand-in for Math.random(), seeded by a string, so every
// organic detail is stable across renders (useMemo must stay pure).
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

// Collision radius only; the drawn mark is smaller than the space it keeps.
function radiusFor(statusLabel: string) {
  if (statusLabel === "Retained") return 22;
  if (statusLabel === "Can Explain") return 18;
  if (statusLabel === "Familiar") return 12;
  return 8;
}

function fieldHues(concepts: MindscapeConcept[], relations: MindscapeRelationInput[]) {
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let p = parent.get(x) ?? x;
    while (p !== x) {
      x = p;
      p = parent.get(x) ?? x;
    }
    return p;
  };
  for (const c of concepts) parent.set(c.id, c.id);
  for (const r of relations) {
    if (!parent.has(r.fromConceptId) || !parent.has(r.toConceptId)) continue;
    const a = find(r.fromConceptId), b = find(r.toConceptId);
    if (a !== b) parent.set(a, b);
  }
  const members = new Map<string, MindscapeConcept[]>();
  for (const c of concepts) {
    const root = find(c.id);
    members.set(root, [...(members.get(root) ?? []), c]);
  }
  const hueOf = new Map<string, string>();
  const taken = new Set<number>();
  for (const [root, list] of members) {
    if (list.length < 2) {
      for (const c of list) hueOf.set(c.id, "var(--ink)");
      continue;
    }
    const anchor = list.map((c) => c.slug).sort()[0];
    let idx = Math.floor(pseudoRandom("field:" + anchor) * HUES.length);
    let tries = 0;
    while (taken.has(idx) && tries++ < HUES.length) idx = (idx + 1) % HUES.length;
    taken.add(idx);
    for (const c of list) hueOf.set(c.id, HUES[idx]);
    void root;
  }
  return hueOf;
}

// Short threads reaching out from a mark, the way an explanation reaches
// toward what it relates to. Deterministic per concept.
function threads(n: Node, count: number, length: number) {
  const out: string[] = [];
  const x = n.x ?? 0, y = n.y ?? 0;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + n.seed * Math.PI * 2;
    const L = length * (0.65 + 0.7 * pseudoRandom(n.id + ":t" + i));
    const bend = (pseudoRandom(n.id + ":b" + i) - 0.5) * L * 0.9;
    const ex = x + Math.cos(a) * L, ey = y + Math.sin(a) * L;
    const cx = x + Math.cos(a) * L * 0.5 + Math.cos(a + Math.PI / 2) * bend;
    const cy = y + Math.sin(a) * L * 0.5 + Math.sin(a + Math.PI / 2) * bend;
    out.push(`M${x.toFixed(1)} ${y.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`);
  }
  return out;
}

function cord(a: Node, b: Node, seed: string) {
  const ax = a.x ?? 0, ay = a.y ?? 0, bx = b.x ?? 0, by = b.y ?? 0;
  const mx = (ax + bx) / 2, my = (ay + by) / 2;
  const dx = bx - ax, dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  const side = pseudoRandom(seed) < 0.5 ? -1 : 1;
  const off = len * 0.14 * side;
  const cx = mx + (-dy / len) * off, cy = my + (dx / len) * off;
  return `M${ax.toFixed(1)} ${ay.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)}`;
}

export function Mindscape({
  concepts,
  relations,
  height = 400,
  highlightIds = [],
}: {
  concepts: MindscapeConcept[];
  relations: MindscapeRelationInput[];
  height?: number;
  /** Concepts this view is about: drawn with a lamp ring and a full label. */
  highlightIds?: string[];
}) {
  // Keyed on the joined ids so a fresh array literal from the parent does
  // not re-run the layout on every render.
  const highlightKey = highlightIds.join("|");
  const highlightSet = useMemo(
    () => new Set(highlightKey ? highlightKey.split("|") : []),
    [highlightKey],
  );
  const { nodes, links } = useMemo(() => {
    if (concepts.length === 0) {
      return { nodes: [] as Node[], links: [] as LinkDatum[] };
    }
    const hueOf = fieldHues(concepts, relations);

    const nodeData: Node[] = concepts.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      statusLabel: c.statusLabel,
      hue: hueOf.get(c.id) ?? "var(--ink)",
      // Touched in the last two weeks. Nothing else in the picture is about
      // time: there is no fade, only a glow on what is happening now.
      live: daysSince(c.lastReviewedAt ?? c.lastEncounteredAt) <= 14,
      highlight: highlightSet.has(c.id),
      radius: radiusFor(c.statusLabel),
      seed: pseudoRandom(c.id),
      x: c.layoutX ?? WIDTH / 2 + (pseudoRandom(c.id + "x") - 0.5) * 160,
      y: c.layoutY ?? height / 2 + (pseudoRandom(c.id + "y") - 0.5) * 160,
    }));

    const byId = new Map(nodeData.map((n) => [n.id, n]));
    const linkData: LinkDatum[] = relations
      .filter((r) => byId.has(r.fromConceptId) && byId.has(r.toConceptId))
      .map((r) => ({
        source: r.fromConceptId,
        target: r.toConceptId,
        strength: r.strength,
        hue: byId.get(r.fromConceptId)!.hue,
      }));

    const simulation = forceSimulation(nodeData)
      .force("charge", forceManyBody().strength(-160))
      .force(
        "link",
        forceLink<Node, LinkDatum>(linkData)
          .id((d) => d.id)
          .distance(110),
      )
      .force("center", forceCenter(WIDTH / 2, height / 2))
      .force(
        "collide",
        forceCollide<Node>((d) => d.radius + 22),
      )
      .stop();

    // Settle synchronously: a landscape, not a bouncing simulation.
    simulation.tick(220);
    return { nodes: nodeData, links: linkData };
  }, [concepts, relations, height, highlightSet]);

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
      <div className="flex h-full items-center justify-center px-8 text-center">
        <p className="question max-w-md text-ink-soft">
          Nothing on the map yet. Explain something you have learned and it
          will begin here.
        </p>
      </div>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${height}`}
      className="h-full w-full"
      role="img"
      aria-label="Your Mindscape"
    >
      <style>{`
        .ms-node text { transition: opacity 240ms cubic-bezier(.2,.7,.2,1), fill 240ms; }
        .ms-node:hover text { opacity: 1; fill: var(--ink); }
        .ms-live { animation: breathe 4s cubic-bezier(.2,.7,.2,1) infinite; }
        @media (prefers-reduced-motion: reduce) { .ms-live { animation: none; } }
      `}</style>

      {/* Cords between related concepts, in the field's hue. */}
      <g fill="none" strokeLinecap="round">
        {links.map((l, i) => {
          const s = typeof l.source === "object" ? (l.source as Node) : undefined;
          const t = typeof l.target === "object" ? (l.target as Node) : undefined;
          if (!s || !t) return null;
          return (
            <path
              key={i}
              d={cord(s, t, s.id + t.id)}
              stroke={l.hue}
              strokeOpacity={0.55}
              strokeWidth={Math.min(0.8 + l.strength * 0.5, 3)}
            />
          );
        })}
      </g>

      {/* Marks. Nothing here is a circle with a label in it. */}
      <g>
        {nodes.map((n) => {
          const x = n.x ?? 0, y = n.y ?? 0;
          const status = n.statusLabel;
          return (
            <g key={n.id} className="ms-node">
              {(n.live || n.highlight) && (
                <circle
                  className="ms-live"
                  cx={x}
                  cy={y}
                  r={n.highlight ? 22 : 16}
                  fill="var(--lamp)"
                  fillOpacity={n.highlight ? 0.26 : 0.18}
                />
              )}
              {n.highlight && (
                <circle cx={x} cy={y} r={26} fill="none" stroke="var(--lamp)" strokeOpacity={0.7} strokeWidth={0.9} />
              )}
              <a href={`/concepts/${n.slug}`}>
                {/* Retained knowledge carries contours: it has settled into ground. */}
                {status === "Retained" && (
                  <g fill="none" stroke={n.hue}>
                    <circle cx={x} cy={y} r={11} strokeOpacity={0.45} strokeWidth={0.7} />
                    <circle cx={x} cy={y} r={17.5} strokeOpacity={0.25} strokeWidth={0.7} />
                  </g>
                )}
                {/* Threads reach outward for anything that has been explained. */}
                {(status === "Retained" || status === "Can Explain") && (
                  <g fill="none" stroke={n.hue} strokeWidth={0.9} strokeOpacity={0.85} strokeLinecap="round">
                    {threads(n, status === "Retained" ? 8 : 7, status === "Retained" ? 15 : 13).map((d, i) => (
                      <path key={i} d={d} />
                    ))}
                  </g>
                )}
                {status === "Familiar" && (
                  <g fill="none" stroke={n.hue} strokeWidth={0.8} strokeOpacity={0.8} strokeLinecap="round">
                    {threads(n, 3, 9).map((d, i) => (
                      <path key={i} d={d} />
                    ))}
                    <circle cx={x} cy={y} r={4.5} />
                  </g>
                )}
                {status === "Encountered" ? (
                  // A spore: met, not yet explained.
                  <path
                    d={`M${(x - 3).toFixed(1)} ${(y + 2.5).toFixed(1)} q2.5 -6 6.5 -3.5`}
                    fill="none"
                    stroke={n.hue}
                    strokeWidth={1}
                    strokeOpacity={0.8}
                    strokeLinecap="round"
                  />
                ) : status !== "Familiar" ? (
                  <circle cx={x} cy={y} r={status === "Retained" ? 5 : 4.2} fill={n.hue} />
                ) : null}
                <text
                  x={x}
                  y={y + (status === "Retained" ? 30 : status === "Encountered" ? 15 : 24)}
                  textAnchor="middle"
                  fill={n.highlight ? "var(--ink)" : "var(--ink-soft)"}
                  opacity={n.highlight ? 1 : 0.85}
                  style={{
                    fontFamily: "var(--font-fraunces), Georgia, serif",
                    fontStyle: "italic",
                    fontSize: 12,
                  }}
                >
                  {n.name}
                </text>
              </a>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
