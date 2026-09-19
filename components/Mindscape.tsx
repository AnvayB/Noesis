"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { MapConcept, MapPoint, MapRelation } from "@/lib/mindscape/engine";
import { buildGroundEcosystem } from "@/lib/mindscape/ground";
import { buildGrove } from "@/lib/mindscape/grove";
import { buildSky } from "@/lib/mindscape/sky";
import {
  DEFAULT_PALETTE,
  clampView,
  drawGenericGlow,
  drawGround,
  drawGrove,
  drawSky,
  fitView,
  groveWashPixels,
  hexToRgb,
  type Palette,
  type View,
} from "@/lib/mindscape/draw";

export type Climate = "ground" | "grove" | "sky";

export const CLIMATES: { id: Climate; label: string; blurb: string }[] = [
  { id: "ground", label: "Microcosm", blurb: "Domains as colonies, concepts as cells." },
  { id: "grove", label: "Grove", blurb: "Each field a tree; retention is foliage." },
  { id: "sky", label: "Nebula", blurb: "Concepts as stars; bridges as light." },
];

export interface MindscapeProps {
  concepts: MapConcept[];
  relations: MapRelation[];
  seed: string;
  climate?: Climate;
  /** Concepts this view is about: named, ringed in lamp, and, when `reveal`
   * is set, faded in over the sitter's shoulder. */
  highlightIds?: string[];
  /** Fade the highlighted concepts in on mount. */
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

// Grove's meadow wash is painted as a small G×G image and scaled up with smoothing.
function paintGroveWash(model: { grid: number; relief: Float32Array; groundY: number; height: number }, pal: Palette): HTMLCanvasElement {
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
  const groundModel = useMemo(() => (climate === "ground" ? buildGroundEcosystem(input) : null), [climate, input]);
  const groveModel = useMemo(() => (climate === "grove" ? buildGrove(input) : null), [climate, input]);
  const skyModel = useMemo(() => (climate === "sky" ? buildSky(input) : null), [climate, input]);
  const model = groundModel ?? groveModel ?? skyModel!;
  const points: MapPoint[] = model.points;

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
    const skipSet = reveal ? highlightSet : new Set<string>();

    if (groundModel) {
      drawGround(ctx, groundModel, pal, scaled, size.w, size.h, skipSet);
    } else if (groveModel) {
      const key = `${pal.night}|${groveModel.branches.length}|${seed}`;
      if (!groveWashRef.current || groveWashRef.current.key !== key) {
        groveWashRef.current = { key, img: paintGroveWash(groveModel, pal) };
      }
      drawGrove(ctx, groveModel, pal, scaled, size.w, size.h, skipSet, groveWashRef.current.img);
    } else if (skyModel) {
      drawSky(ctx, skyModel, pal, scaled, size.w, size.h, skipSet);
    }
  }, [groundModel, groveModel, skyModel, size, view, themeTick, reveal, highlightSet, labels, seed]);

  // Overlay: what is happening now, and a fade-in for what a reveal is about.
  useEffect(() => {
    const canvas = overRef.current, wrap = wrapRef.current;
    if (!canvas || !wrap || !size.w || !view) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size.w * dpr; canvas.height = size.h * dpr;
    const ctx = canvas.getContext("2d")!;
    const pal = readPalette(wrap);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reveal && revealStart.current === null) revealStart.current = performance.now() + 250;
    let raf = 0;
    const REVEAL_MS = 1100;

    const liveIds = new Set(
      groundModel
        ? groundModel.cells.filter((c) => c.live).map((c) => c.id)
        : groveModel
          ? groveModel.branches.filter((b) => b.live).map((b) => b.id)
          : skyModel!.stars.filter((s) => s.live).map((s) => s.id),
    );

    const frame = (t: number) => {
      const view = viewRef.current;
      if (!view) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size.w, size.h);
      ctx.setTransform(view.scale * dpr, 0, 0, view.scale * dpr, view.tx * dpr, view.ty * dpr);

      let revealDone = true;
      if (reveal && highlightSet.size > 0) {
        const f = reduced ? 1 : Math.min(1, Math.max(0, (t - (revealStart.current ?? t)) / REVEAL_MS));
        revealDone = f >= 1;
        ctx.save();
        ctx.globalAlpha = 1 - Math.pow(1 - f, 3);
        if (groundModel) drawGround(ctx, groundModel, pal, view, size.w, size.h, new Set());
        else if (groveModel) drawGrove(ctx, groveModel, pal, view, size.w, size.h, new Set());
        else if (skyModel) drawSky(ctx, skyModel, pal, view, size.w, size.h, new Set());
        ctx.restore();
      }

      const breathe = reduced ? 0.8 : 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t / 640));
      drawGenericGlow(ctx, points, liveIds, highlightSet, pal, view, breathe);
      if (!reduced && (liveIds.size > 0 || highlightSet.size > 0 || !revealDone)) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [groundModel, groveModel, skyModel, points, size, view, themeTick, reveal, highlightSet]);

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
  const emptyWord = climate === "grove" ? "No trees yet." : climate === "sky" ? "An empty sky, so far." : "Nothing growing yet.";

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
          className={`pointer-events-none absolute -translate-x-1/2 whitespace-nowrap font-serif text-[14px] italic ${climate === "sky" ? "text-[#e5e3ee]" : "text-ink"}`}
          style={{ left: hover.x, top: hover.y + 14 }}
        >
          {hover.name}
        </div>
      )}
      {empty && (
        <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-10">
          <p className={`question max-w-md text-center ${climate === "sky" ? "text-[#b7b6c4]" : "text-ink-soft"}`}>
            {emptyWord} Explain something you have learned and the first marks appear here.
          </p>
        </div>
      )}
    </div>
  );
}
