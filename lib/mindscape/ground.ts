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
  hash32,
  mulberry32,
  parseWhen,
  placeMindscape,
  type MapInput,
  type MapPoint,
  type PlacedField,
} from "./engine";
import { aggregateDomainWeight, saturate } from "./weight";
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
  /** computeRelationWeight output — drives filament thickness. */
  weight: number;
}

/** Purely decorative — the rest of the dish, never a concept. Three tiers
 * (far/mid/near) give the ecosystem depth: many tiny faint specks behind,
 * fewer, larger, more detailed organisms in front. */
export interface GroundDust {
  x: number;
  y: number;
  kind: "dot" | "rod" | "ring" | "burst" | "triangle" | "capsule" | "cluster" | "diatom";
  r: number;
  a: number;
  hue: number;
  rotation: number;
  /** Near-tier specimens carry a nucleus dot or two, like a tiny cell. */
  detail: boolean;
}

/** A soft, unlabeled translucent bubble — ambient depth behind and between
 * the real colonies, never a field. */
export interface GroundMembrane {
  x: number;
  y: number;
  r: number;
  hue: number;
  a: number;
}

/** A faint dotted thread between two nearby specimens — texture suggesting
 * a living dish, not a real relationship. */
export interface GroundTrail {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  hue: number;
  a: number;
}

export interface GroundModel {
  width: number;
  height: number;
  fields: PlacedField[];
  colonies: GroundColony[];
  cells: GroundCell[];
  filaments: GroundFilament[];
  membranes: GroundMembrane[];
  dust: GroundDust[];
  trails: GroundTrail[];
  points: MapPoint[];
  bounds: { x0: number; y0: number; x1: number; y1: number };
}

export function buildGroundEcosystem(input: MapInput): GroundModel {
  const now = input.now ?? Date.now();
  const { W, H, fields, work } = placeMindscape(input);
  const byId = new Map(work.map((w) => [w.input.id, w]));

  const cells: GroundCell[] = work.map((w) => {
    const extent = w.input.knowledgeWeight;
    const explained = w.input.explanations.length > 0;
    const lastCorrect = [...w.input.explanations].reverse().find((e) => e.status === "correct");
    const weak = w.input.misconceptions > 0 && (!lastCorrect || parseWhen(lastCorrect.at) < now - 21 * DAY);
    return {
      id: w.input.id, name: w.input.name, slug: w.input.slug, fieldIndex: w.fieldIndex, hue: w.hue,
      x: w.x, y: w.y,
      r: explained ? 6 + extent * 15 : 3,
      rod: hash32("rod:" + w.input.id) % 5 === 0,
      organelles: Math.round(w.input.reinforcement * 5),
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
      hueA: ca.hue, hueB: cb.hue, cross, dotted: r.source === "llm_inferred", weight: r.weight,
    });
  }

  // Colonies: a soft membrane sized by how developed the field is overall,
  // with diminishing returns so many trivial cells can't outgrow a few
  // deeply developed ones.
  const colonies: GroundColony[] = fields.map((f) => {
    const members = work.filter((w) => w.fieldIndex === fields.indexOf(f));
    const domainWeight = aggregateDomainWeight(members.map((w) => w.input.knowledgeWeight));
    // A colony with more cells reads as fuller even before they've grown —
    // but only up to a small, saturating bump, so member count alone can
    // never be what makes a colony large.
    const radius = Math.max(46, Math.min(190, 46 + domainWeight * 144 + saturate(members.length, 6) * 20));
    return { name: f.name, x: f.x, y: f.y, hue: f.hue, radius, labelX: f.labelX, labelY: f.labelY };
  });

  // Ambient membranes: soft unlabeled bubbles behind and between the real
  // colonies, so the dish reads as layered rather than flat.
  const mrng = mulberry32(hash32("membranes:" + input.seed));
  const membranes: GroundMembrane[] = [];
  const membraneCount = Math.round((W * H) / 70000);
  for (let i = 0; i < membraneCount; i++) {
    membranes.push({
      x: mrng() * W, y: mrng() * H,
      r: 34 + mrng() * mrng() * 170,
      hue: Math.floor(mrng() * 6),
      a: 0.035 + mrng() * 0.06,
    });
  }

  // Dust: the rest of the dish, in three depth tiers. Far is a haze of
  // tiny specks; mid fills the middle distance; near is a scatter of small
  // but genuine-looking organisms — capsules, clusters, diatoms — with a
  // nucleus dot or two, so the ecosystem feels inhabited at every scale.
  const rng = mulberry32(hash32("dust:" + input.seed));
  const dust: GroundDust[] = [];
  const farKinds: GroundDust["kind"][] = ["dot"];
  const midKinds: GroundDust["kind"][] = ["dot", "rod", "ring", "triangle"];
  const nearKinds: GroundDust["kind"][] = ["capsule", "cluster", "diatom", "rod", "burst", "ring"];
  const pushDust = (n: number, kinds: GroundDust["kind"][], rMin: number, rMax: number, aMin: number, aMax: number, detail: boolean) => {
    for (let i = 0; i < n; i++) {
      dust.push({
        x: rng() * W, y: rng() * H,
        kind: kinds[Math.floor(rng() * kinds.length)],
        r: rMin + rng() * (rMax - rMin),
        a: aMin + rng() * (aMax - aMin),
        hue: Math.floor(rng() * 6),
        rotation: rng() * Math.PI * 2,
        detail,
      });
    }
  };
  pushDust(Math.round((W * H) / 5200), farKinds, 0.6, 1.8, 0.05, 0.12, false);
  pushDust(Math.round((W * H) / 11000), midKinds, 1.6, 4.2, 0.08, 0.18, false);
  pushDust(Math.round((W * H) / 26000), nearKinds, 3.5, 8, 0.14, 0.28, true);

  // Trails: a faint dotted thread between some nearby near-tier specimens —
  // an ecosystem's texture, not a stated relationship.
  const trng = mulberry32(hash32("trails:" + input.seed));
  const trails: GroundTrail[] = [];
  const nearSpecimens = dust.filter((d) => d.detail);
  for (let i = 0; i < nearSpecimens.length; i++) {
    if (trng() > 0.4) continue;
    const a = nearSpecimens[i];
    let best: GroundDust | null = null, bd = 90;
    for (let j = 0; j < nearSpecimens.length; j++) {
      if (i === j) continue;
      const b = nearSpecimens[j];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < bd) { bd = d; best = b; }
    }
    if (best) trails.push({ ax: a.x, ay: a.y, bx: best.x, by: best.y, hue: a.hue, a: 0.06 + trng() * 0.08 });
  }

  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const c of colonies) {
    if (c.x - c.radius < x0) x0 = c.x - c.radius; if (c.y - c.radius < y0) y0 = c.y - c.radius;
    if (c.x + c.radius > x1) x1 = c.x + c.radius; if (c.y + c.radius > y1) y1 = c.y + c.radius;
  }
  if (!Number.isFinite(x0)) { x0 = W * 0.3; y0 = H * 0.3; x1 = W * 0.7; y1 = H * 0.7; }

  return {
    width: W, height: H, fields, colonies, cells, filaments, membranes, dust, trails,
    points: cells.map((c) => ({ id: c.id, name: c.name, slug: c.slug, x: c.x, y: c.y })),
    bounds: { x0, y0, x1, y1 },
  };
}
