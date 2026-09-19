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

export interface Segment {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  w: number;
  /** Index into model.concepts */
  c: number;
  dark: boolean;
  cord: boolean;
  /** Hue index of the other field for a cross-field cord, else -1 */
  mix: number;
  /** Growth order within the concept, for the reveal. */
  order: number;
}

export interface Bloom {
  x: number;
  y: number;
  hueA: number;
  hueB: number;
  cross: boolean;
  c: number;
  seed: number;
}

export interface PlacedConcept {
  id: string;
  name: string;
  slug: string;
  x: number;
  y: number;
  hue: number;
  fieldIndex: number;
  standing: Standing;
  /** 0 growing, 1 fully settled into ground. */
  settle: number;
  /** Touched in the last fortnight. */
  live: boolean;
  /** Where its free threads ended: the luminous tips when live. */
  tipEnds: { x: number; y: number }[];
  segmentCount: number;
  explained: boolean;
}

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

export interface Contour {
  level: number;
  index: boolean;
  /** Flat [x0,y0,x1,y1, ...] line segments in world units. */
  segs: Float32Array;
}

/** A point every climate exposes, so the viewer can hover/click/fit generically. */
export interface MapPoint {
  id: string;
  name: string;
  slug: string;
  x: number;
  y: number;
}

export interface MindscapeModel {
  width: number;
  height: number;
  points: MapPoint[];
  grid: number;
  cell: number;
  fields: PlacedField[];
  concepts: PlacedConcept[];
  segments: Segment[];
  blooms: Bloom[];
  darkDots: { x: number; y: number; c: number }[];
  seekers: { c: number; pts: Float32Array }[];
  ground: Float32Array;
  tint: Float32Array; // r,g,b weights per cell, hue-index mixes resolved at render
  tintW: Float32Array;
  relief: Float32Array;
  contours: Contour[];
  maxHeight: number;
  /** World-space bounds of everything drawn, for fitting. */
  bounds: { x0: number; y0: number; x1: number; y1: number };
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
const BRANCH_TURN = Math.PI - GOLDEN;
const STEP = 3.4;
const HUE_COUNT = 6;
const MAX_SEGMENTS = 60000;
export const SETTLE_DAYS = 28;

export const DEPTH_WEIGHT: Record<UnderstandingDepth, number> = { surface: 0.32, solid: 0.6, deep: 0.92 };
export const STATUS_WEIGHT: Record<ConceptAddressedStatus, number> = { correct: 1, partial: 0.55, missing: 0.22 };

function lerpAngle(a: number, b: number, k: number) {
  let d = b - a;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return a + d * k;
}

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

// --- Growth -----------------------------------------------------------------

interface Tip {
  x: number;
  y: number;
  dir: number;
  gen: number;
  life: number;
  target: Working | null;
  fuse: boolean;
  cross: boolean;
  dark: boolean;
  pathSegs: number[];
}

export function buildMindscape(input: MapInput): MindscapeModel {
  const now = input.now ?? Date.now();
  const { W, H, fields, work } = placeMindscape(input);
  const noise = makeNoise(hash32("noise:" + input.seed));
  const byId = new Map(work.map((w) => [w.input.id, w]));

  // Free growth is budgeted so a map of four hundred concepts stays legible
  // and quick; relation threads are never shortened, or cords would not form.
  const budget = Math.min(1, Math.max(0.35, Math.sqrt(140 / Math.max(1, work.length))));
  const segments: Segment[] = [];
  const blooms: Bloom[] = [];
  const darkDots: { x: number; y: number; c: number }[] = [];
  const seekers: { c: number; pts: Float32Array }[] = [];
  const cords: { a: Working; b: Working; cross: boolean; path: number[] }[] = [];

  // Which relations each concept launches toward. A relation is launched
  // from the endpoint that has been explained, preferring the later one,
  // so a region's grain runs from newer knowledge back to its foundations.
  const launches = new Map<number, { target: Working; fuse: boolean; cross: boolean }[]>();
  const seenPair = new Set<string>();
  const relations = [...input.relations].sort(
    (a, b) => parseWhen(a.createdAt) - parseWhen(b.createdAt) || (a.fromId + a.toId).localeCompare(b.fromId + b.toId),
  );
  for (const r of relations) {
    const a = byId.get(r.fromId), b = byId.get(r.toId);
    if (!a || !b || a === b) continue;
    const key = [a.input.id, b.input.id].sort().join("|");
    if (seenPair.has(key)) continue;
    seenPair.add(key);
    const aX = a.input.explanations.length > 0, bX = b.input.explanations.length > 0;
    if (!aX && !bX) continue;
    let from = a, to = b;
    if (aX && bX) {
      if (b.born > a.born) { from = b; to = a; }
    } else if (bX) { from = b; to = a; }
    const list = launches.get(from.index) ?? [];
    list.push({ target: to, fuse: r.source === "explained" || r.source === "manual", cross: a.fieldIndex !== b.fieldIndex });
    launches.set(from.index, list);
  }

  const addSegment = (s: Omit<Segment, "order">, w: Working) => {
    segments.push({ ...s, order: w.segCount++ });
    return segments.length - 1;
  };

  const stepTips = (w: Working, tips: Tip[]) => {
    const r = w.rng;
    while (tips.length > 0 && segments.length < MAX_SEGMENTS) {
      for (let i = tips.length - 1; i >= 0; i--) {
        const tip = tips[i];
        const wander = (noise(tip.x * 0.006 + w.grain, tip.y * 0.006 + w.grain * 0.37) - 0.5) * 0.42;
        let dir = tip.dir + wander + rand(r, -0.06, 0.06);

        if (tip.target) {
          const dx = tip.target.x - tip.x, dy = tip.target.y - tip.y;
          const dd = Math.hypot(dx, dy);
          const pull = 0.1 + 0.4 * Math.max(0, 1 - dd / 320);
          dir = lerpAngle(dir, Math.atan2(dy, dx), pull);
          if (dd < 12) {
            if (tip.fuse) fuse(w, tip);
            tips.splice(i, 1);
            continue;
          }
        }

        const nx = tip.x + Math.cos(dir) * STEP, ny = tip.y + Math.sin(dir) * STEP;
        if (nx < 24 || ny < 24 || nx > W - 24 || ny > H - 24) { tips.splice(i, 1); continue; }

        const width = tip.dark ? 1.15 : Math.max(0.42, 1.0 - tip.gen * 0.17);
        const si = addSegment(
          { ax: tip.x, ay: tip.y, bx: nx, by: ny, w: width, c: w.index, dark: tip.dark, cord: false, mix: -1 },
          w,
        );
        tip.pathSegs.push(si);
        tip.x = nx; tip.y = ny; tip.dir = dir; tip.life--;

        if (!tip.target && !tip.dark) {
          w.rSum += Math.hypot(nx - w.x, ny - w.y); w.rN++;
        }

        if (tip.life <= 0) {
          if (tip.dark) darkDots.push({ x: nx, y: ny, c: w.index });
          else if (!tip.target) w.tipEnds.push({ x: nx, y: ny });
          tips.splice(i, 1);
          continue;
        }

        if (!tip.dark && !tip.target && tip.gen < 4 && tips.length < 120 && r() < 0.05 * Math.pow(0.62, tip.gen)) {
          const side = r() < 0.5 ? 1 : -1;
          tips.push({
            x: nx, y: ny, dir: dir + side * BRANCH_TURN, gen: tip.gen + 1,
            life: Math.floor(tip.life * 0.65), target: null, fuse: false, cross: false, dark: false, pathSegs: [],
          });
        }
      }
    }
  };

  // Anastomosis: the thread that reached its relation becomes a cord.
  const fuse = (w: Working, tip: Tip) => {
    const o = tip.target!;
    w.fused++; o.fused++;
    for (const si of tip.pathSegs) {
      const s = segments[si];
      s.w = Math.min(s.w * 2.1 + 0.5, 3.3);
      s.cord = true;
      if (tip.cross) s.mix = o.hue;
    }
    addSegment({ ax: tip.x, ay: tip.y, bx: o.x, by: o.y, w: 2.2, c: w.index, dark: false, cord: true, mix: tip.cross ? o.hue : -1 }, w);
    blooms.push({ x: tip.x, y: tip.y, hueA: w.hue, hueB: o.hue, cross: tip.cross, c: w.index, seed: w.rng() * 1000 });
    cords.push({ a: w, b: o, cross: tip.cross, path: tip.pathSegs.slice() });
  };

  for (const w of work) {
    w.segStart = segments.length;
    const c = w.input;
    const explanations = [...c.explanations].sort((a, b) => parseWhen(a.at) - parseWhen(b.at));

    if (explanations.length === 0) {
      // Met, not explained: a spore. A single short curl, and nothing else.
      let x = w.x, y = w.y, dir = w.baseAngle;
      for (let i = 0; i < 4; i++) {
        dir += 0.5;
        const nx = x + Math.cos(dir) * 2.6, ny = y + Math.sin(dir) * 2.6;
        addSegment({ ax: x, ay: y, bx: nx, by: ny, w: 0.8, c: w.index, dark: false, cord: false, mix: -1 }, w);
        x = nx; y = ny;
      }
    }

    explanations.forEach((e, k) => {
      const depth = DEPTH_WEIGHT[e.depth] * STATUS_WEIGHT[e.status];
      if (k > 0) {
        // Re-explaining thickens what is there before it extends. Depth outgrows breadth.
        for (let si = w.segStart; si < segments.length; si++) {
          const s = segments[si];
          if (s.c === w.index && !s.dark && !s.cord) s.w = Math.min(s.w + 0.4, 2.6);
        }
      }
      const tips: Tip[] = [];
      const nFree = k === 0 ? 2 + Math.floor(depth * 4) : 1 + Math.floor(depth * 2);
      for (let i = 0; i < nFree; i++) {
        tips.push({
          x: w.x, y: w.y, dir: w.baseAngle + (k * 3 + i) * GOLDEN + rand(w.rng, -0.25, 0.25),
          gen: 0, life: Math.floor((12 + depth * 44 * rand(w.rng, 0.6, 1.4)) * budget),
          target: null, fuse: false, cross: false, dark: false, pathSegs: [],
        });
      }
      if (k === 0) {
        for (const l of launches.get(w.index) ?? []) {
          const dd = Math.hypot(l.target.x - w.x, l.target.y - w.y);
          tips.push({
            x: w.x, y: w.y, dir: Math.atan2(l.target.y - w.y, l.target.x - w.x) + rand(w.rng, -0.7, 0.7),
            gen: 0, life: Math.floor((dd / STEP) * (l.fuse ? 1.6 : 0.55) + 14),
            target: l.target, fuse: l.fuse, cross: l.cross, dark: false, pathSegs: [],
          });
        }
        for (let m = 0; m < Math.min(3, c.misconceptions); m++) {
          tips.push({
            x: w.x, y: w.y, dir: w.rng() * Math.PI * 2, gen: 2, life: 9 + Math.floor(w.rng() * 6),
            target: null, fuse: false, cross: false, dark: true, pathSegs: [],
          });
        }
      }
      stepTips(w, tips);
    });

    if (c.openQuestion && explanations.length > 0) {
      const f = fields[w.fieldIndex];
      let dir = Math.atan2(w.y - f.y, w.x - f.x) + rand(w.rng, -0.5, 0.5);
      let x = w.x, y = w.y;
      const pts: number[] = [x, y];
      const n = 70 + Math.floor(w.rng() * 40);
      for (let i = 0; i < n; i++) {
        dir += (noise(x * 0.01 + w.grain + 17, y * 0.01) - 0.5) * 0.36;
        x += Math.cos(dir) * 1.6; y += Math.sin(dir) * 1.6;
        if (x < 30 || y < 30 || x > W - 30 || y > H - 30) dir += Math.PI;
        pts.push(x, y);
      }
      seekers.push({ c: w.index, pts: Float32Array.from(pts) });
    }

    if (c.retainedAt) {
      const t = (now - parseWhen(c.retainedAt)) / (SETTLE_DAYS * DAY);
      w.settle = Math.min(1, Math.max(0, t));
      w.sigma = Math.min(165, Math.max(34, w.rN ? (w.rSum / w.rN) * 0.95 : 40));
    }
  }

  // --- Ground: a heightfield that is only ever added to ---------------------
  // Higher than the content alone would need, since the world now carries a
  // real fog margin around it (see WORLD_MARGIN in placeMindscape).
  const G = 170;
  const CELL = W / G;
  const ground = new Float32Array(G * G);
  const tint = new Float32Array(G * G * 3);
  const tintW = new Float32Array(G * G);
  const relief = new Float32Array(G * G);
  for (let gy = 0; gy < G; gy++) for (let gx = 0; gx < G; gx++) {
    relief[gy * G + gx] = noise(gx * 0.045 + 300, gy * 0.045 + 300) * 0.6 + noise(gx * 0.12 + 900, gy * 0.12 + 900) * 0.4;
  }
  const HUE_RGB = [[184, 134, 59], [63, 127, 130], [181, 86, 106], [93, 107, 138], [111, 138, 74], [169, 96, 58]];
  const conceptHeight = (w: Working) => Math.min(1.1, 0.3 + 0.16 * w.input.explanations.length + 0.12 * w.fused);

  for (const w of work) {
    if (w.settle <= 0) continue;
    const h = conceptHeight(w) * w.settle;
    const sg = w.sigma / CELL, cx = w.x / CELL - 0.5, cy = w.y / CELL - 0.5;
    const rr = Math.ceil(sg * 3.6);
    const hue = HUE_RGB[w.hue];
    for (let gy = Math.max(0, Math.floor(cy - rr)); gy <= Math.min(G - 1, Math.ceil(cy + rr)); gy++) {
      for (let gx = Math.max(0, Math.floor(cx - rr)); gx <= Math.min(G - 1, Math.ceil(cx + rr)); gx++) {
        const dx = gx - cx, dy = gy - cy;
        // The footprint is a Gaussian whose radius varies with direction, so
        // every hill has its own shape and two hills never look alike.
        const shape = 0.7 + 0.6 * noise(gx * 0.09 + w.grain, gy * 0.09 + w.grain * 0.61);
        const inv = 1 / (2 * sg * sg * shape);
        const g = h * Math.exp(-(dx * dx + dy * dy) * inv);
        if (g < 0.002) continue;
        const idx = gy * G + gx;
        ground[idx] += g;
        tint[idx * 3] += hue[0] * g; tint[idx * 3 + 1] += hue[1] * g; tint[idx * 3 + 2] += hue[2] * g; tintW[idx] += g;
      }
    }
  }
  for (const cd of cords) {
    const st = Math.min(cd.a.settle, cd.b.settle);
    if (st <= 0) continue;
    const hh = (cd.cross ? 0.62 : 0.4) * Math.min(conceptHeight(cd.a), conceptHeight(cd.b)) * st;
    const sg = (cd.cross ? 30 : 22) / CELL, inv = 1 / (2 * sg * sg), rr = Math.ceil(sg * 3);
    const ha = HUE_RGB[cd.a.hue], hb = HUE_RGB[cd.b.hue];
    const hue = [(ha[0] + hb[0]) / 2, (ha[1] + hb[1]) / 2, (ha[2] + hb[2]) / 2];
    const pts: [number, number][] = [];
    for (let i = 0; i < cd.path.length; i += 4) { const s = segments[cd.path[i]]; pts.push([s.ax / CELL - 0.5, s.ay / CELL - 0.5]); }
    pts.push([cd.b.x / CELL - 0.5, cd.b.y / CELL - 0.5]);
    for (const [px, py] of pts) {
      for (let gy = Math.max(0, Math.floor(py - rr)); gy <= Math.min(G - 1, Math.ceil(py + rr)); gy++) {
        for (let gx = Math.max(0, Math.floor(px - rr)); gx <= Math.min(G - 1, Math.ceil(px + rr)); gx++) {
          const dx = gx - px, dy = gy - py;
          const g = hh * Math.exp(-(dx * dx + dy * dy) * inv);
          if (g < 0.002) continue;
          const idx = gy * G + gx;
          ground[idx] = Math.max(ground[idx], g);
          tint[idx * 3] += hue[0] * g * 0.3; tint[idx * 3 + 1] += hue[1] * g * 0.3; tint[idx * 3 + 2] += hue[2] * g * 0.3; tintW[idx] += g * 0.3;
        }
      }
    }
  }
  let maxHeight = 0;
  for (let i = 0; i < G * G; i++) {
    ground[i] += relief[i] * 0.07;
    if (ground[i] > maxHeight) maxHeight = ground[i];
  }
  const contours: Contour[] = [];
  let li = 0;
  for (let level = 0.1; level <= maxHeight; level += 0.07, li++) {
    const segs = marchingSquares(ground, G, CELL, level);
    if (segs.length) contours.push({ level, index: li % 4 === 0, segs: Float32Array.from(segs) });
  }

  // --- Assemble ---------------------------------------------------------------
  const placed: PlacedConcept[] = work.map((w) => ({
    id: w.input.id,
    name: w.input.name,
    slug: w.input.slug,
    x: w.x,
    y: w.y,
    hue: w.hue,
    fieldIndex: w.fieldIndex,
    standing: w.input.standing,
    settle: w.settle,
    live: now - parseWhen(w.input.lastTouchedAt) <= 14 * DAY,
    tipEnds: w.tipEnds.slice(-6),
    segmentCount: w.segCount,
    explained: w.input.explanations.length > 0,
  }));

  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const grow = (x: number, y: number, pad = 0) => {
    if (x - pad < x0) x0 = x - pad; if (y - pad < y0) y0 = y - pad;
    if (x + pad > x1) x1 = x + pad; if (y + pad > y1) y1 = y + pad;
  };
  for (const s of segments) { grow(s.ax, s.ay); grow(s.bx, s.by); }
  for (const p of placed) grow(p.x, p.y, 40);
  for (const w of work) if (w.settle > 0) grow(w.x, w.y, w.sigma * 2.2);
  for (const q of seekers) for (let i = 0; i < q.pts.length; i += 2) grow(q.pts[i], q.pts[i + 1], 10);
  if (!Number.isFinite(x0)) { x0 = W * 0.25; y0 = H * 0.25; x1 = W * 0.75; y1 = H * 0.75; }

  return {
    width: W, height: H, grid: G, cell: CELL,
    fields, concepts: placed, points: placed,
    segments, blooms, darkDots, seekers,
    ground, tint, tintW, relief, contours, maxHeight,
    bounds: { x0, y0, x1, y1 },
  };
}

function marchingSquares(field: Float32Array, G: number, CELL: number, l: number): number[] {
  const out: number[] = [];
  const px = (gx: number, f: number) => (gx + 0.5 + f) * CELL;
  const py = (gy: number, f: number) => (gy + 0.5 + f) * CELL;
  for (let gy = 0; gy < G - 1; gy++) {
    for (let gx = 0; gx < G - 1; gx++) {
      const v0 = field[gy * G + gx], v1 = field[gy * G + gx + 1];
      const v2 = field[(gy + 1) * G + gx + 1], v3 = field[(gy + 1) * G + gx];
      const idx = (v0 > l ? 8 : 0) | (v1 > l ? 4 : 0) | (v2 > l ? 2 : 0) | (v3 > l ? 1 : 0);
      if (idx === 0 || idx === 15) continue;
      const T = [px(gx, (l - v0) / (v1 - v0)), py(gy, 0)];
      const R = [px(gx, 1), py(gy, (l - v1) / (v2 - v1))];
      const B = [px(gx, (l - v3) / (v2 - v3)), py(gy, 1)];
      const L = [px(gx, 0), py(gy, (l - v0) / (v3 - v0))];
      const push = (...pts: number[][]) => { for (const p of pts) out.push(p[0], p[1]); };
      switch (idx) {
        case 1: case 14: push(L, B); break;
        case 2: case 13: push(B, R); break;
        case 3: case 12: push(L, R); break;
        case 4: case 11: push(T, R); break;
        case 5: push(L, T, B, R); break;
        case 6: case 9: push(T, B); break;
        case 7: case 8: push(L, T); break;
        case 10: push(T, R, L, B); break;
      }
    }
  }
  return out;
}

/** The six field hues, day and night, matching globals.css. */
export const FIELD_HUES = {
  day: ["#b8863b", "#3f7f82", "#b5566a", "#5d6b8a", "#6f8a4a", "#a9603a"],
  night: ["#cfa04f", "#5a9ea1", "#c9738a", "#8093b3", "#8ba566", "#c47a52"],
};
