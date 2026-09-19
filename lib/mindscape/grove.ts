/**
 * Grove: the same knowledge state as a stand of trees, one per field. A
 * concept is a branch off its field's trunk, attached at a fixed height
 * forever — a concept learned in month three stays at that height no
 * matter what grows later. Branch length is depth of understanding,
 * thickness is revisits, foliage is retention. A bridge is a tendril
 * arcing from one tree to another with a flower at the join. Weak
 * knowledge is winter: pale, bare, drooping, not damage.
 *
 * Shares placement with Ground (placeMindscape): the same seed produces
 * the same positions in every climate, so a person's map is recognizably
 * theirs no matter which weather they choose to see it in.
 */

import {
  DAY,
  DEPTH_WEIGHT,
  GOLDEN,
  STATUS_WEIGHT,
  hash32,
  makeNoise,
  parseWhen,
  placeMindscape,
  rand,
  type MapInput,
  type MapPoint,
  type PlacedField,
  type Working,
} from "./engine";
import type { Standing } from "@/lib/knowledge";

export interface GroveBranch {
  id: string;
  name: string;
  slug: string;
  fieldIndex: number;
  hue: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  cx: number;
  cy: number;
  thickness: number;
  standing: Standing;
  bud: boolean;
  weak: boolean;
  live: boolean;
  settle: number;
  leaves: { x: number; y: number; r: number }[];
}

export interface GroveTendril {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  cx: number;
  cy: number;
  hueA: number;
  hueB: number;
  cross: boolean;
  fx: number;
  fy: number;
}

export interface GroveTrunk {
  x: number;
  baseY: number;
  topY: number;
  hue: number;
  name: string;
}

export interface GroveModel {
  width: number;
  height: number;
  /** A soft grain across the whole world — the ground everything grows on,
   * not tied to any one field. Same shape as Ground's relief pass. */
  grid: number;
  cell: number;
  relief: Float32Array;
  fields: PlacedField[];
  trunks: GroveTrunk[];
  branches: GroveBranch[];
  tendrils: GroveTendril[];
  points: MapPoint[];
  bounds: { x0: number; y0: number; x1: number; y1: number };
}

function extentOf(w: Working): number {
  let sum = 0;
  for (const e of w.input.explanations) sum += DEPTH_WEIGHT[e.depth] * STATUS_WEIGHT[e.status];
  return Math.min(1, sum / 2.2);
}

export function buildGrove(input: MapInput): GroveModel {
  const now = input.now ?? Date.now();
  const { W, H, fields, work } = placeMindscape(input);

  // One trunk per field, growing upward from the field's own y. Height is
  // fixed additively per concept, in first-encounter order, so a branch's
  // attach height never moves once placed.
  const byField = new Map<number, Working[]>();
  for (const w of work) byField.set(w.fieldIndex, [...(byField.get(w.fieldIndex) ?? []), w]);

  const trunks: GroveTrunk[] = [];
  const branches: GroveBranch[] = [];
  const tendrils: GroveTendril[] = [];
  const STEP_HEIGHT = 34;

  for (const [fi, members] of byField) {
    const f = fields[fi];
    const ordered = [...members].sort((a, b) => a.born - b.born || a.input.id.localeCompare(b.input.id));
    const baseY = f.y + 40;
    const topY = baseY - Math.max(60, ordered.length * STEP_HEIGHT * 0.55 + 40);
    trunks.push({ x: f.x, baseY, topY, hue: f.hue, name: f.name });

    ordered.forEach((w, i) => {
      const attachY = baseY - 24 - i * STEP_HEIGHT;
      const side = i % 2 === 0 ? 1 : -1;
      const jitter = (w.rng() - 0.5) * 0.5;
      const angle = side * (0.55 + jitter * 0.3) + Math.PI * (side > 0 ? 1.5 : 1.5);
      const extent = extentOf(w);
      const explained = w.input.explanations.length > 0;
      const length = explained ? 26 + extent * 90 : 10;
      const thickness = explained ? Math.min(1 + w.input.explanations.length * 0.9, 5.5) : 1;
      const bend = (w.rng() - 0.5) * length * 0.6;

      const x0 = f.x, y0 = attachY;
      const dx = Math.cos(angle) * length, dy = -Math.abs(Math.sin(angle)) * length * 0.7 - length * 0.25;
      const x1 = x0 + dx, y1 = y0 + dy;
      const cx = x0 + dx * 0.5 + side * bend, cy = y0 + dy * 0.5;

      // Weak: a misconception standing with nothing correcting it since.
      const lastCorrect = [...w.input.explanations].reverse().find((e) => e.status === "correct");
      const weak = w.input.misconceptions > 0 && (!lastCorrect || parseWhen(lastCorrect.at) < now - 21 * DAY);

      const leaves: { x: number; y: number; r: number }[] = [];
      if (w.input.standing === "Retained") {
        const n = 5 + Math.floor(w.rng() * 4);
        for (let k = 0; k < n; k++) {
          const a = rand(w.rng, 0, Math.PI * 2) + k * GOLDEN;
          const r = 6 + w.rng() * 10;
          leaves.push({ x: x1 + Math.cos(a) * r, y: y1 + Math.sin(a) * r * 0.7, r: 2.4 + w.rng() * 1.8 });
        }
      }

      branches.push({
        id: w.input.id, name: w.input.name, slug: w.input.slug, fieldIndex: fi, hue: w.hue,
        x0, y0, x1, y1, cx, cy, thickness, standing: w.input.standing,
        bud: !explained, weak, live: now - parseWhen(w.input.lastTouchedAt) <= 14 * DAY,
        settle: w.input.retainedAt ? Math.min(1, Math.max(0, (now - parseWhen(w.input.retainedAt)) / (28 * DAY))) : 0,
        leaves,
      });
    });
  }

  const byId = new Map(work.map((w) => [w.input.id, w]));
  const branchById = new Map(branches.map((b) => [b.id, b]));
  const seenPair = new Set<string>();
  for (const r of input.relations) {
    if (r.source !== "explained" && r.source !== "manual") continue;
    const a = byId.get(r.fromId), b = byId.get(r.toId);
    if (!a || !b || a === b) continue;
    const key = [a.input.id, b.input.id].sort().join("|");
    if (seenPair.has(key)) continue;
    seenPair.add(key);
    const ba = branchById.get(a.input.id), bb = branchById.get(b.input.id);
    if (!ba || !bb) continue;
    const cross = a.fieldIndex !== b.fieldIndex;
    const mx = (ba.x1 + bb.x1) / 2, my = (ba.y1 + bb.y1) / 2;
    const lift = Math.min(70, Math.hypot(bb.x1 - ba.x1, bb.y1 - ba.y1) * 0.25);
    tendrils.push({
      ax: ba.x1, ay: ba.y1, bx: bb.x1, by: bb.y1, cx: mx, cy: my - lift,
      hueA: ba.hue, hueB: bb.hue, cross, fx: mx, fy: my - lift,
    });
  }

  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const grow = (x: number, y: number, pad = 0) => {
    if (x - pad < x0) x0 = x - pad; if (y - pad < y0) y0 = y - pad;
    if (x + pad > x1) x1 = x + pad; if (y + pad > y1) y1 = y + pad;
  };
  for (const t of trunks) { grow(t.x, t.baseY, 20); grow(t.x, t.topY, 20); }
  for (const b of branches) { grow(b.x0, b.y0); grow(b.x1, b.y1, 20); for (const l of b.leaves) grow(l.x, l.y, l.r); }
  if (!Number.isFinite(x0)) { x0 = W * 0.3; y0 = H * 0.3; x1 = W * 0.7; y1 = H * 0.7; }

  const G = 90;
  const CELL = W / G;
  const noise = makeNoise(hash32("noise:" + input.seed));
  const relief = new Float32Array(G * G);
  for (let gy = 0; gy < G; gy++) for (let gx = 0; gx < G; gx++) {
    relief[gy * G + gx] = noise(gx * 0.045 + 300, gy * 0.045 + 300) * 0.6 + noise(gx * 0.12 + 900, gy * 0.12 + 900) * 0.4;
  }

  return {
    width: W, height: H, grid: G, cell: CELL, relief,
    fields, trunks, branches, tendrils,
    points: branches.map((b) => ({ id: b.id, name: b.name, slug: b.slug, x: b.x1, y: b.y1 })),
    bounds: { x0, y0, x1, y1 },
  };
}
