/**
 * Grove: the same knowledge state as a stand of trees along one ground
 * line, several across the width — not one central tree, not a node
 * graph wearing bark. A domain with little learning in it is a sapling:
 * a thin stem, a leaf or two. A domain returned to again and again grows
 * a real tree: a thicker trunk, branches at heights fixed by when each
 * concept was first met, foliage along every explained branch, and a
 * flower where a synthesis — a connection across domains — took hold.
 * One long root system runs under the whole grove, and a domain bridged
 * to another sends a root sideways to meet it, alongside the aerial
 * tendril above.
 *
 * Positions are seeded from identity (placeMindscape's per-concept rng),
 * but the trees' own arrangement is Grove's: a horizontal line, not
 * Ground's colony scatter, because a grove has its own geography.
 */

import {
  DAY,
  GOLDEN,
  hash32,
  makeNoise,
  mulberry32,
  parseWhen,
  placeMindscape,
  rand,
  type MapInput,
  type MapPoint,
  type PlacedField,
  type Working,
} from "./engine";
import { aggregateDomainWeight } from "./weight";
import type { Standing } from "@/lib/knowledge";

export interface GroveLeaf {
  x: number;
  y: number;
  r: number;
  flower: boolean;
}

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
  leaves: GroveLeaf[];
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
  /** computeRelationWeight output — drives tendril thickness. */
  weight: number;
}

export interface GroveRoot {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  cx: number;
  cy: number;
  hueA: number;
  hueB: number;
}

/** A small ambient sub-branch off a real branch — pure fullness, no id,
 * not a concept, not clickable. Canopy density without graph complexity. */
export interface GroveTwig {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  cx: number;
  cy: number;
  hue: number;
  thickness: number;
  leaves: GroveLeaf[];
}

/** A tiny unlabeled plant along the ground line, filling the width between
 * the real trees. Never a field, never clickable. */
export interface GroveSapling {
  x: number;
  baseY: number;
  topY: number;
  hue: number;
  leaves: { x: number; y: number; r: number }[];
}

/** A drifting seed or mote of pollen, purely atmospheric. */
export interface GrovePollen {
  x: number;
  y: number;
  r: number;
  hue: number;
  a: number;
}

export interface GroveTrunk {
  x: number;
  baseY: number;
  topY: number;
  hue: number;
  name: string;
  sapling: boolean;
  width: number;
}

/** A faint, distant silhouette on the horizon — pure atmosphere, always
 * present so the sky above the grove is never simply blank. */
export interface GroveHorizonTree {
  x: number;
  h: number;
  w: number;
}

export interface GroveModel {
  width: number;
  height: number;
  groundY: number;
  grid: number;
  cell: number;
  relief: Float32Array;
  fields: PlacedField[];
  trunks: GroveTrunk[];
  branches: GroveBranch[];
  twigs: GroveTwig[];
  tendrils: GroveTendril[];
  roots: GroveRoot[];
  saplings: GroveSapling[];
  pollen: GrovePollen[];
  horizon: GroveHorizonTree[];
  points: MapPoint[];
  bounds: { x0: number; y0: number; x1: number; y1: number };
}

export function buildGrove(input: MapInput): GroveModel {
  const now = input.now ?? Date.now();
  // placeMindscape gives us per-concept identity (rng, hue, field, angle) —
  // reused for its determinism — but not its positions: the grove lays
  // itself out on its own ground line.
  const { fields, work } = placeMindscape(input);

  const byField = new Map<number, Working[]>();
  for (const w of work) byField.set(w.fieldIndex, [...(byField.get(w.fieldIndex) ?? []), w]);
  const fieldOrder = [...byField.keys()].sort((a, b) => {
    const ea = Math.min(...byField.get(a)!.map((w) => w.born));
    const eb = Math.min(...byField.get(b)!.map((w) => w.born));
    return ea - eb;
  });

  const N = Math.max(1, fieldOrder.length);
  const SLOT = 380;
  // Generous even with one or two fields: a grove fills a hero width, not
  // just the trees it strictly needs.
  const worldW = Math.max(1900, SLOT * N + 420);
  const worldH = 760;
  const groundY = worldH * 0.72;

  const trunks: GroveTrunk[] = [];
  const branches: GroveBranch[] = [];
  const twigs: GroveTwig[] = [];
  const tendrils: GroveTendril[] = [];

  const trunkX = new Map<number, number>();
  fieldOrder.forEach((fi, i) => {
    const slotCenter = 120 + SLOT * (i + 0.5);
    const jitter = (mulberry32(hash32("slotx:" + input.seed + fields[fi].name))() - 0.5) * SLOT * 0.28;
    trunkX.set(fi, slotCenter + jitter);
  });

  for (const fi of fieldOrder) {
    const members = byField.get(fi)!;
    const f = fields[fi];
    const ordered = [...members].sort((a, b) => a.born - b.born || a.input.id.localeCompare(b.input.id));
    const totalExtent = aggregateDomainWeight(
      ordered.filter((w) => w.input.explanations.length > 0).map((w) => w.input.knowledgeWeight),
    );
    const sapling = totalExtent < 0.15 && ordered.length <= 2;
    const x = trunkX.get(fi)!;
    const baseY = groundY;
    // totalExtent is now the saturating domain rollup (see aggregateDomainWeight)
    // rather than an unbounded per-member sum, so it's scaled up here to
    // still fill the same canopy/trunk/topY ranges as before.
    const canopy = Math.max(70, Math.min(340, 50 + totalExtent * 260 + ordered.length * 12));
    const topY = baseY - (sapling ? 50 + totalExtent * 220 : canopy + 40);
    const trunkWidth = sapling ? 1.6 : Math.min(9, 2.4 + totalExtent * 11);
    trunks.push({ x, baseY, topY, hue: f.hue, name: f.name, sapling, width: trunkWidth });

    // Branches attach evenly from just above the ground to just under the
    // crown, in the order their concepts were first met.
    const attachTop = topY + 12, attachBottom = baseY - 18;
    ordered.forEach((w, i) => {
      const attachFrac = ordered.length > 1 ? i / (ordered.length - 1) : 0.4;
      const attachY = attachBottom - attachFrac * (attachBottom - attachTop);
      const side = i % 2 === 0 ? 1 : -1;
      const extent = w.input.knowledgeWeight;
      const explained = w.input.explanations.length > 0;
      const length = sapling ? 22 + extent * 34 : explained ? 46 + extent * 150 : 16;
      const thickness = explained ? Math.min(1 + w.input.reinforcement * 7, 5.5) : 0.9;
      // An angle from vertical, wider toward the crown so the silhouette
      // reads as a tree rather than a row of spikes.
      const angle = side * (0.28 + (1 - attachFrac) * 0.35 + w.rng() * 0.22);
      const bend = (w.rng() - 0.5) * length * 0.35;

      const x0 = x, y0 = attachY;
      const dx = Math.sin(angle) * length, dy = -Math.cos(angle) * length;
      const x1 = x0 + dx, y1 = y0 + dy;
      const cx = x0 + dx * 0.5 + side * bend, cy = y0 + dy * 0.5 - Math.abs(bend) * 0.3;

      const lastCorrect = [...w.input.explanations].reverse().find((e) => e.status === "correct");
      const weak = w.input.misconceptions > 0 && (!lastCorrect || parseWhen(lastCorrect.at) < now - 21 * DAY);

      // Foliage along every explained branch, denser with depth and revisits
      // — a full, layered canopy rather than a scatter of dots.
      const leaves: GroveLeaf[] = [];
      if (explained && !weak) {
        const n = Math.round(6 + extent * 14 + w.input.reinforcement * 12);
        for (let k = 0; k < n; k++) {
          const t = 0.22 + (k / Math.max(1, n - 1)) * 0.8;
          const along = { x: x0 + dx * t + Math.sin(t * 3) * bend * 0.4, y: y0 + dy * t };
          const a = rand(w.rng, 0, Math.PI * 2) + k * GOLDEN;
          const r = 7 + w.rng() * 11;
          leaves.push({ x: along.x + Math.cos(a) * r, y: along.y + Math.sin(a) * r * 0.7, r: 3.4 + w.rng() * 3, flower: false });
        }
      }

      branches.push({
        id: w.input.id, name: w.input.name, slug: w.input.slug, fieldIndex: fi, hue: w.hue,
        x0, y0, x1, y1, cx, cy, thickness, standing: w.input.standing,
        bud: !explained, weak, live: now - parseWhen(w.input.lastTouchedAt) <= 14 * DAY,
        settle: w.input.retainedAt ? Math.min(1, Math.max(0, (now - parseWhen(w.input.retainedAt)) / (28 * DAY))) : 0,
        leaves,
      });

      // Ambient twigs: two or three smaller sub-branches off the real one,
      // each with its own little cluster of leaves or buds — canopy
      // fullness that doesn't add a single new node to the knowledge model.
      if (explained && !weak) {
        const nTwigs = 2 + Math.floor(w.rng() * 2);
        for (let ti = 0; ti < nTwigs; ti++) {
          const t = 0.45 + w.rng() * 0.45;
          const tx0 = x0 + dx * t, ty0 = y0 + dy * t;
          const tSide = w.rng() < 0.5 ? -1 : 1;
          const tAngle = angle + tSide * (0.5 + w.rng() * 0.5);
          const tLen = length * (0.28 + w.rng() * 0.22);
          const tdx = Math.sin(tAngle) * tLen, tdy = -Math.cos(tAngle) * tLen * 0.8;
          const tx1 = tx0 + tdx, ty1 = ty0 + tdy;
          const tcx = tx0 + tdx * 0.5, tcy = ty0 + tdy * 0.5;
          const twigLeaves: GroveLeaf[] = [];
          const nl = 2 + Math.floor(w.rng() * 4);
          for (let k = 0; k < nl; k++) {
            const lt = 0.3 + (k / Math.max(1, nl - 1)) * 0.75;
            const a2 = rand(w.rng, 0, Math.PI * 2);
            const r2 = 4 + w.rng() * 4;
            twigLeaves.push({
              x: tx0 + tdx * lt + Math.cos(a2) * r2, y: ty0 + tdy * lt + Math.sin(a2) * r2 * 0.7,
              r: 2.2 + w.rng() * 1.8, flower: false,
            });
          }
          twigs.push({ x0: tx0, y0: ty0, x1: tx1, y1: ty1, cx: tcx, cy: tcy, hue: w.hue, thickness: Math.max(0.6, thickness * 0.4), leaves: twigLeaves });
        }
      }
    });
  }

  // Tendrils: connections stated in the learner's own words. A flower marks
  // the branch tip at each end — the important-synthesis mark.
  const byId = new Map(work.map((w) => [w.input.id, w]));
  const branchById = new Map(branches.map((b) => [b.id, b]));
  const bridgedFields = new Set<string>();
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
    const lift = Math.min(80, Math.hypot(bb.x1 - ba.x1, bb.y1 - ba.y1) * 0.3);
    tendrils.push({
      ax: ba.x1, ay: ba.y1, bx: bb.x1, by: bb.y1, cx: mx, cy: my - lift,
      hueA: ba.hue, hueB: bb.hue, cross, fx: mx, fy: my - lift, weight: r.weight,
    });
    ba.leaves.push({ x: ba.x1, y: ba.y1, r: 5, flower: true });
    bb.leaves.push({ x: bb.x1, y: bb.y1, r: 5, flower: true });
    if (cross) { bridgedFields.add([a.fieldIndex, b.fieldIndex].sort().join("|")); }
  }

  // One root system under the whole grove; a bridged pair of domains sends
  // a root sideways to meet, the underground echo of the aerial tendril.
  // Every real tree also sends a few of its own roots down and out, so the
  // ground reads as inhabited, not just the canopy.
  const rootsNoise = makeNoise(hash32("roots:" + input.seed));
  const roots: GroveRoot[] = [];
  for (const key of bridgedFields) {
    const [fa, fb] = key.split("|").map(Number);
    const xa = trunkX.get(fa)!, xb = trunkX.get(fb)!;
    const dip = 20 + Math.abs(xb - xa) * 0.06;
    roots.push({
      ax: xa, ay: groundY + 8, bx: xb, by: groundY + 8,
      cx: (xa + xb) / 2, cy: groundY + 8 + dip,
      hueA: fields[fa].hue, hueB: fields[fb].hue,
    });
  }
  const rootRng = mulberry32(hash32("rootbranch:" + input.seed));
  for (const t of trunks) {
    if (t.sapling) continue;
    const nRoots = 2 + Math.floor(rootRng() * 2);
    for (let i = 0; i < nRoots; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      const len = (30 + t.width * 8) * (0.6 + rootRng() * 0.7);
      const ax = t.x, ay = t.baseY + 4;
      const bx = t.x + side * len, by = t.baseY + 10 + rootRng() * 14;
      roots.push({
        ax, ay, bx, by, cx: (ax + bx) / 2, cy: ay + (by - ay) * 0.4,
        hueA: t.hue, hueB: t.hue,
      });
    }
  }

  // Ambient saplings: small unlabeled plants filling the ground line
  // between and around the real trees, so the whole width feels grown-in.
  const sapRng = mulberry32(hash32("saplings:" + input.seed));
  const saplings: GroveSapling[] = [];
  const trunkXs = [...trunkX.values()];
  const nSaplings = Math.round(worldW / 70);
  for (let i = 0; i < nSaplings; i++) {
    const x = 40 + sapRng() * (worldW - 80);
    const tooClose = trunkXs.some((tx) => Math.abs(tx - x) < 46);
    if (tooClose) continue;
    const h = 10 + sapRng() * sapRng() * 32;
    const baseY = groundY + sapRng() * 4;
    const topY = baseY - h;
    const hue = Math.floor(sapRng() * 6);
    const leaves: { x: number; y: number; r: number }[] = [];
    const nl = 1 + Math.floor(sapRng() * 3);
    for (let k = 0; k < nl; k++) {
      const t = 0.5 + (k / Math.max(1, nl)) * 0.5;
      const side = k % 2 === 0 ? 1 : -1;
      leaves.push({ x: x + side * (3 + sapRng() * 5), y: baseY - h * t, r: 2 + sapRng() * 2.2 });
    }
    saplings.push({ x, baseY, topY, hue, leaves });
  }

  // Pollen: a drift of small motes, some near the canopies, some loose in
  // the open air above the ground line.
  const polRng = mulberry32(hash32("pollen:" + input.seed));
  const pollen: GrovePollen[] = [];
  const nPollen = Math.round((worldW * worldH) / 26000);
  for (let i = 0; i < nPollen; i++) {
    pollen.push({
      x: polRng() * worldW,
      y: groundY - polRng() * polRng() * (groundY - 20),
      r: 1 + polRng() * 2.4,
      hue: Math.floor(polRng() * 6),
      a: 0.08 + polRng() * 0.16,
    });
  }

  let x0 = 0, y0 = 0, x1 = worldW, y1 = worldH;
  const grow = (x: number, y: number, pad = 0) => {
    if (x - pad < x0) x0 = x - pad; if (y - pad < y0) y0 = y - pad;
    if (x + pad > x1) x1 = x + pad; if (y + pad > y1) y1 = y + pad;
  };
  for (const t of trunks) grow(t.x, t.topY, 40);
  for (const b of branches) for (const l of b.leaves) grow(l.x, l.y, l.r + 6);

  const G = 100;
  const CELL = worldW / G;
  const noise = makeNoise(hash32("noise:" + input.seed));
  const relief = new Float32Array(G * G);
  for (let gy = 0; gy < G; gy++) for (let gx = 0; gx < G; gx++) {
    relief[gy * G + gx] = noise(gx * 0.045 + 300, gy * 0.045 + 300) * 0.6 + noise(gx * 0.12 + 900, gy * 0.12 + 900) * 0.4;
  }
  void rootsNoise;

  // Horizon: a faint, distant tree line spanning the whole width, always
  // present so the grove has atmosphere even before the first real tree.
  const horRng = mulberry32(hash32("horizon:" + input.seed));
  const horizon: GroveHorizonTree[] = [];
  const nHorizon = Math.round(worldW / 55);
  for (let i = 0; i < nHorizon; i++) {
    horizon.push({
      x: (worldW / nHorizon) * (i + horRng() * 0.6),
      h: 26 + horRng() * horRng() * 60,
      w: 5 + horRng() * 6,
    });
  }

  return {
    width: worldW, height: worldH, groundY, grid: G, cell: CELL, relief,
    fields, trunks, branches, twigs, tendrils, roots, saplings, pollen, horizon,
    points: branches.map((b) => ({ id: b.id, name: b.name, slug: b.slug, x: b.x1, y: b.y1 })),
    bounds: { x0, y0, x1, y1 },
  };
}
