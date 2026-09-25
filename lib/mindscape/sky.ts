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
  /** computeRelationWeight output — drives line thickness. */
  weight: number;
}

export interface SkyBridge {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  hueA: number;
  hueB: number;
  /** computeRelationWeight output — drives bridge thickness. */
  weight: number;
}

/** Faraway, unclickable dust — the rest of the sky, not any concept. Three
 * depth tiers: a haze of the smallest, dimmest points behind, fewer,
 * bigger, brighter ones in front, so the field itself has depth. */
export interface SkyDust {
  x: number;
  y: number;
  r: number;
  a: number;
  twinkle: boolean;
}

/** A faint decorative orbital curve, pure atmosphere — not a relationship. */
export interface SkyArc {
  cx: number;
  cy: number;
  r: number;
  a0: number;
  a1: number;
  hue: number;
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
  arcs: SkyArc[];
  galaxies: SkyGalaxy[];
  haze: SkyHaze[];
  points: MapPoint[];
  bounds: { x0: number; y0: number; x1: number; y1: number };
}

export function buildSky(input: MapInput): SkyModel {
  const now = input.now ?? Date.now();
  const { W, H, fields, work } = placeMindscape(input);

  const stars: SkyStar[] = work.map((w) => {
    const extent = w.input.knowledgeWeight;
    const explained = w.input.explanations.length > 0;
    const lastCorrect = [...w.input.explanations].reverse().find((e) => e.status === "correct");
    const weak = w.input.misconceptions > 0 && (!lastCorrect || parseWhen(lastCorrect.at) < now - 21 * DAY);
    return {
      id: w.input.id, name: w.input.name, slug: w.input.slug, fieldIndex: w.fieldIndex, hue: w.hue,
      x: w.x, y: w.y,
      magnitude: explained ? 3 + extent * 9 : 1.6,
      halo: w.input.reinforcement,
      spikes: w.input.standing === "Retained",
      nebula: w.input.standing === "Retained" ? Math.min(1, (now - parseWhen(w.input.retainedAt ?? w.input.firstEncounteredAt)) / (60 * DAY)) : 0,
      weak, live: now - parseWhen(w.input.lastTouchedAt) <= 14 * DAY,
      standing: w.input.standing, explained,
      exceptional: w.input.exceptional,
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
      bridges.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y, hueA: a.hue, hueB: b.hue, weight: r.weight });
    } else if (!cross) {
      lines.push({
        ax: a.x, ay: a.y, bx: b.x, by: b.y, hue: a.hue,
        strong: a.standing === "Retained" && b.standing === "Retained",
        weight: r.weight,
      });
    }
  }

  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of stars) {
    const pad = 30 + s.magnitude * 2;
    if (s.x - pad < x0) x0 = s.x - pad; if (s.y - pad < y0) y0 = s.y - pad;
    if (s.x + pad > x1) x1 = s.x + pad; if (s.y + pad > y1) y1 = s.y + pad;
  }
  if (!Number.isFinite(x0)) { x0 = W * 0.3; y0 = H * 0.3; x1 = W * 0.7; y1 = H * 0.7; }

  // Dust: the rest of the sky, in three depth tiers, so the field itself
  // has layers — a haze of tiny points behind, fewer brighter ones in
  // front, and a scatter of twinkling ones among them.
  const rng = mulberry32(hash32("dust:" + input.seed));
  const dust: SkyDust[] = [];
  const pushStars = (n: number, rMin: number, rMax: number, aMin: number, aMax: number, twinklePct: number) => {
    for (let i = 0; i < n; i++) {
      dust.push({
        x: rng() * W, y: rng() * H,
        r: rMin + rng() * (rMax - rMin),
        a: aMin + rng() * (aMax - aMin),
        twinkle: rng() < twinklePct,
      });
    }
  };
  pushStars(Math.round((W * H) / 3200), 0.3, 0.7, 0.14, 0.32, 0.04);
  pushStars(Math.round((W * H) / 8500), 0.6, 1.3, 0.22, 0.45, 0.1);
  pushStars(Math.round((W * H) / 22000), 1.1, 2.1, 0.4, 0.7, 0.25);

  // Three to four distant galaxies, pure atmosphere, placed away from the
  // content so they never compete with it.
  const grng = mulberry32(hash32("galaxy:" + input.seed));
  const galaxies: SkyGalaxy[] = [
    { x: W * 0.07 + grng() * W * 0.05, y: H * 0.18 + grng() * H * 0.14, r: 75 + grng() * 30, rotation: grng() * Math.PI, a: 0.55 },
    { x: W * 0.92 - grng() * W * 0.05, y: H * 0.28 + grng() * H * 0.18, r: 65 + grng() * 28, rotation: grng() * Math.PI, a: 0.48 },
    { x: W * 0.35 + grng() * W * 0.1, y: H * 0.08 + grng() * H * 0.06, r: 30 + grng() * 14, rotation: grng() * Math.PI, a: 0.32 },
  ];

  // Faint orbital arcs — decorative curves suggesting motion, never a
  // relationship, scattered across the world.
  const arng = mulberry32(hash32("arcs:" + input.seed));
  const arcs: SkyArc[] = [];
  const nArcs = Math.max(7, Math.round((W * H) / 190000));
  for (let i = 0; i < nArcs; i++) {
    const cx = arng() * W, cy = arng() * H * 0.85;
    const r = 70 + arng() * 260;
    const a0 = arng() * Math.PI * 2;
    arcs.push({ cx, cy, r, a0, a1: a0 + 0.6 + arng() * 1.5, hue: Math.floor(arng() * 6), a: 0.08 + arng() * 0.1 });
  }

  // Rich haze behind the fields with real content, and several loose
  // nebula washes elsewhere for atmosphere and color.
  const hrng = mulberry32(hash32("haze:" + input.seed));
  const haze: SkyHaze[] = fields
    .filter((f) => f.count > 0)
    .map((f) => ({ x: f.x, y: f.y, r: f.reach * 2.6, hue: f.hue, a: 0.07 + hrng() * 0.05 }));
  const nLooseHaze = Math.max(5, Math.round((W * H) / 260000));
  for (let i = 0; i < nLooseHaze; i++) {
    haze.push({ x: hrng() * W, y: hrng() * H * 0.75, r: 100 + hrng() * 90, hue: Math.floor(hrng() * 6), a: 0.035 + hrng() * 0.04 });
  }

  return {
    width: W, height: H, fields, stars, lines, bridges, dust, arcs, galaxies, haze,
    points: stars.map((s) => ({ id: s.id, name: s.name, slug: s.slug, x: s.x, y: s.y })),
    bounds: { x0, y0, x1, y1 },
  };
}
