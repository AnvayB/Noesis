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

function drawDustShape(ctx: Ctx2D, kind: string, x: number, y: number, r: number, rotation: number, color: RGB, a: number) {
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
  ctx.restore();
}

export function drawGround(ctx: Ctx2D, model: GroundModel, pal: Palette, view: View, w: number, h: number, skip: Set<string>) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = rgba(pal.paper, 1);
  ctx.fillRect(0, 0, w, h);
  ctx.setTransform(view.scale, 0, 0, view.scale, view.tx, view.ty);
  ctx.lineCap = "round"; ctx.lineJoin = "round";

  for (const d of model.dust) {
    drawDustShape(ctx, d.kind, d.x, d.y, d.r, d.rotation, pal.hues[d.hue], d.a);
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
  ctx.fillStyle = rgba(pal.paper, 1);
  ctx.fillRect(0, 0, w, h);
  ctx.setTransform(view.scale, 0, 0, view.scale, view.tx, view.ty);
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
  // Roots between bridged domains — the underground echo of a synthesis.
  for (const r of model.roots) {
    const col = mix(pal.hues[r.hueA], pal.hues[r.hueB], 0.5);
    ctx.strokeStyle = rgba(col, 0.4);
    ctx.lineWidth = 1 / view.scale;
    ctx.beginPath();
    ctx.moveTo(r.ax, r.ay);
    ctx.quadraticCurveTo(r.cx, r.cy, r.bx, r.by);
    ctx.stroke();
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

  for (const t of model.tendrils) {
    const col = t.cross ? mix(pal.hues[t.hueA], pal.hues[t.hueB], 0.5) : pal.hues[t.hueA];
    ctx.strokeStyle = rgba(col, 0.7);
    ctx.lineWidth = (t.cross ? 1.5 : 1) / view.scale;
    ctx.beginPath();
    ctx.moveTo(t.ax, t.ay);
    ctx.quadraticCurveTo(t.cx, t.cy, t.bx, t.by);
    ctx.stroke();
  }
}

// ─── Sky ────────────────────────────────────────────────────────────────

const WARM_DWARF: RGB = [176, 96, 70];
const MIDNIGHT: RGB = [10, 14, 26];

export function drawSky(ctx: Ctx2D, model: SkyModel, pal: Palette, view: View, w: number, h: number, skip: Set<string>) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  // A deep midnight at the top, blending down into the page's own paper
  // before the bottom edge — never an abrupt cut.
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, rgba(MIDNIGHT, 1));
  grad.addColorStop(0.62, rgba(mix(MIDNIGHT, pal.paper, 0.35), 1));
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

  // Haze: soft colored washes behind the real stars.
  for (const hz of model.haze) {
    const grad2 = ctx.createRadialGradient(hz.x, hz.y, 0, hz.x, hz.y, hz.r);
    grad2.addColorStop(0, rgba(pal.hues[hz.hue], hz.a));
    grad2.addColorStop(1, rgba(pal.hues[hz.hue], 0));
    ctx.fillStyle = grad2;
    ctx.beginPath(); ctx.arc(hz.x, hz.y, hz.r, 0, Math.PI * 2); ctx.fill();
  }

  for (const d of model.dust) {
    ctx.fillStyle = rgba([210, 214, 224], d.a);
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
    ctx.strokeStyle = rgba(pal.hues[l.hue], l.strong ? 0.5 : 0.3);
    ctx.lineWidth = (l.strong ? 1 : 0.6) / view.scale;
    ctx.beginPath(); ctx.moveTo(l.ax, l.ay); ctx.lineTo(l.bx, l.by); ctx.stroke();
  }
  // Bridges: a light filament with a ring at each end.
  for (const br of model.bridges) {
    const grad2 = ctx.createLinearGradient(br.ax, br.ay, br.bx, br.by);
    grad2.addColorStop(0, rgba(pal.hues[br.hueA], 0.75));
    grad2.addColorStop(1, rgba(pal.hues[br.hueB], 0.75));
    ctx.strokeStyle = grad2;
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
      const grad2 = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, hr);
      grad2.addColorStop(0, rgba(hue, 0.3));
      grad2.addColorStop(1, rgba(hue, 0));
      ctx.fillStyle = grad2;
      ctx.beginPath(); ctx.arc(s.x, s.y, hr, 0, Math.PI * 2); ctx.fill();
    }
    // Exceptional: rare, so it stays meaningful. A wide radiant bloom.
    if (s.exceptional) {
      const br = r * 6;
      const bloom = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, br);
      bloom.addColorStop(0, rgba(hue, 0.35));
      bloom.addColorStop(0.4, rgba(hue, 0.12));
      bloom.addColorStop(1, rgba(hue, 0));
      ctx.fillStyle = bloom;
      ctx.beginPath(); ctx.arc(s.x, s.y, br, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = rgba(hue, 0.35);
      ctx.lineWidth = 0.6 / view.scale;
      ctx.beginPath(); ctx.arc(s.x, s.y, br * 0.65, 0, Math.PI * 2); ctx.stroke();
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
