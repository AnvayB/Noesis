/**
 * Sky: the same knowledge state as a night sky. Concepts are stars at
 * hashed positions — the same positions Ground and Grove use. Magnitude
 * is depth, revisits widen the halo, retention adds diffraction spikes
 * and a nebula of the field's hue. A constellation line is earned: drawn
 * only between two related stars once both have been explained. A bridge
 * is a light bridge, a filament between fields with a ring at each end.
 * Weak knowledge is a red dwarf: small, warm, unmoved.
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
} from "./engine";
import type { Standing } from "@/lib/knowledge";

export interface SkyStar {
  id: string;
  name: string;
  slug: string;
  fieldIndex: number;
  hue: number;
  x: number;
  y: number;
  magnitude: number;
  halo: number;
  spikes: boolean;
  nebula: number;
  weak: boolean;
  live: boolean;
  standing: Standing;
  explained: boolean;
  /** Rare: deep, retained, revisited more than most. A bloom worth noticing. */
  exceptional: boolean;
}

export interface SkyLine {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  hue: number;
  strong: boolean;
}

export interface SkyBridge {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  hueA: number;
  hueB: number;
}

/** Faraway, unclickable dust — the rest of the sky, not any concept. */
export interface SkyDust {
  x: number;
  y: number;
  r: number;
  a: number;
}

/** A distant spiral, pure atmosphere — never a concept, never labeled. */
export interface SkyGalaxy {
  x: number;
  y: number;
  r: number;
  rotation: number;
  a: number;
}

/** A soft colored haze behind the real stars, atmosphere only. */
export interface SkyHaze {
  x: number;
  y: number;
  r: number;
  hue: number;
  a: number;
}

export interface SkyModel {
  width: number;
  height: number;
  fields: PlacedField[];
  stars: SkyStar[];
  lines: SkyLine[];
  bridges: SkyBridge[];
  dust: SkyDust[];
  galaxies: SkyGalaxy[];
  haze: SkyHaze[];
  points: MapPoint[];
  bounds: { x0: number; y0: number; x1: number; y1: number };
}

export function buildSky(input: MapInput): SkyModel {
  const now = input.now ?? Date.now();
  const { W, H, fields, work } = placeMindscape(input);

  const stars: SkyStar[] = work.map((w) => {
    let sum = 0;
    for (const e of w.input.explanations) sum += DEPTH_WEIGHT[e.depth] * STATUS_WEIGHT[e.status];
    const extent = Math.min(1, sum / 2.2);
    const explained = w.input.explanations.length > 0;
    const lastCorrect = [...w.input.explanations].reverse().find((e) => e.status === "correct");
    const weak = w.input.misconceptions > 0 && (!lastCorrect || parseWhen(lastCorrect.at) < now - 21 * DAY);
    return {
      id: w.input.id, name: w.input.name, slug: w.input.slug, fieldIndex: w.fieldIndex, hue: w.hue,
      x: w.x, y: w.y,
      magnitude: explained ? 3 + extent * 9 : 1.6,
      halo: Math.min(1, w.input.explanations.length / 4),
      spikes: w.input.standing === "Retained",
      nebula: w.input.standing === "Retained" ? Math.min(1, (now - parseWhen(w.input.retainedAt ?? w.input.firstEncounteredAt)) / (60 * DAY)) : 0,
      weak, live: now - parseWhen(w.input.lastTouchedAt) <= 14 * DAY,
      standing: w.input.standing, explained,
      exceptional: w.input.standing === "Retained" && w.input.explanations.length >= 3 && extent > 0.85,
    };
  });
  const byId = new Map(stars.map((s) => [s.id, s]));

  const lines: SkyLine[] = [];
  const bridges: SkyBridge[] = [];
  
  const seenPair = new Set<string>();
  for (const r of input.relations) {
    const a = byId.get(r.fromId), b = byId.get(r.toId);
    if (!a || !b || a === b) continue;
    const key = [a.id, b.id].sort().join("|");
    if (seenPair.has(key)) continue;
    seenPair.add(key);
    if (!a.explained || !b.explained) continue;
    const cross = a.fieldIndex !== b.fieldIndex;
    if (cross && r.source === "explained") {
      bridges.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y, hueA: a.hue, hueB: b.hue });
    } else if (!cross) {
      lines.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y, hue: a.hue, strong: a.standing === "Retained" && b.standing === "Retained" });
    }
  }

  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of stars) {
    const pad = 30 + s.magnitude * 2;
    if (s.x - pad < x0) x0 = s.x - pad; if (s.y - pad < y0) y0 = s.y - pad;
    if (s.x + pad > x1) x1 = s.x + pad; if (s.y + pad > y1) y1 = s.y + pad;
  }
  if (!Number.isFinite(x0)) { x0 = W * 0.3; y0 = H * 0.3; x1 = W * 0.7; y1 = H * 0.7; }

  // Dust: the rest of the sky, so the world reads as a sky everywhere, not
  // a lit cluster on a blank field. Uniform across the whole world, seeded,
  // stable, never clickable, never labeled.
  const rng = mulberry32(hash32("dust:" + input.seed));
  const dust: SkyDust[] = [];
  const count = Math.round((W * H) / 9000);
  for (let i = 0; i < count; i++) {
    dust.push({ x: rng() * W, y: rng() * H, r: 0.4 + rng() * 0.9, a: 0.12 + rng() * 0.28 });
  }

  // Two distant galaxies, pure atmosphere, placed away from the content so
  // they never compete with it.
  const grng = mulberry32(hash32("galaxy:" + input.seed));
  const galaxies: SkyGalaxy[] = [
    { x: W * 0.08 + grng() * W * 0.06, y: H * 0.22 + grng() * H * 0.15, r: 70 + grng() * 30, rotation: grng() * Math.PI, a: 0.5 },
    { x: W * 0.9 - grng() * W * 0.06, y: H * 0.3 + grng() * H * 0.2, r: 60 + grng() * 25, rotation: grng() * Math.PI, a: 0.42 },
  ];

  // Soft haze behind the fields with real content, and a couple of loose
  // ones elsewhere for atmosphere.
  const hrng = mulberry32(hash32("haze:" + input.seed));
  const haze: SkyHaze[] = fields
    .filter((f) => f.count > 0)
    .map((f) => ({ x: f.x, y: f.y, r: f.reach * 2.2, hue: f.hue, a: 0.05 + hrng() * 0.04 }));
  for (let i = 0; i < 2; i++) {
    haze.push({ x: hrng() * W, y: hrng() * H * 0.7, r: 90 + hrng() * 60, hue: Math.floor(hrng() * 6), a: 0.03 + hrng() * 0.03 });
  }

  return {
    width: W, height: H, fields, stars, lines, bridges, dust, galaxies, haze,
    points: stars.map((s) => ({ id: s.id, name: s.name, slug: s.slug, x: s.x, y: s.y })),
    bounds: { x0, y0, x1, y1 },
  };
}
