/**
 * Ground: the same knowledge state as a stylized microscopic ecosystem.
 * A field is a colony — a soft translucent membrane holding everything
 * learned in that area. A concept is a cell or organism inside it: a
 * spore when only encountered, a simple membrane once explained, and a
 * structured organism with visible organelles once it has been returned
 * to. A connection you stated yourself is a filament between cells; one
 * the model merely noticed is a faint dotted trail. A cross-field bridge
 * is a longer filament reaching out of one colony into another.
 *
 * Graphical-illustration language, not biology: translucent circles,
 * capsule "rod" cells, small internal dots for organelles, restrained
 * halos. Never gore, never clinical. Shares placement with the other
 * climates (placeMindscape), so a person's map is recognizably theirs.
 */

import {
  DAY,
  DEPTH_WEIGHT,
  STATUS_WEIGHT,
  hash32,
  mulberry32,
  parseWhen,
  placeMindscape,
  type MapInput,
  type MapPoint,
  type PlacedField,
  type Working,
} from "./engine";
import type { Standing } from "@/lib/knowledge";

export interface GroundColony {
  name: string;
  x: number;
  y: number;
  hue: number;
  radius: number;
  labelX: number;
  labelY: number;
}

export interface GroundCell {
  id: string;
  name: string;
  slug: string;
  fieldIndex: number;
  hue: number;
  x: number;
  y: number;
  r: number;
  rod: boolean;
  /** Encountered spores get none of this; explained cells build up. */
  organelles: number;
  standing: Standing;
  mature: boolean;
  misconception: boolean;
  openQuestion: boolean;
  live: boolean;
  rotation: number;
}

export interface GroundFilament {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  cx: number;
  cy: number;
  hueA: number;
  hueB: number;
  cross: boolean;
  dotted: boolean;
}

/** Purely decorative — the rest of the dish. Not tied to any concept. */
export interface GroundDust {
  x: number;
  y: number;
  kind: "dot" | "rod" | "ring" | "burst" | "triangle";
  r: number;
  a: number;
  hue: number;
  rotation: number;
}

export interface GroundModel {
  width: number;
  height: number;
  fields: PlacedField[];
  colonies: GroundColony[];
  cells: GroundCell[];
  filaments: GroundFilament[];
  dust: GroundDust[];
  points: MapPoint[];
  bounds: { x0: number; y0: number; x1: number; y1: number };
}

function extentOf(w: Working): number {
  let sum = 0;
  for (const e of w.input.explanations) sum += DEPTH_WEIGHT[e.depth] * STATUS_WEIGHT[e.status];
  return Math.min(1, sum / 2.2);
}

export function buildGroundEcosystem(input: MapInput): GroundModel {
  const now = input.now ?? Date.now();
  const { W, H, fields, work } = placeMindscape(input);
  const byId = new Map(work.map((w) => [w.input.id, w]));

  const cells: GroundCell[] = work.map((w) => {
    const extent = extentOf(w);
    const explained = w.input.explanations.length > 0;
    const lastCorrect = [...w.input.explanations].reverse().find((e) => e.status === "correct");
    const weak = w.input.misconceptions > 0 && (!lastCorrect || parseWhen(lastCorrect.at) < now - 21 * DAY);
    return {
      id: w.input.id, name: w.input.name, slug: w.input.slug, fieldIndex: w.fieldIndex, hue: w.hue,
      x: w.x, y: w.y,
      r: explained ? 6 + extent * 15 : 3,
      rod: hash32("rod:" + w.input.id) % 5 === 0,
      organelles: Math.min(5, w.input.explanations.length),
      standing: w.input.standing,
      mature: w.input.standing === "Retained",
      misconception: weak,
      openQuestion: w.input.openQuestion,
      live: now - parseWhen(w.input.lastTouchedAt) <= 14 * DAY,
      rotation: mulberry32(hash32("rot:" + w.input.id))() * Math.PI * 2,
    };
  });
  const cellById = new Map(cells.map((c) => [c.id, c]));

  const filaments: GroundFilament[] = [];
  const seenPair = new Set<string>();
  for (const r of input.relations) {
    const a = byId.get(r.fromId), b = byId.get(r.toId);
    if (!a || !b || a === b) continue;
    const key = [a.input.id, b.input.id].sort().join("|");
    if (seenPair.has(key)) continue;
    seenPair.add(key);
    const ca = cellById.get(a.input.id), cb = cellById.get(b.input.id);
    if (!ca || !cb) continue;
    if (r.source !== "explained" && r.source !== "manual" && r.source !== "llm_inferred") continue;
    const cross = a.fieldIndex !== b.fieldIndex;
    const mx = (ca.x + cb.x) / 2, my = (ca.y + cb.y) / 2;
    const bend = (mulberry32(hash32("bend:" + key))() - 0.5) * 40;
    filaments.push({
      ax: ca.x, ay: ca.y, bx: cb.x, by: cb.y, cx: mx + bend, cy: my - bend,
      hueA: ca.hue, hueB: cb.hue, cross, dotted: r.source === "llm_inferred",
    });
  }

  // Colonies: a soft membrane sized by how much has grown in the field.
  const colonies: GroundColony[] = fields.map((f) => {
    const members = cells.filter((c) => c.fieldIndex === fields.indexOf(f));
    const mass = members.reduce((s, c) => s + c.r, 0);
    const radius = Math.max(46, Math.min(190, 40 + mass * 0.9));
    return { name: f.name, x: f.x, y: f.y, hue: f.hue, radius, labelX: f.labelX, labelY: f.labelY };
  });

  // Dust: the rest of the dish. Small rods, rings, dots, bursts, triangles,
  // scattered across the whole world, never clickable, never labeled.
  const rng = mulberry32(hash32("dust:" + input.seed));
  const dust: GroundDust[] = [];
  const kinds: GroundDust["kind"][] = ["dot", "rod", "ring", "burst", "triangle"];
  // Restrained: a stray specimen here and there, not a field of confetti.
  const count = Math.round((W * H) / 16000);
  for (let i = 0; i < count; i++) {
    dust.push({
      x: rng() * W, y: rng() * H,
      kind: kinds[Math.floor(rng() * kinds.length)],
      r: 1.5 + rng() * 4.5,
      a: 0.06 + rng() * 0.12,
      hue: Math.floor(rng() * 6),
      rotation: rng() * Math.PI * 2,
    });
  }

  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const c of colonies) {
    if (c.x - c.radius < x0) x0 = c.x - c.radius; if (c.y - c.radius < y0) y0 = c.y - c.radius;
    if (c.x + c.radius > x1) x1 = c.x + c.radius; if (c.y + c.radius > y1) y1 = c.y + c.radius;
  }
  if (!Number.isFinite(x0)) { x0 = W * 0.3; y0 = H * 0.3; x1 = W * 0.7; y1 = H * 0.7; }

  return {
    width: W, height: H, fields, colonies, cells, filaments, dust,
    points: cells.map((c) => ({ id: c.id, name: c.name, slug: c.slug, x: c.x, y: c.y })),
    bounds: { x0, y0, x1, y1 },
  };
}
