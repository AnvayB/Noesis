/**
 * Drawing each climate's model onto a 2D canvas context. Pure with
 * respect to the DOM: the component passes in the palette, the view, and
 * any offscreen images, and a Node canvas can render the same picture
 * for checks.
 */

import { FIELD_HUES, type MapPoint } from "./engine";
import type { GroundModel } from "./ground";
import type { GroveModel } from "./grove";
import type { SkyModel } from "./sky";

export type RGB = [number, number, number];

export interface Palette {
  paper: RGB;
  ink: RGB;
  inkSoft: RGB;
  lamp: string;
  hues: RGB[];
  night: boolean;
}

export interface View {
  scale: number;
  tx: number;
  ty: number;
}

/** Any 2D context that can take an image of this shape; DOM or Node. */
export type Ctx2D = CanvasRenderingContext2D;
export type GroundImage = CanvasImageSource;

/** The minimal shape any climate's model exposes, so view-fitting and
 * pan/zoom clamping work the same for all three. */
export interface Viewable {
  width: number;
  height: number;
  bounds: { x0: number; y0: number; x1: number; y1: number };
  points: MapPoint[];
}

export function hexToRgb(h: string): RGB {
  const m = h.trim().match(/^#([0-9a-f]{6})$/i);
  if (!m) return [0, 0, 0];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export const rgba = (c: RGB, a: number) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
export const mix = (a: RGB, b: RGB, k: number): RGB => [
  a[0] + (b[0] - a[0]) * k,
  a[1] + (b[1] - a[1]) * k,
  a[2] + (b[2] - a[2]) * k,
];

// A restrained field palette: sage, olive, pale gold, warm amber, muted
// coral, dusty pink — the six field hues, shared by all three climates.
export const DEFAULT_PALETTE: { day: Palette; night: Palette } = {
  day: {
    paper: hexToRgb("#e9e6dd"),
    ink: hexToRgb("#1b2a33"),
    inkSoft: hexToRgb("#5b6770"),
    lamp: "#c99a2e",
    hues: FIELD_HUES.day.map(hexToRgb),
    night: false,
  },
  night: {
    paper: hexToRgb("#15191c"),
    ink: hexToRgb("#e6e1d6"),
    inkSoft: hexToRgb("#9aa3a8"),
    lamp: "#d8ad4a",
    hues: FIELD_HUES.night.map(hexToRgb),
    night: true,
  },
};

export function fitView(model: Viewable, w: number, h: number, ids?: Set<string>): View {
  const focused = !!ids && ids.size > 0;
  let x0: number, y0: number, x1: number, y1: number;

  if (focused) {
    const pts = model.points.filter((c) => ids!.has(c.id));
    if (pts.length > 0) {
      x0 = Math.min(...pts.map((p) => p.x)) - 180;
      y0 = Math.min(...pts.map((p) => p.y)) - 140;
      x1 = Math.max(...pts.map((p) => p.x)) + 180;
      y1 = Math.max(...pts.map((p) => p.y)) + 140;
    } else {
      ({ x0, y0, x1, y1 } = model.bounds);
    }
  } else if (model.points.length > 0) {
    // The whole-map view gravitates to where the learning actually is: a
    // density-weighted crop around the real concept points, not the full
    // geometric bounds. Sparse ambient decoration and a lone far-off
    // sapling or star barely move it; a field with many concepts naturally
    // has many points close together and pulls the frame toward it. When
    // development is even across fields this reduces to showing them all.
    const n = model.points.length;
    const mx = model.points.reduce((s, p) => s + p.x, 0) / n;
    const my = model.points.reduce((s, p) => s + p.y, 0) / n;
    const sx = Math.sqrt(model.points.reduce((s, p) => s + (p.x - mx) ** 2, 0) / n);
    const sy = Math.sqrt(model.points.reduce((s, p) => s + (p.y - my) ** 2, 0) / n);
    const K = 2.6;
    x0 = mx - Math.max(sx * K, 220); x1 = mx + Math.max(sx * K, 220);
    y0 = my - Math.max(sy * K, 180); y1 = my + Math.max(sy * K, 180);
  } else {
    ({ x0, y0, x1, y1 } = model.bounds);
  }

  const pad = 36;
  const bw = Math.max(240, x1 - x0), bh = Math.max(200, y1 - y0);
  const scale = Math.min((w - pad * 2) / bw, (h - pad * 2) / bh, 2.2);
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  // clampView enforces full "cover" of the viewport regardless — it raises
  // this scale and re-centers if the crop above would ever expose an edge.
  return clampView(model, { scale, tx: w / 2 - cx * scale, ty: h / 2 - cy * scale }, w, h);
}

/** Keep the world on screen: never panned entirely out of view, never absurdly scaled. */
export function clampView(model: Viewable, view: View, w: number, h: number): View {
  // "Cover" semantics: the world always fully fills the viewport, at any
  // pan or zoom position, the way a cropped photo never shows its own
  // edge. Zooming out is capped at exactly the point the world's width or
  // height would stop covering the frame — panning is capped the same way.
  const coverScale = Math.max(w / model.width, h / model.height);
  const scale = Math.min(6, Math.max(view.scale, coverScale));
  const ratio = scale / view.scale;
  let tx = w / 2 - (w / 2 - view.tx) * ratio;
  let ty = h / 2 - (h / 2 - view.ty) * ratio;
  tx = Math.min(0, Math.max(w - model.width * scale, tx));
  ty = Math.min(0, Math.max(h - model.height * scale, ty));
  return { scale, tx, ty };
}

/** A lamp glow for whatever is live, and a ring + name for whatever a view
 * is about — generic over any climate's points. */
export function drawGenericGlow(
  ctx: Ctx2D,
  points: MapPoint[],
  liveIds: Set<string>,
  highlightIds: Set<string>,
  pal: Palette,
  view: View,
  breathe: number,
) {
  const lamp = hexToRgb(pal.lamp);
  for (const p of points) {
    if (!liveIds.has(p.id)) continue;
    ctx.fillStyle = rgba(lamp, 0.16 * breathe);
    ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = rgba(lamp, 0.7 * breathe);
    ctx.beginPath(); ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2); ctx.fill();
  }
  for (const p of points) {
    if (!highlightIds.has(p.id)) continue;
    ctx.strokeStyle = pal.lamp;
    ctx.globalAlpha = 0.45 + 0.35 * breathe;
    ctx.lineWidth = 0.9 / view.scale;
    ctx.beginPath(); ctx.arc(p.x, p.y, 18, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.font = `italic ${13 / view.scale}px Fraunces, Georgia, serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillStyle = rgba(pal.ink, 0.95);
    ctx.fillText(p.name, p.x, p.y + 22);
  }
}

// ─── Ground: a stylized microscopic ecosystem ──────────────────────────────

function drawDustShape(ctx: Ctx2D, kind: string, x: number, y: number, r: number, rotation: number, color: RGB, a: number, detail: boolean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.strokeStyle = rgba(color, a);
  ctx.fillStyle = rgba(color, a * 0.7);
  ctx.lineWidth = 0.7;
  if (kind === "dot") {
    ctx.beginPath(); ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2); ctx.fill();
  } else if (kind === "rod") {
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.6, r * 0.55, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (kind === "capsule") {
    // A friendly bacillus: a rounded rod with a faint fill and a membrane line.
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.9, r * 0.7, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
  } else if (kind === "cluster") {
    // A small colony of three to four tiny cells huddled together.
    const n = 3 + (rotation > Math.PI ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const a2 = (i / n) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a2) * r * 0.5, Math.sin(a2) * r * 0.5, r * 0.42, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    }
  } else if (kind === "diatom") {
    // A ringed, radially-ribbed micro-organism.
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a2 = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a2) * r * 0.3, Math.sin(a2) * r * 0.3);
      ctx.lineTo(Math.cos(a2) * r, Math.sin(a2) * r);
      ctx.stroke();
    }
  } else if (kind === "ring") {
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
  } else if (kind === "triangle") {
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a2 = (i / 3) * Math.PI * 2;
      ctx.lineTo(Math.cos(a2) * r, Math.sin(a2) * r);
    }
    ctx.closePath(); ctx.stroke();
  } else {
    // burst: a tiny starburst
    for (let i = 0; i < 6; i++) {
      const a2 = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a2) * r, Math.sin(a2) * r);
      ctx.stroke();
    }
  }
  // A near-tier specimen carries a nucleus, so it reads as alive up close.
  if (detail && (kind === "capsule" || kind === "diatom" || kind === "ring")) {
    ctx.fillStyle = rgba(color, a * 1.3);
    ctx.beginPath(); ctx.arc(r * 0.15, -r * 0.1, Math.max(0.6, r * 0.16), 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

export function drawGround(ctx: Ctx2D, model: GroundModel, pal: Palette, view: View, w: number, h: number, skip: Set<string>) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = rgba(pal.paper, 1);
  ctx.fillRect(0, 0, w, h);
  ctx.setTransform(view.scale, 0, 0, view.scale, view.tx, view.ty);
  ctx.lineCap = "round"; ctx.lineJoin = "round";

  // Ambient membranes: the furthest layer, soft unlabeled bubbles that give
  // the dish depth before anything semantic is drawn.
  for (const m of model.membranes) {
    const hue = pal.hues[m.hue];
    const grad = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r);
    grad.addColorStop(0, rgba(hue, m.a));
    grad.addColorStop(1, rgba(hue, 0));
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.fill();
  }

  // Ambient trails, under the specimens they connect.
  for (const t of model.trails) {
    ctx.strokeStyle = rgba(pal.hues[t.hue], t.a);
    ctx.lineWidth = 0.6 / view.scale;
    ctx.setLineDash([1.6, 3]);
    ctx.beginPath(); ctx.moveTo(t.ax, t.ay); ctx.lineTo(t.bx, t.by); ctx.stroke();
    ctx.setLineDash([]);
  }

  for (const d of model.dust) {
    drawDustShape(ctx, d.kind, d.x, d.y, d.r, d.rotation, pal.hues[d.hue], d.a, d.detail);
  }

  ctx.font = `italic ${13 / view.scale}px Fraunces, Georgia, serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  for (const f of model.fields) {
    if (f.count === 0) continue;
    ctx.fillStyle = rgba(pal.inkSoft, 0.55);
    ctx.fillText(f.name, f.labelX, f.labelY);
  }

  // Colonies: soft translucent membranes under everything they hold.
  for (const c of model.colonies) {
    const hue = pal.hues[c.hue];
    const grad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.radius);
    grad.addColorStop(0, rgba(hue, 0.1));
    grad.addColorStop(1, rgba(hue, 0));
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = rgba(hue, 0.22);
    ctx.lineWidth = 0.8 / view.scale;
    ctx.beginPath(); ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2); ctx.stroke();
  }

  // Filaments: connections, behind the cells they join.
  for (const f of model.filaments) {
    const col = f.cross ? mix(pal.hues[f.hueA], pal.hues[f.hueB], 0.5) : pal.hues[f.hueA];
    ctx.strokeStyle = rgba(col, f.dotted ? 0.32 : 0.55);
    ctx.lineWidth = (f.cross ? 1.4 : 1) / view.scale;
    if (f.dotted) ctx.setLineDash([2.2, 3.4]); else ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(f.ax, f.ay);
    ctx.quadraticCurveTo(f.cx, f.cy, f.bx, f.by);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Cells: membranes, rods, and organelles.
  for (const c of model.cells) {
    if (skip.has(c.id)) continue;
    const hue = pal.hues[c.hue];
    if (c.r <= 3.5) {
      // A spore: met, not yet explained.
      ctx.strokeStyle = rgba(hue, 0.6);
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(c.x - c.r, c.y + c.r * 0.6);
      ctx.quadraticCurveTo(c.x, c.y - c.r * 1.4, c.x + c.r, c.y + c.r * 0.6);
      ctx.stroke();
      continue;
    }
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.rotation);
    const fillA = c.mature ? 0.22 : 0.13;
    ctx.fillStyle = rgba(hue, fillA);
    ctx.strokeStyle = rgba(hue, c.misconception ? 0.35 : 0.6);
    ctx.lineWidth = (c.mature ? 1.1 : 0.85) / view.scale;
    ctx.beginPath();
    if (c.rod) ctx.ellipse(0, 0, c.r * 1.3, c.r * 0.62, 0, 0, Math.PI * 2);
    else ctx.arc(0, 0, c.r, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    // Organelles: small internal dots, one per revisit, capped.
    if (c.organelles > 0) {
      const n = c.organelles;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + c.rotation * 0.3;
        const rr = c.r * 0.42;
        ctx.fillStyle = rgba(hue, 0.75);
        ctx.beginPath();
        ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr, Math.max(0.9, c.r * 0.09), 0, Math.PI * 2);
        ctx.fill();
      }
      if (c.mature) {
        ctx.strokeStyle = rgba(hue, 0.45);
        ctx.lineWidth = 0.6;
        ctx.beginPath(); ctx.arc(0, 0, c.r * 0.55, 0, Math.PI * 2); ctx.stroke();
      }
    }
    ctx.restore();

    if (c.misconception) {
      ctx.fillStyle = rgba(pal.ink, 0.6);
      ctx.beginPath(); ctx.arc(c.x + c.r * 0.9, c.y - c.r * 0.7, 1.6, 0, Math.PI * 2); ctx.fill();
    }
    if (c.openQuestion) {
      ctx.strokeStyle = rgba(hue, 0.4);
      ctx.lineWidth = 0.6;
      ctx.setLineDash([1.5, 2.5]);
      ctx.beginPath(); ctx.arc(c.x, c.y, c.r + 6, 0, Math.PI * 1.3); ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

// ─── Grove ──────────────────────────────────────────────────────────────

/** A soft, uniform mottle — the ground everything grows on, not any one
 * field's territory. Low-frequency relief for grain. */
export function groveWashPixels(model: GroveModel, pal: Palette): Uint8ClampedArray {
  const G = model.grid;
  const p = new Uint8ClampedArray(G * G * 4);
  const soil: RGB = pal.night ? [52, 60, 48] : [140, 148, 114];
  const cx = G / 2, cy = (model.groundY / model.height) * G, maxD = G * 0.62;
  for (let gy = 0; gy < G; gy++) for (let gx = 0; gx < G; gx++) {
    const i = gy * G + gx;
    const edge = Math.max(0, 1 - Math.hypot(gx - cx, gy - cy) / maxD);
    const k = (0.1 + model.relief[i] * 0.14) * edge;
    const r = pal.paper[0] + (soil[0] - pal.paper[0]) * k;
    const g = pal.paper[1] + (soil[1] - pal.paper[1]) * k;
    const b = pal.paper[2] + (soil[2] - pal.paper[2]) * k;
    const o = i * 4;
    p[o] = r; p[o + 1] = g; p[o + 2] = b; p[o + 3] = 255;
  }
  return p;
}

export function drawGrove(
  ctx: Ctx2D,
  model: GroveModel,
  pal: Palette,
  view: View,
  w: number,
  h: number,
  skip: Set<string>,
  washImg?: GroundImage,
) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  // A soft sky wash, always present, so the grove has atmosphere above the
  // ground line even before a single tree has grown.
  const skyTop: RGB = mix(pal.paper, pal.night ? [30, 34, 26] : [255, 252, 238], pal.night ? 0.35 : 0.5);
  const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
  skyGrad.addColorStop(0, rgba(skyTop, 1));
  skyGrad.addColorStop(1, rgba(pal.paper, 1));
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, h);
  ctx.setTransform(view.scale, 0, 0, view.scale, view.tx, view.ty);

  // Horizon: a faint distant tree line, always present, well behind
  // everything real.
  const horizonHue = mix(pal.ink, pal.paper, 0.48);
  for (const t of model.horizon) {
    ctx.fillStyle = rgba(horizonHue, 0.2);
    ctx.beginPath();
    ctx.moveTo(t.x - t.w, model.groundY + 2);
    ctx.lineTo(t.x, model.groundY - t.h);
    ctx.lineTo(t.x + t.w, model.groundY + 2);
    ctx.closePath();
    ctx.fill();
  }

  if (washImg) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(washImg, 0, 0, model.width, model.height);
  }
  ctx.lineCap = "round"; ctx.lineJoin = "round";

  // One root system under the whole grove.
  const bark = mix(pal.ink, pal.paper, 0.4);
  ctx.strokeStyle = rgba(bark, 0.35);
  ctx.lineWidth = 0.8 / view.scale;
  ctx.beginPath();
  const rn = 24;
  for (let i = 0; i <= rn; i++) {
    const x = (model.width / rn) * i;
    const y = model.groundY + 6 + Math.sin(i * 1.3) * 3;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  for (const t of model.trunks) {
    ctx.strokeStyle = rgba(bark, 0.4);
    ctx.lineWidth = 0.7 / view.scale;
    const spread = t.sapling ? 16 : 30 + t.width * 4;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(t.x, t.baseY);
      ctx.quadraticCurveTo(t.x + side * spread * 0.5, t.baseY + 10, t.x + side * spread, t.baseY + 6);
      ctx.stroke();
    }
  }
  // Roots: bridged domains, and every tree's own roots into the ground.
  for (const r of model.roots) {
    const col = mix(pal.hues[r.hueA], pal.hues[r.hueB], 0.5);
    ctx.strokeStyle = rgba(col, r.hueA === r.hueB ? 0.3 : 0.4);
    ctx.lineWidth = (r.hueA === r.hueB ? 0.8 : 1) / view.scale;
    ctx.beginPath();
    ctx.moveTo(r.ax, r.ay);
    ctx.quadraticCurveTo(r.cx, r.cy, r.bx, r.by);
    ctx.stroke();
  }

  // Ambient saplings: small unlabeled plants filling the ground between
  // and around the real trees.
  for (const s of model.saplings) {
    const hue = pal.hues[s.hue];
    ctx.strokeStyle = rgba(mix(hue, pal.paper, 0.25), 0.55);
    ctx.lineWidth = 1 / view.scale;
    ctx.beginPath(); ctx.moveTo(s.x, s.baseY); ctx.lineTo(s.x, s.topY); ctx.stroke();
    for (const l of s.leaves) {
      ctx.fillStyle = rgba(hue, 0.45);
      ctx.beginPath(); ctx.ellipse(l.x, l.y, l.r, l.r * 0.6, 0, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Trunks.
  for (const t of model.trunks) {
    ctx.strokeStyle = rgba(bark, t.sapling ? 0.55 : 0.7);
    ctx.lineWidth = Math.max(t.width, 0.6) / Math.max(view.scale, 0.5);
    ctx.beginPath();
    ctx.moveTo(t.x, t.baseY);
    ctx.lineTo(t.x, t.topY);
    ctx.stroke();
    ctx.font = `italic ${13 / view.scale}px Fraunces, Georgia, serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "bottom";
    ctx.fillStyle = rgba(pal.inkSoft, 0.55);
    ctx.fillText(t.name, t.x, t.topY - 14 / view.scale);
  }

  for (const b of model.branches) {
    if (skip.has(b.id)) continue;
    const hue = pal.hues[b.hue];
    const col = b.weak ? mix(hue, pal.paper, 0.55) : mix(hue, pal.paper, 0.1 * b.settle);
    ctx.strokeStyle = rgba(col, b.bud ? 0.55 : b.weak ? 0.5 : 0.82);
    ctx.lineWidth = Math.max(b.thickness, 0.6) / Math.max(view.scale, 0.6);
    ctx.beginPath();
    ctx.moveTo(b.x0, b.y0);
    ctx.quadraticCurveTo(b.cx, b.cy, b.x1, b.y1);
    ctx.stroke();
    if (b.bud) {
      ctx.fillStyle = rgba(hue, 0.65);
      ctx.beginPath(); ctx.arc(b.x1, b.y1, 2.4, 0, Math.PI * 2); ctx.fill();
    }
    for (const l of b.leaves) {
      if (l.flower) {
        // Important synthesis: a small pale blossom, five petals.
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          ctx.fillStyle = rgba(mix(pal.paper, [255, 255, 255], 0.5), 0.85);
          ctx.beginPath();
          ctx.ellipse(l.x + Math.cos(a) * l.r * 0.7, l.y + Math.sin(a) * l.r * 0.7, l.r * 0.6, l.r * 0.34, a, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = rgba(pal.hues[b.hue], 0.8);
        ctx.beginPath(); ctx.arc(l.x, l.y, l.r * 0.32, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = rgba(hue, 0.5);
        ctx.beginPath(); ctx.ellipse(l.x, l.y, l.r, l.r * 0.65, Math.atan2(l.y - b.y0, l.x - b.x0), 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  // Ambient twigs: smaller sub-branches off the real ones, with their own
  // little leaf clusters — canopy fullness, no new nodes.
  for (const tw of model.twigs) {
    const hue = pal.hues[tw.hue];
    ctx.strokeStyle = rgba(hue, 0.5);
    ctx.lineWidth = Math.max(tw.thickness, 0.5) / Math.max(view.scale, 0.6);
    ctx.beginPath();
    ctx.moveTo(tw.x0, tw.y0);
    ctx.quadraticCurveTo(tw.cx, tw.cy, tw.x1, tw.y1);
    ctx.stroke();
    for (const l of tw.leaves) {
      ctx.fillStyle = rgba(hue, 0.4);
      ctx.beginPath(); ctx.ellipse(l.x, l.y, l.r, l.r * 0.65, 0, 0, Math.PI * 2); ctx.fill();
    }
  }

  for (const t of model.tendrils) {
    const col = t.cross ? mix(pal.hues[t.hueA], pal.hues[t.hueB], 0.5) : pal.hues[t.hueA];
    ctx.strokeStyle = rgba(col, 0.7);
    ctx.lineWidth = (t.cross ? 1.5 : 1) / view.scale;
    ctx.beginPath();
    ctx.moveTo(t.ax, t.ay);
    ctx.quadraticCurveTo(t.cx, t.cy, t.bx, t.by);
    ctx.stroke();
  }

  // Pollen: a drift of motes, the last thing painted, so it reads as
  // floating in the air above everything else.
  for (const p of model.pollen) {
    ctx.fillStyle = rgba(mix(pal.hues[p.hue], [255, 255, 255], 0.4), p.a);
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
  }
}

// ─── Sky ────────────────────────────────────────────────────────────────

const WARM_DWARF: RGB = [176, 96, 70];
const MIDNIGHT: RGB = [7, 9, 18];

// Sky is a night, not paper — its stars need real saturation and glow, not
// the muted survey palette the other two climates sit on. Same six fields,
// their vivid counterparts: gold, cyan, magenta, blue, green, orange.
const SKY_HUES: RGB[] = [
  [247, 200, 96],
  [86, 224, 232],
  [244, 128, 176],
  [122, 176, 250],
  [130, 226, 142],
  [248, 148, 84],
];

export function drawSky(ctx: Ctx2D, model: SkyModel, pal: Palette, view: View, w: number, h: number, skip: Set<string>) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  // A deep midnight at the top, blending down into the page's own paper
  // before the bottom edge — never an abrupt cut.
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, rgba(MIDNIGHT, 1));
  grad.addColorStop(0.45, rgba(mix(MIDNIGHT, [24, 24, 46], 0.7), 1));
  grad.addColorStop(0.68, rgba(mix(MIDNIGHT, pal.paper, 0.4), 1));
  grad.addColorStop(1, rgba(pal.paper, 1));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.setTransform(view.scale, 0, 0, view.scale, view.tx, view.ty);

  // Distant galaxies: a soft spiral smear, well away from the content.
  for (const g of model.galaxies) {
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.rotate(g.rotation);
    for (let arm = 0; arm < 2; arm++) {
      ctx.save();
      ctx.rotate(arm * Math.PI);
      ctx.beginPath();
      for (let i = 0; i < 40; i++) {
        const t = i / 40, ang = t * Math.PI * 2.4, rr = t * g.r;
        const x = Math.cos(ang) * rr, y = Math.sin(ang) * rr * 0.45;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = rgba([210, 212, 230], g.a * 0.55);
      ctx.lineWidth = 2.6;
      ctx.stroke();
      ctx.restore();
    }
    const core = ctx.createRadialGradient(0, 0, 0, 0, 0, g.r * 0.4);
    core.addColorStop(0, rgba([230, 226, 240], g.a * 0.85));
    core.addColorStop(1, rgba([230, 226, 240], 0));
    ctx.fillStyle = core;
    ctx.beginPath(); ctx.arc(0, 0, g.r * 0.35, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // Haze: rich colored nebula washes behind the real stars.
  for (const hz of model.haze) {
    const grad2 = ctx.createRadialGradient(hz.x, hz.y, 0, hz.x, hz.y, hz.r);
    grad2.addColorStop(0, rgba(SKY_HUES[hz.hue], hz.a));
    grad2.addColorStop(0.5, rgba(SKY_HUES[hz.hue], hz.a * 0.4));
    grad2.addColorStop(1, rgba(SKY_HUES[hz.hue], 0));
    ctx.fillStyle = grad2;
    ctx.beginPath(); ctx.arc(hz.x, hz.y, hz.r, 0, Math.PI * 2); ctx.fill();
  }

  // Orbital arcs, decorative motion, under the star field — visible enough
  // to read as intentional curves in the sky, not a rendering artifact.
  for (const arc of model.arcs) {
    ctx.strokeStyle = rgba(mix(SKY_HUES[arc.hue], [255, 255, 255], 0.3), arc.a);
    ctx.lineWidth = 1 / view.scale;
    ctx.beginPath();
    ctx.arc(arc.cx, arc.cy, arc.r, arc.a0, arc.a1);
    ctx.stroke();
  }

  for (const d of model.dust) {
    if (d.twinkle) {
      const hr = d.r * 5;
      const grad3 = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, hr);
      grad3.addColorStop(0, rgba([240, 240, 250], d.a * 0.5));
      grad3.addColorStop(1, rgba([240, 240, 250], 0));
      ctx.fillStyle = grad3;
      ctx.beginPath(); ctx.arc(d.x, d.y, hr, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = rgba([236, 238, 246], d.a);
    ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
  }

  // Legible against any part of the gradient: a dark outline under a
  // light fill, so a label never disappears where the sky meets the paper.
  ctx.font = `italic ${13 / view.scale}px Fraunces, Georgia, serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  for (const f of model.fields) {
    if (f.count === 0) continue;
    ctx.lineWidth = 2.4 / view.scale;
    ctx.strokeStyle = rgba(MIDNIGHT, 0.55);
    ctx.strokeText(f.name, f.labelX, f.labelY);
    ctx.fillStyle = rgba([214, 216, 226], 0.85);
    ctx.fillText(f.name, f.labelX, f.labelY);
  }

  // Earned constellation lines.
  for (const l of model.lines) {
    ctx.strokeStyle = rgba(SKY_HUES[l.hue], l.strong ? 0.75 : 0.5);
    ctx.lineWidth = (l.strong ? 1.3 : 0.9) / view.scale;
    ctx.beginPath(); ctx.moveTo(l.ax, l.ay); ctx.lineTo(l.bx, l.by); ctx.stroke();
  }
  // Bridges: a light filament with a ring at each end.
  for (const br of model.bridges) {
    const grad2 = ctx.createLinearGradient(br.ax, br.ay, br.bx, br.by);
    grad2.addColorStop(0, rgba(SKY_HUES[br.hueA], 0.9));
    grad2.addColorStop(1, rgba(SKY_HUES[br.hueB], 0.9));
    ctx.strokeStyle = grad2;
    ctx.lineWidth = 1.8 / view.scale;
    ctx.beginPath(); ctx.moveTo(br.ax, br.ay); ctx.lineTo(br.bx, br.by); ctx.stroke();
    for (const [x, y, hue] of [[br.ax, br.ay, br.hueA], [br.bx, br.by, br.hueB]] as const) {
      ctx.strokeStyle = rgba(SKY_HUES[hue], 0.8);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.stroke();
    }
  }

  for (const s of model.stars) {
    if (skip.has(s.id)) continue;
    const hue = s.weak ? WARM_DWARF : SKY_HUES[s.hue];
    const r = s.weak ? 1.6 : Math.max(1.8, s.magnitude * 0.62);
    if (!s.weak) {
      // Every real star gets a glow, not just the halo-earning ones —
      // this is a night sky, not a scatter of dots.
      const hr = r + 5 + s.halo * 9;
      const grad2 = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, hr);
      grad2.addColorStop(0, rgba(hue, 0.55));
      grad2.addColorStop(0.35, rgba(hue, 0.22));
      grad2.addColorStop(1, rgba(hue, 0));
      ctx.fillStyle = grad2;
      ctx.beginPath(); ctx.arc(s.x, s.y, hr, 0, Math.PI * 2); ctx.fill();
    }
    // Exceptional: rare, so it stays meaningful. A wide radiant bloom.
    if (s.exceptional) {
      const br = r * 7;
      const bloom = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, br);
      bloom.addColorStop(0, rgba(hue, 0.5));
      bloom.addColorStop(0.4, rgba(hue, 0.18));
      bloom.addColorStop(1, rgba(hue, 0));
      ctx.fillStyle = bloom;
      ctx.beginPath(); ctx.arc(s.x, s.y, br, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = rgba(hue, 0.45);
      ctx.lineWidth = 0.7 / view.scale;
      ctx.beginPath(); ctx.arc(s.x, s.y, br * 0.65, 0, Math.PI * 2); ctx.stroke();
    }
    if (s.spikes || s.exceptional) {
      ctx.strokeStyle = rgba(mix(hue, [255, 255, 255], 0.4), 0.85);
      ctx.lineWidth = 0.9 / view.scale;
      const sp = r + 7;
      ctx.beginPath();
      ctx.moveTo(s.x - sp, s.y); ctx.lineTo(s.x + sp, s.y);
      ctx.moveTo(s.x, s.y - sp); ctx.lineTo(s.x, s.y + sp);
      ctx.stroke();
    }
    // A bright white-hot core makes even a small star read as light, not paint.
    ctx.fillStyle = rgba(mix(hue, [255, 255, 255], s.weak ? 0 : 0.55), s.explained ? 1 : 0.7);
    ctx.beginPath(); ctx.arc(s.x, s.y, Math.max(r, 1.1), 0, Math.PI * 2); ctx.fill();
  }
}
