/**
 * Settling Ground: the Mindscape grammar, as a pure function from a
 * knowledge state to a picture. Understanding begins as a living thread
 * and, when it holds, settles into land.
 *
 * Determinism model (docs/mindscape/three-systems.md): identity is hashed,
 * variation is noise. Every position comes from a hash of the concept's id
 * and the personal seed, so adding a concept cannot move the others. Every
 * organic detail comes from seeded noise sampled at those positions. The
 * same knowledge state always produces the same picture.
 *
 * No DOM here. The component in components/Mindscape.tsx draws the model.
 */

import type { ConceptAddressedStatus, ConceptRelationSource, UnderstandingDepth } from "@/lib/db/schema";
import type { Standing } from "@/lib/knowledge";

// --- Input ------------------------------------------------------------------

export interface MapConcept {
  id: string;
  name: string;
  slug: string;
  field: string | null;
  firstEncounteredAt: string;
  lastTouchedAt: string;
  explanations: { at: string; status: ConceptAddressedStatus; depth: UnderstandingDepth }[];
  standing: Standing;
  retainedAt: string | null;
  misconceptions: number;
  openQuestion: boolean;
}

export interface MapRelation {
  fromId: string;
  toId: string;
  source: ConceptRelationSource;
  strength: number;
  createdAt: string;
}

export interface MapInput {
  concepts: MapConcept[];
  relations: MapRelation[];
  /** The person, not the day. Same seed, same map. */
  seed: string;
  /** "Now", so tests and seeds can freeze it. Epoch ms. */
  now?: number;
}

// --- Output -----------------------------------------------------------------

export interface PlacedField {
  name: string;
  x: number;
  y: number;
  hue: number;
  /** Radius that holds most of its concepts, for the faint label. */
  reach: number;
  count: number;
  /** Where the label sits: outside the field, away from the middle of the map. */
  labelX: number;
  labelY: number;
}

/** A point every climate exposes, so the viewer can hover/click/fit generically. */
export interface MapPoint {
  id: string;
  name: string;
  slug: string;
  x: number;
  y: number;
}

// --- Deterministic primitives ------------------------------------------------

export function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rng = () => number;
export const rand = (r: Rng, a: number, b: number) => a + (b - a) * r();
export function gaussian(r: Rng) {
  const u = Math.max(r(), 1e-9), v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Seeded 2D value noise in [0,1], smooth, cheap. */
export function makeNoise(seed: number) {
  const lattice = (ix: number, iy: number) => {
    let h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + seed;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const fade = (t: number) => t * t * (3 - 2 * t);
  return (x: number, y: number) => {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = fade(x - ix), fy = fade(y - iy);
    const a = lattice(ix, iy), b = lattice(ix + 1, iy), c = lattice(ix, iy + 1), d = lattice(ix + 1, iy + 1);
    return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
  };
}

export function parseWhen(iso: string): number {
  return new Date(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z").getTime();
}

export const DAY = 86400000;
export const GOLDEN = Math.PI * (3 - Math.sqrt(5));
const HUE_COUNT = 6;

export const DEPTH_WEIGHT: Record<UnderstandingDepth, number> = { surface: 0.32, solid: 0.6, deep: 0.92 };
export const STATUS_WEIGHT: Record<ConceptAddressedStatus, number> = { correct: 1, partial: 0.55, missing: 0.22 };

// --- Layout -----------------------------------------------------------------

export interface Working {
  input: MapConcept;
  index: number;
  x: number;
  y: number;
  fieldIndex: number;
  hue: number;
  born: number;
  rng: Rng;
  grain: number;
  baseAngle: number;
  rSum: number;
  rN: number;
  sigma: number;
  settle: number;
  fused: number;
  tipEnds: { x: number; y: number }[];
  segStart: number;
  segCount: number;
}

function placeFields(input: MapInput, W: number, H: number, byField: Map<string, MapConcept[]>) {
  // Fields in order of first encounter: the map grows outward over time and
  // an old field never moves because a new one appeared.
  const names = [...byField.keys()].sort((a, b) => {
    const ea = Math.min(...byField.get(a)!.map((c) => parseWhen(c.firstEncounteredAt)));
    const eb = Math.min(...byField.get(b)!.map((c) => parseWhen(c.firstEncounteredAt)));
    return ea - eb || a.localeCompare(b);
  });
  const seedAngle = (hash32("angle:" + input.seed) / 4294967296) * Math.PI * 2;
  const spacing = Math.min(W, H) * 0.14;
  const taken = new Set<number>();
  const fields: PlacedField[] = names.map((name, i) => {
    const r = i === 0 ? 0 : spacing * Math.sqrt(i) * 1.15;
    const a = seedAngle + i * GOLDEN;
    let hue = hash32("hue:" + name) % HUE_COUNT;
    let tries = 0;
    while (taken.has(hue) && tries++ < HUE_COUNT) hue = (hue + 1) % HUE_COUNT;
    taken.add(hue);
    if (taken.size >= HUE_COUNT) taken.clear();
    return {
      name,
      x: W / 2 + Math.cos(a) * r,
      y: H / 2 + Math.sin(a) * r,
      hue,
      reach: 0,
      count: byField.get(name)!.length,
      labelX: 0,
      labelY: 0,
    };
  });
  return fields;
}

export function placeMindscape(input: MapInput): { W: number; H: number; fields: PlacedField[]; work: Working[] } {
  const concepts = [...input.concepts].sort(
    (a, b) => parseWhen(a.firstEncounteredAt) - parseWhen(b.firstEncounteredAt) || a.id.localeCompare(b.id),
  );
  const byField = new Map<string, MapConcept[]>();
  for (const c of concepts) {
    const key = c.field?.trim() || "Uncharted";
    byField.set(key, [...(byField.get(key) ?? []), c]);
  }
  const k = Math.max(1, byField.size);
  const N = concepts.length;
  const size = Math.max(1000, 520 * Math.sqrt(k) + 26 * Math.sqrt(N));
  const W = size, H = size;
  const fields = placeFields(input, W, H, byField);
  const fieldIndex = new Map(fields.map((f, i) => [f.name, i]));

  const work: Working[] = concepts.map((c, index) => {
    const fname = c.field?.trim() || "Uncharted";
    const fi = fieldIndex.get(fname)!;
    const f = fields[fi];
    const rng = mulberry32(hash32(input.seed + "|" + c.id));
    const sigma = 58 + 16 * Math.sqrt(f.count);
    const x = f.x + gaussian(rng) * sigma;
    const y = f.y + gaussian(rng) * sigma;
    return {
      input: c,
      index,
      x,
      y,
      fieldIndex: fi,
      hue: f.hue,
      born: parseWhen(c.firstEncounteredAt),
      rng,
      grain: rng() * 1000,
      baseAngle: rng() * Math.PI * 2,
      rSum: 0,
      rN: 0,
      sigma: 40,
      settle: 0,
      fused: 0,
      tipEnds: [],
      segStart: 0,
      segCount: 0,
    };
  });
  const byId = new Map(work.map((w) => [w.input.id, w]));

  // Related concepts are pulled a fixed fraction toward each other, in a
  // fixed order, so the pull is a pure function of the ids.
  const relations = [...input.relations].sort(
    (a, b) => parseWhen(a.createdAt) - parseWhen(b.createdAt) || (a.fromId + a.toId).localeCompare(b.fromId + b.toId),
  );
  for (const r of relations) {
    const a = byId.get(r.fromId), b = byId.get(r.toId);
    if (!a || !b) continue;
    const cross = a.fieldIndex !== b.fieldIndex;
    const k = cross ? 0.08 : 0.18;
    const dx = b.x - a.x, dy = b.y - a.y;
    a.x += dx * k; a.y += dy * k;
    b.x -= dx * k; b.y -= dy * k;
  }

  // Keep origins apart. Deterministic: sorted pairs, fixed iterations.
  const minD = 30;
  for (let it = 0; it < 10; it++) {
    for (let i = 0; i < work.length; i++) {
      for (let j = i + 1; j < work.length; j++) {
        const a = work[i], b = work[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        if (d >= minD || d === 0) continue;
        const push = (minD - d) / 2;
        const ux = dx / d, uy = dy / d;
        a.x -= ux * push; a.y -= uy * push;
        b.x += ux * push; b.y += uy * push;
      }
    }
  }
  const margin = 60;
  for (const w of work) {
    w.x = Math.min(W - margin, Math.max(margin, w.x));
    w.y = Math.min(H - margin, Math.max(margin, w.y));
  }

  // The content sits inside a larger world, generous on all sides, so a
  // wide container's surrounding space is real unexplored ground the
  // grammar already draws as fog — not a void and not a copy of the map.
  // Everything above this point is unchanged; this only recenters it.
  const WORLD_MARGIN = 1.7;
  const worldW = W * WORLD_MARGIN, worldH = H * WORLD_MARGIN;
  const offX = (worldW - W) / 2, offY = (worldH - H) / 2;
  for (const w of work) { w.x += offX; w.y += offY; }

  for (const f of fields) {
    const members = work.filter((w) => w.fieldIndex === fieldIndex.get(f.name));
    if (members.length === 0) continue;
    f.x = members.reduce((s, m) => s + m.x, 0) / members.length;
    f.y = members.reduce((s, m) => s + m.y, 0) / members.length;
    f.reach = Math.max(40, ...members.map((m) => Math.hypot(m.x - f.x, m.y - f.y)));
  }
  // Labels sit above a field, or below it when above would land on another.
  for (const f of fields) {
    if (f.count === 0) continue;
    const above = { x: f.x, y: f.y - f.reach - 26 };
    const below = { x: f.x, y: f.y + f.reach + 26 };
    const crowded = (p: { x: number; y: number }) =>
      fields.some((o) => o !== f && Math.hypot(o.x - p.x, o.y - p.y) < o.reach + 30) ||
      work.some((m) => m.fieldIndex !== fields.indexOf(f) && Math.hypot(m.x - p.x, m.y - p.y) < 60);
    const pick = crowded(above) && !crowded(below) ? below : above;
    f.labelX = pick.x;
    f.labelY = pick.y;
  }
  return { W: worldW, H: worldH, fields, work };
}


/** The six field hues, day and night, matching globals.css. */
export const FIELD_HUES = {
  day: ["#b8863b", "#3f7f82", "#b5566a", "#5d6b8a", "#6f8a4a", "#a9603a"],
  night: ["#cfa04f", "#5a9ea1", "#c9738a", "#8093b3", "#8ba566", "#c47a52"],
};
