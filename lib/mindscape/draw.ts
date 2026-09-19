/**
 * Drawing the Settling Ground model onto a 2D canvas context. Pure with
 * respect to the DOM: the component passes in the palette, the view, and a
 * ground image, and a Node canvas can render the same picture for checks.
 */

import { FIELD_HUES, type MapPoint, type MindscapeModel } from "./engine";

/** The minimal shape any climate's model exposes, so view-fitting and pan/zoom clamping work the same for all three. */
export interface Viewable {
  width: number;
  height: number;
  bounds: { x0: number; y0: number; x1: number; y1: number };
  points: MapPoint[];
}

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
  let { x0, y0, x1, y1 } = model.bounds;
  if (ids && ids.size > 0) {
    const pts = model.points.filter((c) => ids.has(c.id));
    if (pts.length > 0) {
      x0 = Math.min(...pts.map((p) => p.x)) - 180;
      y0 = Math.min(...pts.map((p) => p.y)) - 140;
      x1 = Math.max(...pts.map((p) => p.x)) + 180;
      y1 = Math.max(...pts.map((p) => p.y)) + 140;
    }
  }
  const pad = 36;
  const bw = Math.max(240, x1 - x0), bh = Math.max(200, y1 - y0);
  const scale = Math.min((w - pad * 2) / bw, (h - pad * 2) / bh, 2.2);
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  return clampView(model, { scale, tx: w / 2 - cx * scale, ty: h / 2 - cy * scale }, w, h);
}

/** Keep the world on screen: never panned entirely out of view, never absurdly scaled. */
export function clampView(model: Viewable, view: View, w: number, h: number): View {
  const scale = Math.min(6, Math.max(0.12, view.scale));
  const ratio = scale / view.scale;
  let tx = w / 2 - (w / 2 - view.tx) * ratio;
  let ty = h / 2 - (h / 2 - view.ty) * ratio;
  tx = Math.min(w - 80, Math.max(80 - model.width * scale, tx));
  ty = Math.min(h - 80, Math.max(80 - model.height * scale, ty));
  return { scale, tx, ty };
}

/** Ground pixels for a G×G image: paper, tint, snow above a height, fog below one. */
export function groundPixels(model: MindscapeModel, pal: Palette): Uint8ClampedArray {
  const G = model.grid;
  const p = new Uint8ClampedArray(G * G * 4);
  const SNOW: RGB = pal.night ? [200, 205, 205] : [251, 248, 240];
  const FOG: RGB = pal.night ? [40, 46, 50] : [214, 218, 216];
  const dayHues = FIELD_HUES.day.map(hexToRgb);
  for (let i = 0; i < G * G; i++) {
    const h = model.ground[i];
    let r = pal.paper[0], g = pal.paper[1], b = pal.paper[2];
    const tw = model.tintW[i];
    if (tw > 0) {
      const k = Math.min(0.42, h * 0.55);
      // Tints were accumulated in day hues; find the nearest and use the palette's version.
      const tr = model.tint[i * 3] / tw, tg = model.tint[i * 3 + 1] / tw, tb = model.tint[i * 3 + 2] / tw;
      let best = 0, bd = Infinity;
      dayHues.forEach((c, hi) => {
        const d = (c[0] - tr) ** 2 + (c[1] - tg) ** 2 + (c[2] - tb) ** 2;
        if (d < bd) { bd = d; best = hi; }
      });
      const hue = pal.hues[best];
      r += (hue[0] - r) * k; g += (hue[1] - g) * k; b += (hue[2] - b) * k;
    }
    if (h > 0.82) {
      const k = Math.min(1, (h - 0.82) / 0.3) * (pal.night ? 0.35 : 0.85);
      r += (SNOW[0] - r) * k; g += (SNOW[1] - g) * k; b += (SNOW[2] - b) * k;
    }
    if (h < 0.14) {
      const f = (0.14 - h) / 0.14;
      const k = f * (0.08 + 0.34 * model.relief[i]) * (pal.night ? 0.9 : 1);
      r += (FOG[0] - r) * k; g += (FOG[1] - g) * k; b += (FOG[2] - b) * k;
    }
    const grain = (model.relief[i] - 0.5) * (pal.night ? 5 : 8);
    const o = i * 4;
    p[o] = r + grain; p[o + 1] = g + grain; p[o + 2] = b + grain; p[o + 3] = 255;
  }
  return p;
}

export function drawBase(
  ctx: Ctx2D,
  model: MindscapeModel,
  pal: Palette,
  view: View,
  w: number,
  h: number,
  skip: Set<number>,
  labels: boolean,
  groundImg: GroundImage,
) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = rgba(pal.paper, 1);
  ctx.fillRect(0, 0, w, h);

  ctx.setTransform(view.scale, 0, 0, view.scale, view.tx, view.ty);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  // Beyond the ground image, the canvas is already the flat paper fill
  // above — the same paper the rest of the page sits on, so empty space
  // around a small map reads as more of the same sheet, not a seam.
  ctx.drawImage(groundImg, 0, 0, model.width, model.height);

  ctx.lineCap = "round"; ctx.lineJoin = "round";
  for (const cl of model.contours) {
    ctx.beginPath();
    for (let i = 0; i < cl.segs.length; i += 4) {
      ctx.moveTo(cl.segs[i], cl.segs[i + 1]);
      ctx.lineTo(cl.segs[i + 2], cl.segs[i + 3]);
    }
    ctx.strokeStyle = rgba(pal.ink, cl.index ? 0.5 : 0.3);
    ctx.lineWidth = (cl.index ? 1.1 : 0.7) / view.scale;
    ctx.stroke();
  }

  // Field names, faint, in the serif italic: a margin note on the art.
  if (labels) {
    ctx.font = `italic ${13 / view.scale}px Fraunces, Georgia, serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const f of model.fields) {
      ctx.fillStyle = rgba(pal.inkSoft, 0.55);
      ctx.fillText(f.name, f.labelX, f.labelY);
    }
  }

  drawThreads(ctx, model, pal, view, (s) => !skip.has(s.c), () => 1);
  drawMarks(ctx, model, pal, (c) => !skip.has(c), 1);
}

export function drawThreads(
  ctx: Ctx2D,
  model: MindscapeModel,
  pal: Palette,
  view: View,
  include: (s: MindscapeModel["segments"][number]) => boolean,
  fraction: (c: number) => number,
) {
  // Bucket by style so each bucket is one stroke call.
  const buckets = new Map<string, { c: number; w: number; dark: boolean; cord: boolean; mix: number; segs: MindscapeModel["segments"] }>();
  for (const s of model.segments) {
    if (!include(s)) continue;
    const f = fraction(s.c);
    if (f < 1 && s.order > f * model.concepts[s.c].segmentCount) continue;
    const key = `${s.c}|${Math.round(s.w * 4)}|${s.dark ? 1 : 0}|${s.cord ? 1 : 0}|${s.mix}`;
    let b = buckets.get(key);
    if (!b) { b = { c: s.c, w: s.w, dark: s.dark, cord: s.cord, mix: s.mix, segs: [] }; buckets.set(key, b); }
    b.segs.push(s);
  }
  const ordered = [...buckets.values()].sort((a, b) => Number(a.cord) - Number(b.cord) || Number(a.dark) - Number(b.dark));
  ctx.lineCap = "round";
  for (const b of ordered) {
    const c = model.concepts[b.c];
    let col: RGB, alpha: number;
    if (b.dark) { col = pal.ink; alpha = 0.85; }
    else {
      col = pal.hues[c.hue];
      if (b.mix >= 0) col = mix(col, pal.hues[b.mix], 0.5);
      // Settling: the thread sinks toward the paper as the ground rises beneath it.
      col = mix(col, pal.paper, 0.6 * c.settle);
      alpha = (b.cord ? 0.92 : 0.8) - 0.55 * c.settle;
    }
    ctx.beginPath();
    for (const s of b.segs) { ctx.moveTo(s.ax, s.ay); ctx.lineTo(s.bx, s.by); }
    ctx.strokeStyle = rgba(col, alpha);
    ctx.lineWidth = Math.max(b.w, 0.6 / view.scale);
    ctx.stroke();
  }
}

export function drawMarks(
  ctx: Ctx2D,
  model: MindscapeModel,
  pal: Palette,
  include: (c: number) => boolean,
  alphaScale: number,
) {
  ctx.fillStyle = rgba(pal.ink, 0.85 * alphaScale);
  for (const d of model.darkDots) {
    if (!include(d.c)) continue;
    ctx.beginPath(); ctx.arc(d.x, d.y, 2.1, 0, Math.PI * 2); ctx.fill();
  }
  // Blooms: marks of connection. They keep their ink.
  for (const bl of model.blooms) {
    if (!include(bl.c)) continue;
    const a = 0.85 * alphaScale;
    const n = bl.cross ? 18 : 10, len = bl.cross ? 22 : 11;
    ctx.lineWidth = 0.9;
    for (let i = 0; i < n; i++) {
      const ang = (i * Math.PI * 2) / n + bl.seed;
      const L = len * (0.55 + 0.45 * (((bl.seed * 7 + i * 13) % 10) / 10));
      const hue = bl.cross && i % 2 ? pal.hues[bl.hueB] : pal.hues[bl.hueA];
      ctx.strokeStyle = rgba(hue, a);
      ctx.beginPath();
      ctx.moveTo(bl.x + Math.cos(ang) * 3, bl.y + Math.sin(ang) * 3);
      ctx.lineTo(bl.x + Math.cos(ang) * L, bl.y + Math.sin(ang) * L);
      ctx.stroke();
    }
    if (bl.cross) {
      ctx.strokeStyle = rgba(mix(pal.hues[bl.hueA], pal.hues[bl.hueB], 0.5), a * 0.5);
      ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.arc(bl.x, bl.y, 15, 0, Math.PI * 2); ctx.stroke();
    }
  }
  // Open questions: a dotted reach into the fog.
  for (const q of model.seekers) {
    if (!include(q.c)) continue;
    const hue = pal.hues[model.concepts[q.c].hue];
    ctx.strokeStyle = rgba(hue, 0.55 * alphaScale);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (let i = 2; i < q.pts.length; i += 4) {
      ctx.moveTo(q.pts[i - 2], q.pts[i - 1]);
      ctx.lineTo(q.pts[i], q.pts[i + 1]);
    }
    ctx.stroke();
    const ex = q.pts[q.pts.length - 2], ey = q.pts[q.pts.length - 1];
    ctx.beginPath(); ctx.arc(ex, ey, 3.5, 0, Math.PI * 2); ctx.stroke();
  }
}

/** The lamp: luminous tips on what was touched this fortnight, and rings on what a view is about. */
export function drawLive(
  ctx: Ctx2D,
  model: MindscapeModel,
  pal: Palette,
  view: View,
  liveIdx: number[],
  highlightIdx: Set<number>,
  breathe: number,
) {
  for (const i of liveIdx) {
    const c = model.concepts[i];
    const hue = pal.hues[c.hue];
    for (const e of c.tipEnds) {
      ctx.fillStyle = rgba(hue, 0.14 * breathe);
      ctx.beginPath(); ctx.arc(e.x, e.y, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = rgba(hue, 0.7 * breathe);
      ctx.beginPath(); ctx.arc(e.x, e.y, 1.7, 0, Math.PI * 2); ctx.fill();
    }
  }
  for (const i of highlightIdx) {
    const c = model.concepts[i];
    ctx.strokeStyle = pal.lamp;
    ctx.globalAlpha = 0.45 + 0.35 * breathe;
    ctx.lineWidth = 0.9 / view.scale;
    ctx.beginPath(); ctx.arc(c.x, c.y, 22, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.font = `italic ${13 / view.scale}px Fraunces, Georgia, serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillStyle = rgba(pal.ink, 0.95);
    ctx.fillText(c.name, c.x, c.y + 26);
  }
}

// ─── Grove ──────────────────────────────────────────────────────────────

import type { GroveModel } from "./grove";
import type { SkyModel } from "./sky";

/** A soft, uniform mottle — the ground everything grows on, not any one
 * field's territory. Same low-frequency relief Ground uses for grain. */
export function groveWashPixels(model: GroveModel, pal: Palette): Uint8ClampedArray {
  const G = model.grid;
  const p = new Uint8ClampedArray(G * G * 4);
  const soil: RGB = pal.night ? [52, 60, 48] : [140, 148, 114];
  const cx = G / 2, cy = G / 2, maxD = G * 0.62;
  for (let gy = 0; gy < G; gy++) for (let gx = 0; gx < G; gx++) {
    const i = gy * G + gx;
    // Fades to nothing near the grid edge, so it blends into the flat
    // paper beyond rather than cutting off in a visible rectangle.
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
  ctx.fillStyle = rgba(pal.paper, 1);
  ctx.fillRect(0, 0, w, h);
  ctx.setTransform(view.scale, 0, 0, view.scale, view.tx, view.ty);
  if (washImg) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(washImg, 0, 0, model.width, model.height);
  }
  ctx.lineCap = "round"; ctx.lineJoin = "round";

  // Trunks: bark, quiet.
  const bark = mix(pal.ink, pal.paper, 0.35);
  for (const t of model.trunks) {
    ctx.strokeStyle = rgba(bark, 0.7);
    ctx.lineWidth = Math.max(3.5, 0.9 / view.scale);
    ctx.beginPath();
    ctx.moveTo(t.x, t.baseY);
    ctx.lineTo(t.x, t.topY);
    ctx.stroke();
    ctx.font = `italic ${13 / view.scale}px Fraunces, Georgia, serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "bottom";
    ctx.fillStyle = rgba(pal.inkSoft, 0.55);
    ctx.fillText(t.name, t.x, t.topY - 16 / view.scale);
  }

  for (const b of model.branches) {
    if (skip.has(b.id)) continue;
    const hue = pal.hues[b.hue];
    const col = b.weak ? mix(hue, pal.paper, 0.55) : mix(hue, pal.paper, 0.15 * b.settle);
    ctx.strokeStyle = rgba(col, b.bud ? 0.6 : b.weak ? 0.55 : 0.85);
    ctx.lineWidth = Math.max(b.thickness, 0.6) / Math.max(view.scale, 0.6);
    ctx.beginPath();
    ctx.moveTo(b.x0, b.y0);
    ctx.quadraticCurveTo(b.cx, b.cy, b.x1, b.y1);
    ctx.stroke();
    if (b.bud) {
      ctx.fillStyle = rgba(hue, 0.7);
      ctx.beginPath(); ctx.arc(b.x1, b.y1, 2.6, 0, Math.PI * 2); ctx.fill();
    }
    for (const l of b.leaves) {
      ctx.fillStyle = rgba(hue, 0.55);
      ctx.beginPath(); ctx.ellipse(l.x, l.y, l.r, l.r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
    }
  }

  for (const t of model.tendrils) {
    const col = t.cross ? mix(pal.hues[t.hueA], pal.hues[t.hueB], 0.5) : pal.hues[t.hueA];
    ctx.strokeStyle = rgba(col, 0.75);
    ctx.lineWidth = (t.cross ? 1.6 : 1.1) / view.scale;
    ctx.beginPath();
    ctx.moveTo(t.ax, t.ay);
    ctx.quadraticCurveTo(t.cx, t.cy, t.bx, t.by);
    ctx.stroke();
    // A small flower at the join.
    const n = t.cross ? 8 : 6;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      ctx.strokeStyle = rgba(i % 2 && t.cross ? pal.hues[t.hueB] : pal.hues[t.hueA], 0.8);
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(t.fx, t.fy);
      ctx.lineTo(t.fx + Math.cos(a) * 6, t.fy + Math.sin(a) * 6);
      ctx.stroke();
    }
  }
}

// ─── Sky ────────────────────────────────────────────────────────────────

const WARM_DWARF: RGB = [176, 96, 70];

export function drawSky(ctx: Ctx2D, model: SkyModel, pal: Palette, view: View, w: number, h: number, skip: Set<string>) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const skyPaper: RGB = pal.night ? pal.paper : mix(pal.paper, pal.ink, 0.06);
  const skyDeep: RGB = mix(skyPaper, pal.ink, pal.night ? 0.1 : 0.07);
  const vignette = ctx.createRadialGradient(w / 2, h * 0.4, 0, w / 2, h * 0.4, Math.hypot(w, h) * 0.65);
  vignette.addColorStop(0, rgba(skyPaper, 1));
  vignette.addColorStop(1, rgba(skyDeep, 1));
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
  ctx.setTransform(view.scale, 0, 0, view.scale, view.tx, view.ty);

  for (const d of model.dust) {
    ctx.fillStyle = rgba(pal.inkSoft, d.a);
    ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
  }

  ctx.font = `italic ${13 / view.scale}px Fraunces, Georgia, serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  for (const f of model.fields) {
    ctx.fillStyle = rgba(pal.inkSoft, 0.5);
    ctx.fillText(f.name, f.labelX, f.labelY);
  }

  // Nebulae, under everything: a soft wash in the field's hue around retained stars.
  for (const s of model.stars) {
    if (skip.has(s.id) || s.nebula <= 0) continue;
    const hue = pal.hues[s.hue];
    const r = 14 + s.magnitude * 3;
    const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r);
    grad.addColorStop(0, rgba(hue, 0.16 * s.nebula));
    grad.addColorStop(1, rgba(hue, 0));
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2); ctx.fill();
  }

  // Earned constellation lines.
  for (const l of model.lines) {
    ctx.strokeStyle = rgba(pal.hues[l.hue], l.strong ? 0.5 : 0.3);
    ctx.lineWidth = (l.strong ? 1 : 0.6) / view.scale;
    ctx.beginPath(); ctx.moveTo(l.ax, l.ay); ctx.lineTo(l.bx, l.by); ctx.stroke();
  }
  // Bridges: a light filament with a ring at each end.
  for (const br of model.bridges) {
    const grad = ctx.createLinearGradient(br.ax, br.ay, br.bx, br.by);
    grad.addColorStop(0, rgba(pal.hues[br.hueA], 0.7));
    grad.addColorStop(1, rgba(pal.hues[br.hueB], 0.7));
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.3 / view.scale;
    ctx.beginPath(); ctx.moveTo(br.ax, br.ay); ctx.lineTo(br.bx, br.by); ctx.stroke();
    for (const [x, y, hue] of [[br.ax, br.ay, br.hueA], [br.bx, br.by, br.hueB]] as const) {
      ctx.strokeStyle = rgba(pal.hues[hue], 0.6);
      ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.stroke();
    }
  }

  for (const s of model.stars) {
    if (skip.has(s.id)) continue;
    const hue = s.weak ? WARM_DWARF : pal.hues[s.hue];
    const r = s.weak ? 1.4 : Math.max(1, s.magnitude * 0.42);
    if (s.halo > 0 && !s.weak) {
      const hr = r + 3 + s.halo * 6;
      const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, hr);
      grad.addColorStop(0, rgba(hue, 0.3));
      grad.addColorStop(1, rgba(hue, 0));
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(s.x, s.y, hr, 0, Math.PI * 2); ctx.fill();
    }
    if (s.spikes) {
      ctx.strokeStyle = rgba(hue, 0.55);
      ctx.lineWidth = 0.7 / view.scale;
      const sp = r + 5;
      ctx.beginPath();
      ctx.moveTo(s.x - sp, s.y); ctx.lineTo(s.x + sp, s.y);
      ctx.moveTo(s.x, s.y - sp); ctx.lineTo(s.x, s.y + sp);
      ctx.stroke();
    }
    ctx.fillStyle = rgba(hue, s.explained ? 0.95 : 0.6);
    ctx.beginPath(); ctx.arc(s.x, s.y, Math.max(r, 0.9), 0, Math.PI * 2); ctx.fill();
  }
}

/** A lamp glow for whatever is live, and a ring + name for whatever a view
 * is about — generic over any climate's points, for Grove and Sky, which
 * don't have Ground's per-concept thread-tip geometry to glow instead. */
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
