"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { buildMindscape, type MapConcept, type MapPoint, type MapRelation } from "@/lib/mindscape/engine";
import { buildGrove } from "@/lib/mindscape/grove";
import { buildSky } from "@/lib/mindscape/sky";
import {
  DEFAULT_PALETTE,
  clampView,
  drawBase,
  drawGenericGlow,
  drawGrove,
  drawLive,
  drawMarks,
  drawSky,
  drawThreads,
  fitView,
  groundPixels,
  groveWashPixels,
  hexToRgb,
  type Palette,
  type View,
} from "@/lib/mindscape/draw";

export type Climate = "ground" | "grove" | "sky";

export const CLIMATES: { id: Climate; label: string; blurb: string }[] = [
  { id: "ground", label: "Ground", blurb: "Threads that settle into contoured land." },
  { id: "grove", label: "Grove", blurb: "Each field a tree; retention is foliage." },
  { id: "sky", label: "Sky", blurb: "Concepts as stars; bridges as light." },
];

export interface MindscapeProps {
  concepts: MapConcept[];
  relations: MapRelation[];
  seed: string;
  climate?: Climate;
  /** Concepts this view is about: named, ringed in lamp, and, on Ground
   * when `reveal` is set, grown in front of you. */
  highlightIds?: string[];
  /** Animate the highlighted concepts' growth on mount. Ground only. */
  reveal?: boolean;
  /** Pan and zoom with the pointer. On by default on the full page. */
  interactive?: boolean;
  /** Draw the faint field names. */
  labels?: boolean;
  className?: string;
  /** Focus the initial view on these concepts instead of everything. */
  focusIds?: string[];
}

function readPalette(el: HTMLElement): Palette {
  const cs = getComputedStyle(el);
  const night = document.documentElement.classList.contains("dark");
  const base = night ? DEFAULT_PALETTE.night : DEFAULT_PALETTE.day;
  const v = (name: string) => cs.getPropertyValue(name).trim();
  return {
    ...base,
    paper: v("--paper") ? hexToRgb(v("--paper")) : base.paper,
    ink: v("--ink") ? hexToRgb(v("--ink")) : base.ink,
    inkSoft: v("--ink-soft") ? hexToRgb(v("--ink-soft")) : base.inkSoft,
    lamp: v("--lamp") || base.lamp,
  };
}

// Ground's heightfield, and Grove's meadow wash, are painted as small G×G
// images and scaled up with smoothing — the same pattern for both.
function paintGround(model: { grid: number; ground: Float32Array; tint: Float32Array; tintW: Float32Array; relief: Float32Array }, pal: Palette): HTMLCanvasElement {
  const G = model.grid;
  const off = document.createElement("canvas");
  off.width = G; off.height = G;
  const ctx = off.getContext("2d")!;
  const img = ctx.createImageData(G, G);
  img.data.set(groundPixels(model as Parameters<typeof groundPixels>[0], pal));
  ctx.putImageData(img, 0, 0);
  return off;
}
function paintGroveWash(model: { grid: number; relief: Float32Array }, pal: Palette): HTMLCanvasElement {
  const G = model.grid;
  const off = document.createElement("canvas");
  off.width = G; off.height = G;
  const ctx = off.getContext("2d")!;
  const img = ctx.createImageData(G, G);
  img.data.set(groveWashPixels(model as Parameters<typeof groveWashPixels>[0], pal));
  ctx.putImageData(img, 0, 0);
  return off;
}

export function Mindscape({
  concepts,
  relations,
  seed,
  climate = "ground",
  highlightIds = [],
  reveal = false,
  interactive = false,
  labels = true,
  className = "",
  focusIds,
}: MindscapeProps) {
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLCanvasElement>(null);
  const overRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hover, setHover] = useState<{ id: string; name: string; x: number; y: number } | null>(null);
  const viewRef = useRef<View | null>(null);
  const [view, setView] = useState<View | null>(null);
  const dragRef = useRef<{ x: number; y: number; tx: number; ty: number; moved: boolean } | null>(null);
  const [themeTick, setThemeTick] = useState(0);
  const revealStart = useRef<number | null>(null);

  const highlightKey = highlightIds.join("|");
  const highlightSet = useMemo(() => new Set(highlightKey ? highlightKey.split("|") : []), [highlightKey]);
  const focusKey = (focusIds ?? []).join("|");
  const focusSet = useMemo(() => new Set(focusKey ? focusKey.split("|") : []), [focusKey]);

  const input = useMemo(() => ({ concepts, relations, seed }), [concepts, relations, seed]);
  const groundModel = useMemo(() => (climate === "ground" ? buildMindscape(input) : null), [climate, input]);
  const groveModel = useMemo(() => (climate === "grove" ? buildGrove(input) : null), [climate, input]);
  const skyModel = useMemo(() => (climate === "sky" ? buildSky(input) : null), [climate, input]);
  const model = groundModel ?? groveModel ?? skyModel!;
  const points: MapPoint[] = model.points;

  const highlightIdx = useMemo(() => {
    if (!groundModel) return new Set<number>();
    const s = new Set<number>();
    groundModel.concepts.forEach((c, i) => { if (highlightSet.has(c.id)) s.add(i); });
    return s;
  }, [groundModel, highlightSet]);

  // Size to the container; redraw on resize.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setSize({ w: Math.round(r.width), h: Math.round(r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Theme changes flip the .dark class on <html>.
  useEffect(() => {
    const mo = new MutationObserver(() => setThemeTick((t) => t + 1));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);

  // Fit the view whenever the model or size changes; pan and zoom adjust
  // it from there. Computed during render, not in an effect.
  const fitted = useMemo(
    () =>
      size.w && size.h
        ? fitView(model, size.w, size.h, focusSet.size ? focusSet : highlightSet.size && reveal ? highlightSet : undefined)
        : null,
    [model, size, focusSet, highlightSet, reveal],
  );
  const [fitSource, setFitSource] = useState<View | null>(null);
  if (fitted !== fitSource) {
    setFitSource(fitted);
    setView(fitted);
  }
  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  // Base layer: everything still.
  const groundRef = useRef<{ key: string; img: HTMLCanvasElement } | null>(null);
  const groveWashRef = useRef<{ key: string; img: HTMLCanvasElement } | null>(null);
  useEffect(() => {
    const canvas = baseRef.current, wrap = wrapRef.current;
    if (!canvas || !view || !wrap || !size.w) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size.w * dpr; canvas.height = size.h * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);
    const pal = readPalette(wrap);
    const scaled = { scale: view.scale, tx: view.tx, ty: view.ty };

    if (groundModel) {
      const key = `${pal.night}|${groundModel.maxHeight}|${groundModel.concepts.length}|${seed}`;
      if (!groundRef.current || groundRef.current.key !== key) {
        groundRef.current = { key, img: paintGround(groundModel, pal) };
      }
      drawBase(ctx, groundModel, pal, scaled, size.w, size.h, reveal ? highlightIdx : new Set(), labels, groundRef.current.img);
    } else if (groveModel) {
      const key = `${pal.night}|${groveModel.branches.length}|${seed}`;
      if (!groveWashRef.current || groveWashRef.current.key !== key) {
        groveWashRef.current = { key, img: paintGroveWash(groveModel, pal) };
      }
      drawGrove(ctx, groveModel, pal, scaled, size.w, size.h, new Set(), groveWashRef.current.img);
    } else if (skyModel) {
      drawSky(ctx, skyModel, pal, scaled, size.w, size.h, new Set());
    }
  }, [groundModel, groveModel, skyModel, size, view, themeTick, reveal, highlightIdx, labels, seed]);

  // Overlay: what is happening now. Live tips breathe; the reveal grows (Ground only).
  useEffect(() => {
    const canvas = overRef.current, wrap = wrapRef.current;
    if (!canvas || !wrap || !size.w || !view) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size.w * dpr; canvas.height = size.h * dpr;
    const ctx = canvas.getContext("2d")!;
    const pal = readPalette(wrap);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reveal && groundModel && revealStart.current === null) revealStart.current = performance.now() + 350;
    let raf = 0;
    const REVEAL_MS = 1900;

    const liveIds = new Set(
      groundModel
        ? groundModel.concepts.filter((c) => c.live).map((c) => c.id)
        : groveModel
          ? groveModel.branches.filter((b) => b.live).map((b) => b.id)
          : skyModel!.stars.filter((s) => s.live).map((s) => s.id),
    );
    const liveIdx = groundModel ? groundModel.concepts.map((c, i) => (c.live ? i : -1)).filter((i) => i >= 0) : [];

    const frame = (t: number) => {
      const view = viewRef.current;
      if (!view) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size.w, size.h);
      ctx.setTransform(view.scale * dpr, 0, 0, view.scale * dpr, view.tx * dpr, view.ty * dpr);

      let revealDone = true;
      if (groundModel) {
        if (reveal && highlightIdx.size > 0) {
          const f = reduced ? 1 : Math.min(1, Math.max(0, (t - (revealStart.current ?? t)) / REVEAL_MS));
          revealDone = f >= 1;
          const eased = 1 - Math.pow(1 - f, 3);
          drawThreads(ctx, groundModel, pal, view, (s) => highlightIdx.has(s.c), () => eased);
          if (f > 0.75) drawMarks(ctx, groundModel, pal, (c) => highlightIdx.has(c), Math.min(1, (f - 0.75) / 0.25));
        }
        const breathe = reduced ? 0.8 : 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t / 640));
        drawLive(ctx, groundModel, pal, view, liveIdx, highlightIdx, breathe);
        if (!reduced && (liveIdx.length > 0 || highlightIdx.size > 0 || !revealDone)) raf = requestAnimationFrame(frame);
      } else {
        const breathe = reduced ? 0.8 : 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t / 640));
        drawGenericGlow(ctx, points, liveIds, highlightSet, pal, view, breathe);
        if (!reduced && (liveIds.size > 0 || highlightSet.size > 0)) raf = requestAnimationFrame(frame);
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [groundModel, groveModel, skyModel, points, size, view, themeTick, reveal, highlightIdx, highlightSet]);

  // Pointer: hover names a point; click opens it; drag pans; wheel zooms.
  function toWorld(e: { clientX: number; clientY: number }) {
    const el = wrapRef.current!, view = viewRef.current!;
    const r = el.getBoundingClientRect();
    const sx = e.clientX - r.left, sy = e.clientY - r.top;
    return { x: (sx - view.tx) / view.scale, y: (sy - view.ty) / view.scale, sx, sy };
  }
  function nearest(wx: number, wy: number) {
    const view = viewRef.current!;
    const reach = 16 / view.scale + 6;
    let best: MapPoint | null = null, bd = reach;
    for (const p of points) {
      const d = Math.hypot(p.x - wx, p.y - wy);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }
  function onMove(e: React.PointerEvent) {
    if (!viewRef.current) return;
    if (dragRef.current && interactive) {
      const d = dragRef.current;
      const dx = e.clientX - d.x, dy = e.clientY - d.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
      setView(clampView(model, { ...viewRef.current, tx: d.tx + dx, ty: d.ty + dy }, size.w, size.h));
      return;
    }
    const { x, y, sx, sy } = toWorld(e);
    const p = nearest(x, y);
    setHover(p ? { id: p.id, name: p.name, x: sx, y: sy } : null);
  }
  function onDown(e: React.PointerEvent) {
    if (!interactive || !viewRef.current) return;
    dragRef.current = { x: e.clientX, y: e.clientY, tx: viewRef.current.tx, ty: viewRef.current.ty, moved: false };
  }
  function onUp(e: React.PointerEvent) {
    const wasDrag = dragRef.current?.moved;
    dragRef.current = null;
    if (wasDrag || !viewRef.current) return;
    const { x, y } = toWorld(e);
    const p = nearest(x, y);
    if (p) router.push(`/concepts/${p.slug}`);
  }
  // Wheel zoom needs a non-passive listener to stop the page scrolling,
  // which React's synthetic wheel event cannot do.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || !interactive) return;
    const onWheel = (e: WheelEvent) => {
      const v = viewRef.current;
      if (!v) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const sx = e.clientX - r.left, sy = e.clientY - r.top;
      const k = Math.exp(-e.deltaY * 0.0015);
      const scale = Math.min(6, Math.max(0.12, v.scale * k));
      const ratio = scale / v.scale;
      setView(clampView(model, { scale, tx: sx - (sx - v.tx) * ratio, ty: sy - (sy - v.ty) * ratio }, size.w, size.h));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [interactive, model, size]);

  const empty = concepts.length === 0;
  const emptyWord = climate === "grove" ? "No trees yet." : climate === "sky" ? "An empty sky, so far." : "Fog, so far.";

  return (
    <div
      ref={wrapRef}
      className={`relative h-full w-full select-none overflow-hidden ${interactive ? "cursor-grab active:cursor-grabbing" : ""} ${className}`}
      onPointerMove={onMove}
      onPointerDown={onDown}
      onPointerUp={onUp}
      onPointerLeave={() => { setHover(null); dragRef.current = null; }}
      role="img"
      aria-label={empty ? "Your Mindscape, still empty" : "Your Mindscape"}
    >
      <canvas ref={baseRef} className="absolute inset-0 h-full w-full" style={{ width: size.w, height: size.h }} />
      <canvas ref={overRef} className="absolute inset-0 h-full w-full" style={{ width: size.w, height: size.h }} />
      {hover && !highlightSet.has(hover.id) && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 whitespace-nowrap font-serif text-[14px] italic text-ink"
          style={{ left: hover.x, top: hover.y + 14 }}
        >
          {hover.name}
        </div>
      )}
      {empty && (
        <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-10">
          <p className="question max-w-md text-center text-ink-soft">
            {emptyWord} Explain something you have learned and the first marks appear here.
          </p>
        </div>
      )}
    </div>
  );
}
