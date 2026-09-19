"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
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

// Ground -> Grove -> Sky is "outward and upward": the cellular scale gives
// way to the botanical, which gives way to the celestial. Moving forward
// through this order is a zoom out; moving backward is a descent back in.
// The transition below reads its direction from this list, not a hardcoded
// pair, so a fourth climate added at either end stays correct for free.
const CLIMATE_ORDER: Climate[] = ["ground", "grove", "sky"];
function directionBetween(from: Climate, to: Climate): 1 | -1 {
  return CLIMATE_ORDER.indexOf(to) > CLIMATE_ORDER.indexOf(from) ? 1 : -1;
}

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

/**
 * One climate's picture: model build, the two canvases, drawing, and all
 * pointer interaction — everything Mindscape did before it could switch
 * climates. Mounted once per climate normally, and twice (outgoing and
 * incoming) for the ~700ms of a climate switch's crossfade — see Mindscape
 * below, the only thing that knows a transition is happening.
 */
function MindscapeLayer({
  concepts,
  relations,
  seed,
  climate,
  highlightIds = [],
  reveal = false,
  interactive = false,
  labels = true,
  focusIds,
}: Omit<MindscapeProps, "className"> & { climate: Climate }) {
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
      className={`relative h-full w-full select-none overflow-hidden ${interactive ? "cursor-grab active:cursor-grabbing" : ""}`}
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

// 700ms matches the map's own motion budget (docs/design-language.md: "700ms
// for anything the map does"), but the app-wide --ease-quiet curve is tuned
// for the camera settling after a user's own drag/zoom, where getting most
// of the way there almost immediately reads as responsive. Measured against
// a real render, that same curve collapsed this transition's visible motion
// into its first ~150ms, leaving 500ms of an already-settled frame — wrong
// for a choreographed scene change the eye is meant to track throughout. A
// symmetric ease-in-out keeps the scale/rise/blur perceptible across the
// full duration instead. A forward move through CLIMATE_ORDER zooms out —
// the outgoing layer shrinks toward a point and sinks away while the
// incoming one settles in from having been too close, drifting up into
// place. A backward move mirrors every value, so it reads as zooming back
// in and descending. Reduced motion drops to a plain crossfade.
const EASE_TRANSITION = [0.65, 0, 0.35, 1] as const;
const MAP_DURATION = 0.7;

const transitionVariants = {
  enter: (direction: 1 | -1) => ({
    opacity: 0,
    scale: direction === 1 ? 1.12 : 0.88,
    y: direction === 1 ? -22 : 22,
    filter: "blur(0px)",
  }),
  center: {
    opacity: 1,
    scale: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: MAP_DURATION, ease: EASE_TRANSITION },
  },
  exit: (direction: 1 | -1) => ({
    opacity: 0,
    scale: direction === 1 ? 0.88 : 1.12,
    y: direction === 1 ? 22 : -22,
    filter: "blur(8px)",
    pointerEvents: "none" as const,
    transition: { duration: MAP_DURATION, ease: EASE_TRANSITION },
  }),
};

const reducedVariants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, pointerEvents: "none" as const, transition: { duration: 0.2 } },
};

/**
 * The map, animated between climates. Everything about a single climate —
 * data, canvases, pan/zoom/hover/click — lives in MindscapeLayer above and
 * is untouched by this; Mindscape's only job is to notice `climate`
 * changing and crossfade the old picture out while the new one settles in,
 * in the direction CLIMATE_ORDER says it should.
 */
export function Mindscape({ climate = "ground", className = "", ...layerProps }: MindscapeProps) {
  // Direction is a pure function of (previous climate, next climate), so it
  // can be derived during render the same way the layer above derives its
  // view from (previous fit, next fit) — compare against the last-seen
  // value in state and update if it changed, rather than mutating a ref.
  const [[prevClimate, direction], setClimateTrack] = useState<[Climate, 1 | -1]>([climate, 1]);
  if (prevClimate !== climate) {
    setClimateTrack([climate, directionBetween(prevClimate, climate)]);
  }

  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    // Reading the media query can only happen client-side, so a one-time
    // setState on mount is the correct pattern here, not an anti-pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const variants = reducedMotion ? reducedVariants : transitionVariants;

  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`}>
      <AnimatePresence mode="sync" initial={false} custom={direction}>
        <motion.div
          key={climate}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          className="absolute inset-0"
        >
          <MindscapeLayer climate={climate} {...layerProps} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
